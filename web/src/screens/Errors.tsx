"use client";

/**
 * Error states. Ported from site/Errors.jsx.
 *
 * One error surface, five states. Every variant answers the same three questions in the
 * same order: what happened, whether it is the visitor's fault, and what to do next.
 * The recovery routes differ per state because "go home" is useless advice to someone
 * whose connection dropped.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, Icon, ASSETS } from "@/ds";
import { go } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";
import { useT } from "@/i18n/context";

export type ErrorState = "notFound" | "failed" | "offline" | "maintenance" | "sessionExpired";

interface Action {
  label: string;
  variant: "onDark" | "outlineOnDark";
  route?: string;
  reload?: boolean;
  whatsapp?: boolean;
}

/** [title, body, route or null, icon] */
type Help = [string, string, string | null, string];

interface StateSpec {
  code: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: string;
  actions: Action[];
  help: Help[];
}

/**
 * A hook, not the exported module constant this was — see the note in About.tsx.
 *
 * Every string here is copy a reader meets at the worst moment of their visit, and a
 * constant evaluated at import can only ever hold English.
 */
export function useErrorStates(): Record<ErrorState, StateSpec> {
  const t = useT();

  return {
  notFound: {
    code: "404",
    eyebrow: t("Page not found"),
    title: t("That page does not exist"),
    body: t("The link may be out of date, or the address may have a typo. Nothing is wrong with your account or your application."),
    icon: "compass",
    actions: [
      { label: t("Back to home"), variant: "onDark", route: "home" },
      { label: t("Browse universities"), variant: "outlineOnDark", route: "universities" },
    ],
    help: [
      [t("Looking for a university?"), t("The directory lists every partner university with real tuition."), "universities", "landmark"],
      [t("Ready to apply?"), t("The application takes four short steps and no documents up front."), "apply", "file-text"],
      [t("Need a person?"), t("Message us and someone replies, usually the same day."), "contact", "message-circle"],
    ],
  },
  failed: {
    code: "500",
    eyebrow: t("Something went wrong"),
    title: t("This page did not load"),
    body: t("The fault is on our side, not yours. Nothing you submitted has been lost, and the rest of the site is working normally."),
    icon: "triangle-alert",
    actions: [
      { label: t("Try again"), variant: "onDark", reload: true },
      { label: t("Back to home"), variant: "outlineOnDark", route: "home" },
    ],
    help: [
      [t("Was this mid-application?"), t("Your progress is saved. Reopen the form and carry on where you stopped."), "apply", "rotate-ccw"],
      [t("Still stuck?"), t("Tell us what you were doing and we will fix it."), "contact", "life-buoy"],
    ],
  },
  offline: {
    code: "",
    eyebrow: t("No connection"),
    title: t("You are offline"),
    body: t("Your device has lost its internet connection. This page will recover on its own once the connection returns."),
    icon: "wifi-off",
    actions: [{ label: t("Try again"), variant: "onDark", reload: true }],
    help: [
      [t("Check your connection"), t("Turn airplane mode off, or switch between wifi and mobile data."), null, "signal"],
      [t("Nothing is lost"), t("Anything you had already sent us is safe on our side."), null, "shield-check"],
    ],
  },
  maintenance: {
    code: "",
    eyebrow: t("Scheduled maintenance"),
    title: t("We are back shortly"),
    body: t("We are updating the site. Applications already submitted are unaffected, and this usually takes under an hour."),
    icon: "wrench",
    actions: [
      { label: t("Try again"), variant: "onDark", reload: true },
      { label: t("Message us on WhatsApp"), variant: "outlineOnDark", whatsapp: true },
    ],
    help: [
      [t("Urgent deadline?"), t("Message us. We can accept your details by WhatsApp in the meantime."), null, "clock"],
    ],
  },
  sessionExpired: {
    code: "",
    eyebrow: t("Signed out"),
    title: t("Your session has expired"),
    body: t("For your security we sign partners out after a period of inactivity. Sign in again to pick up where you left off."),
    icon: "lock",
    actions: [
      { label: t("Sign in again"), variant: "onDark", route: "portal" },
      { label: t("Back to the website"), variant: "outlineOnDark", route: "home" },
    ],
    help: [
      [t("Forgotten your details?"), t("Your named contact can reset them for you."), "contact", "key-round"],
    ],
  },
  };
}

const openWhatsApp = () =>
  window.open(
    `https://wa.me/905550000000?text=${encodeURIComponent("Hello Campus Turkey, I have a question.")}`,
    "_blank",
    "noopener",
  );

/**
 * Full error surface. The green panel carries the brand and the ghosted status code;
 * the white card below carries recovery, because an error page that only apologises
 * leaves the visitor exactly where they were stuck.
 */
export function ErrorScreen({ state = "notFound", detail }: { state?: ErrorState; detail?: string | null }) {
  const t = useT();
  const states = useErrorStates();
  const s = states[state] ?? states.notFound;

  const act = (a: Action) => {
    if (a.reload) return window.location.reload();
    if (a.whatsapp) return void openWhatsApp();
    if (a.route) return go(a.route);
  };

  return (
    <div style={{ background: "var(--surface-subtle)", minHeight: 560 }}>
      <section style={{ position: "relative", overflow: "hidden", background: "var(--gradient-brand-deep)", paddingTop: 168, paddingBottom: "calc(var(--section-y) + 48px)", marginBottom: "calc(var(--overlap) * -1)" }}>
        {/* Decorative, and on an error page doubly so — see the note in shared.tsx. */}
        <img src={`${ASSETS}/map-of-turkey.jpg`} alt="" aria-hidden="true"
          decoding="async" fetchPriority="low"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .13, filter: "invert(1)" }} />
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--gradient-protect-bottom)" }} />
        <div className="ct-container" style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "var(--space-5)", alignItems: "flex-start" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "var(--radius-circle)", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.28)", color: "var(--white)" }}>
            <Icon name={s.icon} size={24} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span className="ct-eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>{s.eyebrow}</span>
            {s.code ? (
              <span style={{ padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid rgba(255,255,255,.3)", color: "rgba(255,255,255,.8)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-micro)", letterSpacing: ".08em" }}>
                {s.code}
              </span>
            ) : null}
          </span>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", margin: 0, maxWidth: "18ch" }}>
            {s.title}
          </h1>
          <p style={{ color: "rgba(255,255,255,.88)", fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", margin: 0, maxWidth: 560 }}>
            {s.body}
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
            {s.actions.map((a) => (
              <Button key={a.label} variant={a.variant} size="lg" onClick={() => act(a)}>{a.label}</Button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
        <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Where to go from here")}</h2>
          <CardGrid min={260} gap="var(--space-5)">
            {s.help.map(([title, body, route, icon]) => {
              const clickable = Boolean(route);
              return (
                <Card key={title} padding="var(--space-8)"
                  onClick={clickable ? () => go(route as string) : undefined}
                  style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", cursor: clickable ? "pointer" : "default" }}>
                  <Icon name={icon} size={20} color="var(--green-600)" />
                  <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{title}</h3>
                  <p style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)", margin: 0 }}>{body}</p>
                  {clickable ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "auto", paddingTop: "var(--space-3)", color: "var(--green-700)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)" }}>
                      {t("Go there")} <Icon name="arrow-right" size={15} />
                    </span>
                  ) : null}
                </Card>
              );
            })}
          </CardGrid>
          {detail ? (
            <details style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
              <summary style={{ cursor: "pointer" }}>{t("Technical detail")}</summary>
              <code style={{ display: "block", marginTop: "var(--space-3)", padding: "var(--space-4)", background: "var(--neutral-100)", borderRadius: "var(--radius-md)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{detail}</code>
            </details>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/**
 * Watches the connection and shows the offline surface the moment it drops, then clears
 * itself when the connection returns. Wrapping rather than routing keeps the visitor's
 * place: they land back on the page they were reading.
 */
export function OfflineGuard({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(() => navigator.onLine === false);

  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, []);

  if (offline) return <ErrorScreen state="offline" />;
  return <>{children}</>;
}
