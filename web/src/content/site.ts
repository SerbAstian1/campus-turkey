/**
 * Site chrome: the navigation, the footer columns and the social links.
 *
 * Routes here are prototype route names without the `#/` prefix, because that is what
 * `go()` takes and what the design system's components expect to be handed.
 */

export interface NavEntry {
  label: string;
  /** A destination. Mutually exclusive with `mega`. */
  route?: string;
  /** A mega-menu key. A group trigger has no destination of its own. */
  mega?: string;
}

export const nav: NavEntry[] = [
  { label: "Study in Türkiye", route: "study" },
  { label: "Universities", route: "universities" },
  { label: "Services", mega: "services" },
  { label: "Partners", mega: "partners" },
  { label: "About", route: "about" },
];

export interface FooterLink { label: string; route: string }
export interface FooterColumn { title: string; links: FooterLink[] }

export const footerColumns: FooterColumn[] = [
  {
    title: "Education",
    links: [
      { label: "Study in Türkiye", route: "study" },
      { label: "University directory", route: "universities" },
      { label: "Scholarships", route: "study" },
      { label: "Apply Now", route: "apply" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Medical Tourism", route: "service/medical" },
      { label: "Business Facilitation", route: "service/business" },
      { label: "Employment", route: "service/employment" },
      { label: "Tours & delegations", route: "service/tours" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Become a Partner", route: "partners" },
      { label: "Become a Representative", route: "representative" },
      { label: "Partner Login", route: "portal" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", route: "about" },
      { label: "Resources", route: "resources" },
      { label: "Contact", route: "contact" },
      { label: "For universities", route: "institutions/universities" },
    ],
  },
];

export const socials = [
  { icon: "instagram", label: "Instagram" },
  { icon: "facebook", label: "Facebook" },
  { icon: "linkedin", label: "LinkedIn" },
  { icon: "youtube", label: "YouTube" },
];
