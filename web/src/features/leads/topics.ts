/**
 * What the contact form's topic means, in one place.
 *
 * Three things need to agree about this list and used to be written out separately: the
 * dropdown on the contact form, the lead type each option routes to, and the link a
 * service page uses to arrive with its topic already chosen. When they disagreed the
 * failure was silent — an option nobody had mapped simply fell through to `CONTACT`, and
 * the desk that should have received it never knew it existed.
 */

import type { LeadType } from "./submit";

/** The dropdown, in the order it is offered. */
export const TOPICS = [
  "Study in Türkiye",
  "Medical treatment",
  "Business facilitation",
  "Employment",
  "Tours and delegations",
  "Partnership",
  "Country representative",
] as const;

export type Topic = (typeof TOPICS)[number];

/**
 * Which desk receives an enquiry about each topic.
 *
 * The routing matters most for "Medical treatment", and not cosmetically: medical
 * enquiries carry health information and the server gives that type a 90-day retention
 * window instead of two years (`RETENTION_DAYS` in leads.service.ts). Handoff note 13.
 *
 * Partnership and Country representative deliberately stay `CONTACT`. Those types
 * require an organisation name, which `approvePartnerApplication` creates the partner
 * record from, and this form does not ask for one. Routing them properly would post a
 * payload the server rejects, which presents as a contact form that is broken for two of
 * its seven options. Somebody who wants to *apply* is sent to the registration form;
 * somebody who wants to *ask* gets a reply, which is what this form is for.
 */
export const TOPIC_ROUTING: Record<string, LeadType> = {
  "Study in Türkiye": "STUDY",
  "Medical treatment": "MEDICAL",
  "Business facilitation": "BUSINESS",
  Employment: "EMPLOYMENT",
  "Tours and delegations": "TOURS",
};

export const leadTypeForTopic = (topic: string): LeadType => TOPIC_ROUTING[topic] ?? "CONTACT";

/**
 * The topic a service page arrives with.
 *
 * Keyed by the slug in `content/services.ts`. A visitor who has just read the medical
 * page and pressed "Book a Consultation" has already said what this is about; making
 * them pick it again from a dropdown is asking a question they answered by clicking.
 */
export const TOPIC_FOR_SERVICE: Record<string, Topic> = {
  medical: "Medical treatment",
  business: "Business facilitation",
  employment: "Employment",
  tours: "Tours and delegations",
};

/** The query parameter that carries it. Short, because it appears in shared links. */
export const TOPIC_PARAM = "about";

/**
 * Build the contact link for a service page.
 *
 * Returns a hash route because that is what the design system's `href` props take and
 * what `usePlaceholderLinks` upgrades into a client transition.
 */
export function contactLinkForService(slug: string): string {
  const topic = TOPIC_FOR_SERVICE[slug];
  return topic ? `#/contact?${TOPIC_PARAM}=${encodeURIComponent(topic)}` : "#/contact";
}

/**
 * Read the topic back out of a URL.
 *
 * Validated against the list rather than trusted: this value is set from the address bar
 * and lands in a `<select>`, so an unknown string would either select nothing or, worse,
 * be submitted as a topic the routing table has never seen.
 */
export function topicFromSearch(search: string): Topic | null {
  const value = new URLSearchParams(search).get(TOPIC_PARAM);
  if (!value) return null;
  return (TOPICS as readonly string[]).includes(value) ? (value as Topic) : null;
}
