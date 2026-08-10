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
  { label: "Study in Türkiye", route: "study-in-turkiye" },
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
      { label: "Study in Türkiye", route: "study-in-turkiye" },
      { label: "University directory", route: "universities" },
      // Was a second link to the study hub. Two footer links with different labels
      // going to one page is a footer that lies twice.
      { label: "Scholarships", route: "study-in-turkiye/scholarships" },
      { label: "How to apply", route: "study-in-turkiye/application-process" },
      { label: "Apply Now", route: "apply" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "All services", route: "services" },
      { label: "Medical Tourism", route: "services/medical" },
      { label: "Business Facilitation", route: "services/business" },
      { label: "Employment", route: "services/employment" },
      { label: "Tours & delegations", route: "services/tours" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Partnerships", route: "partnerships" },
      { label: "Become a Partner", route: "partnerships/agents" },
      { label: "Become a Representative", route: "partnerships/representatives" },
      { label: "For universities", route: "partnerships/universities" },
      { label: "Partner Login", route: "portal" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", route: "about" },
      { label: "Resources", route: "resources" },
      { label: "Contact", route: "contact" },
      { label: "For hospitals", route: "institutions/hospitals" },
    ],
  },
];

export const socials = [
  { icon: "instagram", label: "Instagram" },
  { icon: "facebook", label: "Facebook" },
  { icon: "linkedin", label: "LinkedIn" },
  { icon: "youtube", label: "YouTube" },
];
