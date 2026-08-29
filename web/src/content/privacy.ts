/**
 * The privacy notice, as data.
 *
 * It lives here rather than inside the screen because it is rendered twice: once by the
 * design system for a browser that has run the bundle, and once as plain HTML for the
 * server response. Two copies of a legal notice is the one duplication that must not
 * exist. Someone would correct the retention window in one of them and not the other,
 * and the version a regulator reads is whichever they happened to open.
 *
 * **The content is an honest description of what the code does, not a lawyer's
 * document.** Every window and processor below was read off the implementation:
 * `RETENTION_DAYS` in `server/modules/leads/leads.service.ts`, the provider list in
 * `server/lib/config.ts`, and the deliberate absence of tracking in
 * `features/leads/submit.ts`. Three things a developer cannot decide are still open and
 * need the client's counsel: the controller's legal identity, the lawful basis as their
 * lawyer would state it, and the supervisory authority.
 */

export interface PrivacySection {
  heading: string;
  /** Prose, in order. */
  paragraphs?: string[];
  /** A bulleted list, rendered after the paragraphs. */
  list?: string[];
}

export interface PrivacyNotice {
  /** Display date. Update it whenever the text below changes. */
  lastUpdated: string;
  title: string;
  lead: string;
  sections: PrivacySection[];
}

export const privacyNotice: PrivacyNotice = {
  lastUpdated: "28 August 2026",
  title: "How we handle your information",
  lead: "What we collect when you contact us, why we keep it, how long we keep it for, and how to ask us to delete it.",
  sections: [
    {
      heading: "Who is responsible for your information",
      paragraphs: [
        "Campus Turkey is responsible for the information you give us through this website. Our head office is in Istanbul, Türkiye, and our contact details are on the contact page.",
        "If you want to reach us about anything on this page, use the contact form or write to the address listed there and mark your message for the attention of the data protection contact.",
      ],
    },
    {
      heading: "What we collect, and when",
      paragraphs: [
        "We only collect what you type into a form. We do not buy contact lists and we do not track you across other websites.",
      ],
      list: [
        "Your name, email address, phone number and country, when you send an enquiry or apply.",
        "What you want to study, your level of study, and the universities you are interested in.",
        "Documents you choose to upload as part of an application, which may include a passport, transcripts or certificates.",
        "Health information, but only if you contact our medical desk and choose to describe your treatment. We do not ask for it anywhere else.",
        "The campaign link or referring site that brought you here, read at the moment you submit a form and not stored between visits.",
      ],
    },
    {
      heading: "Why we are allowed to use it",
      paragraphs: [
        "For enquiries and applications, we rely on your consent, which you give by ticking the box on the form. You can withdraw it at any time and we will stop contacting you.",
        "For partner and representative accounts, we use your information to perform the agreement we have with you, and to meet the record keeping that agreement requires.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "Retention is enforced automatically. A scheduled job deletes expired records every day rather than waiting for someone to remember.",
      ],
      list: [
        "Medical enquiries are deleted 90 days after you send them, because they may contain health information.",
        "All other enquiries are deleted two years after you send them.",
        "If your enquiry becomes an application and you hold an account with us, we keep it as the origin record for that account until the account is closed.",
      ],
    },
    {
      heading: "Who else can see it",
      paragraphs: [
        "We do not sell your information and we do not share it for advertising. We do share it with universities and institutions when that is the point of your enquiry, and with the companies that run this website for us:",
      ],
      list: [
        "Our hosting and database providers, which store the site and its records.",
        "Our email provider, which sends confirmations and account messages.",
        "Our file storage provider, which holds documents you upload. Uploaded files are private, and every download uses a link that expires within minutes.",
        "Our error tracking and anti spam providers, which help keep the site working and keep automated abuse out of the forms.",
        "Our map provider, which serves the map tiles on the university directory.",
      ],
    },
    {
      heading: "Cookies",
      paragraphs: [
        "This site sets no advertising cookies and runs no analytics or tracking scripts. The only cookie we use keeps you signed in to the partner portal, and it is set when you sign in and cleared when you sign out.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: ["You can ask us to do any of the following, and we will answer within one month:"],
      list: [
        "Send you a copy of what we hold about you.",
        "Correct anything that is wrong.",
        "Delete what we hold, unless we are required to keep it.",
        "Stop contacting you, by withdrawing the consent you gave on the form.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Applicants are often 17 or 18 years old. If you are under 18, please have a parent or guardian complete the form with you.",
      ],
    },
  ],
};
