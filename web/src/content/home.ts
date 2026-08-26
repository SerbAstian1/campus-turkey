/**
 * Homepage content. The service cards here are teasers that link out; the full service
 * records live in `services.ts`. Education leads and is styled as primary — that
 * hierarchy is the point of the section, not decoration.
 */

import type { JourneyStep, ServiceCard, Stat, Testimonial } from "./types";

export const serviceCards: ServiceCard[] = [
  {
    icon: "graduation-cap",
    title: "Study in Türkiye",
    badge: "Our core service",
    emphasis: "primary",
    route: "study",
    description: "We help international students gain admission to public and private universities, then handle everything that follows.",
    points: [
      "Public universities are highly subsidised",
      "Private universities offer scholarships",
      "Visa, residence, housing and airport pickup",
    ],
    ctaLabel: "Start your application",
  },
  { icon: "heart-pulse", title: "Medical Tourism", route: "service/medical", description: "Consultations, hospital and doctor matching, treatment arrangements, invitation letters, visa, accommodation and translation.", ctaLabel: "See medical services" },
  { icon: "briefcase", title: "Business Facilitation", route: "service/business", description: "Invitation letters, company and factory visits, B2B meetings, trade fairs, delegations and translation.", ctaLabel: "See business services" },
  { icon: "hard-hat", title: "Employment Services", route: "service/employment", description: "Legal and seasonal employment support for workers coming to Türkiye.", ctaLabel: "See employment services" },
  { icon: "bus-front", title: "Educational & Business Tours", route: "service/tours", description: "University visits, study tours, professional visits, trade missions and group delegations.", ctaLabel: "See tours" },
  { icon: "handshake", title: "Partnerships & Representatives", route: "partners", description: "Agencies, consultants, universities and country representatives. Registration takes one short form.", ctaLabel: "Become a partner" },
];

export const stats: Stat[] = [
  { value: "200+", label: "Partner universities", description: "Public and private, across 40 cities." },
  { value: "6", label: "Languages supported", description: "English, Arabic, French, Turkish, Russian and Swahili." },
  { value: "48h", label: "Typical reply time", description: "On WhatsApp, every working day." },
  { value: "12", label: "Years in Türkiye", description: "Working with universities and hospitals." },
];

/** The student journey, start to settled. Rendered as a numbered strip. */
export const journey: JourneyStep[] = [
  { meta: "Step 1", title: "Tell us your plan", description: "Send your details and the program you want. One short form, no documents needed yet.", icon: "message-square" },
  { meta: "Step 2", title: "We match universities", description: "You get a shortlist with real tuition, real deadlines and the scholarships you qualify for.", icon: "list-checks" },
  { meta: "Step 3", title: "We submit your application", description: "We prepare and file everything with the universities you choose.", icon: "file-check" },
  { meta: "Step 4", title: "Visa and travel", description: "Acceptance letter, visa appointment, housing and airport pickup are all arranged for you.", icon: "plane-landing" },
  { meta: "Step 5", title: "Settle in", description: "Residence permit, bank account, phone line and your first week on campus.", icon: "home" },
];

/**
 * Text only, at the client's request — no video and no imagery of any kind.
 *
 * The comment that stood here claimed the quotes already ran as text. They did not:
 * every entry carried `video: true`, and the design system's `TestimonialCard` renders
 * a 16:9 poster block with a play affordance whenever that flag is set. The claim was
 * about the *portraits*, which were genuinely absent, and it read as though it covered
 * the whole card.
 *
 * Nothing here may carry an image. `Testimonial` in `./types.ts` no longer has a field
 * that can produce one, so this is enforced by the type rather than by this note — the
 * previous arrangement is exactly what let the two drift apart.
 *
 * The portrait rule is unchanged and still applies if that decision is ever revisited:
 * per the project README a face needs a signed release from the person named.
 */
export const testimonials: Testimonial[] = [
  { quote: "Campus Turkey handled my admission, my visa and my first week in Istanbul.", name: "Amina Yusuf", role: "Dentistry, 1st year", country: "Nigeria" },
  { quote: "I compared six universities in one afternoon and knew exactly what each one would cost.", name: "Karim Haddad", role: "Computer Engineering", country: "Morocco" },
  { quote: "We sent a delegation of nine people. Every meeting and every transfer was arranged.", name: "Grace Mwangi", role: "Trade delegation lead", country: "Kenya" },
];
