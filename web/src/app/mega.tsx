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

const PANEL_STYLE = {
  maxWidth: "calc(100vw - 48px)",
  boxSizing: "border-box" as const,
  paddingTop: "var(--space-6)",
  paddingBottom: "var(--space-6)",
};

export const MEGA: Record<string, ReactNode> = {
  services: (
    <MegaMenuPanel
      style={PANEL_STYLE}
      groups={[
        {
          title: "Education",
          links: [
            { label: "Study in Türkiye", description: "Admissions and scholarships", icon: "graduation-cap", href: "#/study" },
            { label: "University directory", description: "Public and private", icon: "landmark", href: "#/universities" },
            { label: "Educational tours", description: "Campus and study visits", icon: "bus-front", href: "#/service/tours" },
            { label: "Scholarships", description: "What you can get", icon: "award", href: "#/study" },
          ],
        },
        {
          title: "Other services",
          links: [
            { label: "Medical Tourism", description: "Hospitals and travel", icon: "heart-pulse", href: "#/service/medical" },
            { label: "Business Facilitation", description: "Invitations and B2B", icon: "briefcase", href: "#/service/business" },
            { label: "Employment", description: "Legal and seasonal work", icon: "hard-hat", href: "#/service/employment" },
            { label: "Partnerships", description: "Agencies and reps", icon: "handshake", href: "#/partners" },
          ],
        },
      ]}
      feature={null}
      columns={[
        {
          title: "Resources",
          links: [
            { label: "Scholarship guide", href: "#/blog/turkiye-burslari-who-gets-it" },
            { label: "Visa checklist", href: "#/blog/student-visa-documents" },
            { label: "Cost of living", href: "#/blog/public-university-costs-2026" },
            { label: "All resources", href: "#/resources" },
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
            { label: "Become a Partner", description: "Agencies and consultants", icon: "handshake", href: "#/partners" },
            { label: "Become a Representative", description: "Country representatives", icon: "globe", href: "#/representative" },
            { label: "Partner Login", description: "Existing partners sign in", icon: "log-in", href: "#/portal" },
          ],
        },
      ]}
      columns={[
        {
          title: "For institutions",
          links: [
            { label: "Universities", href: "#/institutions/universities" },
            { label: "Hospitals", href: "#/institutions/hospitals" },
            { label: "Chambers of commerce", href: "#/institutions/chambers" },
          ],
        },
      ]}
    />
  ),
};
