/**
 * Transactional mail.
 *
 * Two providers behind one function, chosen by `MAIL_PROVIDER`. Both are called over
 * their HTTP APIs with `fetch` rather than through an SDK: the surface used here is one
 * POST with a JSON body, and an SDK for that is a dependency, a version to track and a
 * bundle cost in exchange for nothing.
 *
 * **Every message this system sends is transactional** — a code, a welcome, a payout
 * notice. There is no marketing send and no list. That is why there is no unsubscribe
 * link: adding one to a verification code teaches people to unsubscribe from their own
 * sign-in.
 *
 * Failure is reported, never thrown past the caller's decision. Whether a failed send
 * should fail the request depends entirely on the message: a verification code that did
 * not send must fail loudly, because the user is now waiting for something that will
 * never arrive. A welcome email that did not send must not roll back the account it was
 * welcoming. So `sendMail` returns a result and each caller decides — see the call sites.
 */

import { env, isProduction } from "./config";
import { logger } from "./logger";

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain text. Deliberately not HTML — see the note on `welcomeEmail`. */
  text: string;
}

export type MailResult =
  | { ok: true; delivered: boolean }
  | { ok: false; error: string };

/**
 * Send one message.
 *
 * `delivered: false` with `ok: true` is the disabled-provider case: nothing was sent and
 * nothing went wrong. That distinction matters to the caller — it is the difference
 * between "the code is in their inbox" and "there is no inbox, show it on screen"
 * (see `server/modules/onboarding/`), and collapsing both into a boolean is how a
 * development affordance ends up live.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (env.MAIL_PROVIDER === "disabled") {
    // Logged at info so a developer can see what *would* have been sent. The body is
    // included deliberately: this branch cannot run in production, because config.ts
    // refuses to boot with MAIL_PROVIDER=disabled there.
    logger.info(
      { to: message.to, subject: message.subject, body: message.text },
      "mail provider disabled — message not sent",
    );
    return { ok: true, delivered: false };
  }

  const from = env.MAIL_FROM;
  if (!from) {
    // Unreachable via config.ts's cross-check, which refuses a provider without a from
    // address. Kept because "unreachable" and "cannot happen" are different claims.
    return { ok: false, error: "MAIL_FROM is not configured" };
  }

  try {
    const response =
      env.MAIL_PROVIDER === "resend"
        ? await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              authorization: `Bearer ${env.MAIL_API_KEY}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: [message.to],
              subject: message.subject,
              text: message.text,
            }),
          })
        : await fetch("https://api.postmarkapp.com/email", {
            method: "POST",
            headers: {
              "x-postmark-server-token": env.MAIL_API_KEY ?? "",
              "content-type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({
              From: from,
              To: message.to,
              Subject: message.subject,
              TextBody: message.text,
              MessageStream: "outbound",
            }),
          });

    if (!response.ok) {
      // The provider's body often names the reason (unverified sender, suppressed
      // recipient). Truncated because an error body is not a place to discover a
      // megabyte, and never includes the message text, which may hold a code.
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      logger.error(
        { provider: env.MAIL_PROVIDER, status: response.status, detail, to: message.to },
        "mail send failed",
      );
      return { ok: false, error: `mail provider returned ${response.status}` };
    }

    logger.info({ provider: env.MAIL_PROVIDER, to: message.to, subject: message.subject }, "mail sent");
    return { ok: true, delivered: true };
  } catch (error) {
    logger.error({ err: error, to: message.to }, "mail send threw");
    return { ok: false, error: "mail provider unreachable" };
  }
}

/** True when a message can actually reach somebody. Drives the development affordance
 *  that surfaces a code on screen; see `onboarding.service.ts`. */
export function mailIsConfigured(): boolean {
  return env.MAIL_PROVIDER !== "disabled";
}

/**
 * Plain text, not HTML, for every template below.
 *
 * A code and a two-line instruction do not need a layout, and HTML mail brings a real
 * cost: templates to maintain, a rendering matrix to test, images that make an inbox
 * treat the message as marketing, and a much better hiding place for a phishing lookalike
 * of this same email. When the copy is rewritten and design wants HTML, that is a
 * deliberate change with a test behind it, not a default that arrived unexamined.
 */

/**
 * The welcome email.
 *
 * **Placeholder copy — the client is writing the real thing.** What must survive a
 * rewrite is the structure, because the flow depends on it: the recipient needs the
 * link, and needs to understand that they set their own password rather than being sent
 * one. Never put a password in this email.
 */
export function welcomeEmail(options: {
  to: string;
  person: string;
  org: string;
  setPasswordUrl: string;
}): MailMessage {
  return {
    to: options.to,
    subject: "Your Campus Turkey partner account is ready",
    text: [
      `Hello ${options.person},`,
      "",
      `Your partner account for ${options.org} has been approved.`,
      "",
      "Set your password to finish setting up:",
      options.setPasswordUrl,
      "",
      "You will be asked for a short code, which we email you at that point.",
      "",
      "If you were not expecting this, you can ignore it — the link does nothing",
      "until it is used, and it expires.",
      "",
      "— Campus Turkey",
      "",
      "[PLACEHOLDER COPY — to be replaced by the client]",
    ].join("\n"),
  };
}

/**
 * A new enquiry, announced to the desk that answers them.
 *
 * Goes to `LEADS_NOTIFY_TO` — one fixed internal address — which is what makes it safe to
 * include what the visitor wrote. The acknowledgement below is the opposite case and is
 * built on the opposite rule.
 *
 * Everything here is already in the database; this exists so somebody knows to look. The
 * body carries enough to triage without opening the console — who, which desk, and the
 * first of what they said — and the console is where the rest lives.
 */
export function leadNotificationEmail(options: {
  to: string;
  kind: string;
  name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  message: string | null;
}): MailMessage {
  const who = options.name ?? options.email;

  return {
    to: options.to,
    subject: `New ${options.kind.toLowerCase()} enquiry — ${who}`,
    text: [
      `${who} sent a ${options.kind.toLowerCase()} enquiry.`,
      "",
      `Email    ${options.email}`,
      `Phone    ${options.phone ?? "not given"}`,
      `Country  ${options.country ?? "not given"}`,
      "",
      ...(options.message
        ? [
            "What they wrote:",
            "",
            // Bounded: an enquiry form is a text area, and the whole of one does not
            // belong in a notification whose job is to say "go and look".
            options.message.length > 1200
              ? `${options.message.slice(0, 1200)}…\n\n[truncated — the full message is in the portal]`
              : options.message,
            "",
          ]
        : []),
      "Open the staff console to reply and to record the outcome.",
      "",
      "— Campus Turkey",
    ].join("\n"),
  };
}

/**
 * The acknowledgement to the person who wrote in.
 *
 * **Nothing they typed comes back to them, and that is a security property rather than a
 * copy decision.** This endpoint is public, unauthenticated, and sends to whatever address
 * was in the form — so an email that echoed the visitor's own text would let anyone use
 * this desk to deliver their words to a stranger's inbox, over our verified domain. The
 * rate limit and the captcha make that expensive; a fixed body makes it pointless.
 *
 * The site promises a reply on every form. This is what keeps the promise visible while a
 * human gets to it.
 */
export function leadAcknowledgementEmail(options: { to: string; name: string | null }): MailMessage {
  return {
    to: options.to,
    subject: "We have your enquiry — Campus Turkey",
    text: [
      options.name ? `Hello ${options.name},` : "Hello,",
      "",
      "Thank you for writing to Campus Turkey. Your enquiry has reached the right desk",
      "and a named member of our team will reply to you directly.",
      "",
      "If your enquiry is urgent, you can reach us on WhatsApp — the number is on our",
      "contact page.",
      "",
      "You do not need to send this again; a second message will not reach us faster.",
      "",
      "— Campus Turkey",
    ].join("\n"),
  };
}

/**
 * The verification code.
 *
 * Subject line carries the code because most people read it from the notification
 * without opening the message, and the alternative is a subject that says nothing.
 * The trade is that the code is visible on a lock screen — acceptable for a code that
 * expires in minutes and is useless without the password set in the same session.
 */
export function verificationCodeEmail(options: {
  to: string;
  code: string;
  minutesValid: number;
}): MailMessage {
  return {
    to: options.to,
    subject: `${options.code} is your Campus Turkey code`,
    text: [
      `Your code is ${options.code}.`,
      "",
      `It expires in ${options.minutesValid} minutes and can be used once.`,
      "",
      "Campus Turkey will never ask you for this code by phone, WhatsApp or email.",
      "If you did not ask for it, someone has your email address and not your account —",
      "you do not need to do anything.",
      "",
      "— Campus Turkey",
    ].join("\n"),
  };
}

/** Guard used by the development affordance. Exported so its behaviour can be asserted
 *  rather than trusted — a switch that turns off a security control deserves a test. */
export function codesMayBeShownOnScreen(): boolean {
  return !isProduction && !mailIsConfigured();
}
