"use client";

/**
 * The partnerships hub.
 *
 * `/partners` used to be one page describing three different commercial relationships:
 * an agency that refers students, a person who holds a country, and a university that
 * signs a recruitment agreement. They have different terms, different money and
 * different readers, and one page could only be vague about all three.
 *
 * This page does one job — tell a reader which of the three they are — and then gets out
 * of the way. Three cards, each stating the relationship in a line, what it pays, and
 * who it is not for. The "not for" line is the useful half: it is what stops a hospital
 * administrator reading four screens of agent commission before finding out.
 *
 * Composition: horizontal lines separate the three, rather than boxes around each. The
 * choice is not decorative — boxed cards read as options of equal weight, and these are
 * not. Most readers are the first one.
 */

import { Button, CTABanner, Card, Icon, ScrollReveal, SectionHeading, ASSETS } from "@/ds";
import { go } from "@/app/router";
import { PageBody, PageHero } from "./shared";
import { useT } from "@/i18n/context";

interface Track {
  route: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  /** What the reader gets. Short, and each one a fact rather than a promise. */
  terms: string[];
  /** Who should read a different page instead. */
  notFor: string;
  cta: string;
}

const TRACKS: Track[] = [
  {
    route: "partners",
    icon: "handshake",
    eyebrow: "For agencies and consultants",
    title: "Refer students, earn commission",
    body:
      "You already advise students in your country. We handle the university side: applications, offers, visa support and registration. You are paid on every confirmed enrolment.",
    terms: [
      "Commission paid within 30 days of the university confirming registration",
      "A portal showing every student you referred and what you are owed",
      "Materials in English, Arabic and French",
      "No joining fee and no minimum volume",
    ],
    notFor: "Not for individuals without a registered company. Start with a representative territory instead.",
    cta: "Become a partner",
  },
  {
    route: "representative",
    icon: "globe",
    eyebrow: "For country representatives",
    title: "Hold a territory exclusively",
    body:
      "One representative per country or region. Every enrolment from your territory is credited to you, whoever sent it, and the territory is written into the agreement.",
    terms: [
      "Exclusive territory, defined in writing",
      "Published rates per enrolment, plus an annual volume bonus",
      "Two onboarding sessions and quarterly updates",
      "Marketing budget contribution for local education fairs",
    ],
    notFor: "Not available where a representative is already appointed. The page lists open territories.",
    cta: "Apply for a territory",
  },
  {
    route: "partnerships/universities",
    icon: "landmark",
    eyebrow: "For universities",
    title: "Receive students who register",
    body:
      "A recruitment agreement with document pre-screening against your own admission rules, so the files you receive are ones that will not fail at registration.",
    terms: [
      "Applicants pre-screened on grades, documents and language level",
      "Reach through offices and representatives in 14 countries",
      "Monthly pipeline reporting your office can forecast from",
      "Agreement turnaround in about two weeks",
    ],
    notFor: "For hospitals, chambers of commerce and schools, see the institutions pages.",
    cta: "See the terms",
  },
];

export default function Partnerships() {
  const t = useT();
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        eyebrow={t("Partnerships")}
        title={t("Three ways to work with us")}
        lead={t("Agencies refer students. Representatives hold territories. Universities receive them. The terms differ, so each has its own page rather than one that is vague about all three.")}
        actions={
          <Button size="lg" icon="message-circle" onClick={() => go("contact")}>
            Talk to the partnerships team
          </Button>
        }
      />

      <PageBody>
        <ScrollReveal>
          <SectionHeading
            eyebrow={t("Which one are you")}
            title={t("Start from the relationship, not the form")}
            lead={t("Each card says what the arrangement pays and who it is not for. The second line saves more time than the first.")}
          />
        </ScrollReveal>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {TRACKS.map((track, index) => (
            <ScrollReveal key={track.route} delay={index * 80}>
              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-start" }}>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 48, height: 48, borderRadius: "var(--radius-sm)",
                      background: "var(--green-050)", flexShrink: 0,
                    }}
                  >
                    <Icon name={track.icon} size={23} color="var(--green-600)" />
                  </span>

                  <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <span className="ct-eyebrow">{track.eyebrow}</span>
                    <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{track.title}</h3>
                    <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0, maxWidth: "62ch" }}>
                      {track.body}
                    </p>
                  </div>

                  <Button size="lg" onClick={() => go(track.route)}>
                    {track.cta}
                  </Button>
                </div>

                <ul
                  style={{
                    margin: 0, padding: 0, listStyle: "none",
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "var(--space-3)",
                    borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-5)",
                  }}
                >
                  {track.terms.map((term) => (
                    <li key={term} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                      <Icon name="check" size={17} color="var(--green-600)" />
                      <span style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)" }}>
                        {term}
                      </span>
                    </li>
                  ))}
                </ul>

                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: "var(--fs-body-sm)",
                    fontStyle: "italic",
                  }}
                >
                  {track.notFor}
                </p>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <CTABanner
            eyebrow={t("Already working with us")}
            title={t("Sign in to the partner portal")}
            body="Your students, their stage, your commission and your payment status."
            primaryLabel="Partner Login"
            primaryHref="#/portal"
            secondaryLabel="Book a Consultation"
            secondaryHref="#/contact"
            assetBase={ASSETS}
          />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
