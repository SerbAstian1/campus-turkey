"use client";

/**
 * The two desktop mega menus. Transcribed from `Campus Turkey Website.html`.
 *
 * The inline style is load-bearing: the design system measures a ghost panel at
 * max-content and applies that width to the real one, so capping the width here is what
 * stops a wide panel hanging off the side of the viewport. See the
 * `div[style*="transition: width"]` rule in styles/base.css for the other half.
 */

import type { ReactNode } from "react";
import { MegaMenuPanel } from "@/ds";
import { useHref } from "./router";

const PANEL_STYLE = {
  maxWidth: "calc(100vw - 48px)",
  boxSizing: "border-box" as const,
  paddingTop: "var(--space-6)",
  paddingBottom: "var(--space-6)",
};

/**
 * A hook rather than the module-scope constant this used to be.
 *
 * These twenty links are the site's primary navigation, and as a constant they could
 * only hold `href: "#/study-in-turkiye"` — a literal, because a constant evaluated at
 * import has no way to reach the reader's locale. That shipped two faults at once. The
 * attribute in the HTML was a fragment, so a crawler following the navigation found
 * twenty links to the page it was already on and no route into the site at all; and a
 * reader on `/fr/...` was sent to the English path and bounced back by the middleware,
 * paying a redirect on every menu click.
 *
 * `useHref` needs the locale from context, context needs a component, so the constant
 * had to become one. The JSX is otherwise untouched.
 */
export function useMega(): Record<string, ReactNode> {
  const href = useHref();

  return {
  services: (
    <MegaMenuPanel
      style={PANEL_STYLE}
      groups={[
        {
          title: "Education",
          links: [
            { label: "Study in Türkiye", description: "Admissions and scholarships", icon: "graduation-cap", href: href("study-in-turkiye") },
            { label: "University directory", description: "Public and private", icon: "landmark", href: href("universities") },
            { label: "Educational tours", description: "Campus and study visits", icon: "bus-front", href: href("services/tours") },
            /* Scholarships pointed at the study hub, which meant two menu items in the
               same column went to the same page — one of them lying about where. It now
               has its own page. */
            { label: "Scholarships", description: "What you can get", icon: "award", href: href("study-in-turkiye/scholarships") },
          ],
        },
        {
          title: "Other services",
          links: [
            { label: "All services", description: "The four, side by side", icon: "layout-grid", href: href("services") },
            { label: "Medical Tourism", description: "Hospitals and travel", icon: "heart-pulse", href: href("services/medical") },
            { label: "Business Facilitation", description: "Invitations and B2B", icon: "briefcase", href: href("services/business") },
            { label: "Employment", description: "Legal and seasonal work", icon: "hard-hat", href: href("services/employment") },
          ],
        },
      ]}
      feature={null}
      columns={[
        {
          title: "Resources",
          links: [
            { label: "Scholarship guide", href: href("blog/turkiye-burslari-who-gets-it") },
            { label: "Visa checklist", href: href("blog/student-visa-documents") },
            { label: "Cost of living", href: href("blog/public-university-costs-2026") },
            { label: "All resources", href: href("resources") },
          ],
        },
      ]}
    />
  ),

  partners: (
    <MegaMenuPanel
      style={PANEL_STYLE}
      groups={[
        {
          title: "Work with us",
          links: [
            { label: "All partnerships", description: "Which one you are", icon: "handshake", href: href("partnerships") },
            { label: "Become a Partner", description: "Agencies and consultants", icon: "briefcase", href: href("partnerships/agents") },
            { label: "Become a Representative", description: "Country representatives", icon: "globe", href: href("partnerships/representatives") },
            { label: "Login", description: "Students, partners, representatives and staff", icon: "log-in", href: href("portal") },
          ],
        },
      ]}
      columns={[
        {
          title: "For institutions",
          links: [
            { label: "Universities", href: href("partnerships/universities") },
            { label: "Hospitals", href: href("institutions/hospitals") },
            { label: "Agencies", href: href("institutions/agencies") },
            { label: "Chambers of commerce", href: href("institutions/chambers") },
          ],
        },
      ]}
    />
  ),
  };
}
