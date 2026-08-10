"use client";

/**
 * /study-in-turkiye/scholarships
 *
 * The scholarships section of the hub, given its own page.
 *
 * The reason is not tidiness. "Scholarship" is the single most searched thing a
 * prospective student asks about, and the navbar and footer both carried a link labelled
 * "Scholarships" that went to the hub — where the section sat two screens down, below
 * six reasons to choose Türkiye. Someone arriving on that word was made to scroll past
 * the answer's preamble to reach it.
 *
 * Nothing here is a new claim. Every figure comes from `content/study.ts`, which the hub
 * renders from too; what this page adds is the comparison the cards could not make side
 * by side, and the sentence about what none of them cover.
 *
 * Composition: the table is the thesis, above the fold, because the question is
 * comparative — a reader wants to know which one applies to them, not to read four
 * descriptions in sequence. The cards below carry the detail for the one they picked.
 */

import { Accordion, Badge, BrandDivider, Button, CTABanner, Card, Icon, ScrollReveal, SectionHeading, ASSETS } from "@/ds";
import { generalFaq, scholarships } from "@/content";
import { go } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";
import { FaqLayout, PageBody, PageHero } from "../shared";

/** The money questions from the shared FAQ. The visa and arrival ones belong elsewhere. */
const MONEY_FAQ = generalFaq.filter((item) =>
  /scholarship|cost|pay|money|fee/i.test(item.question),
);

export default function Scholarships() {
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        eyebrow="Study in Türkiye"
        title="Scholarships, and what you actually qualify for"
        lead="Four routes to a lower fee. One is a full ride and highly competitive; the other three are realistic for most good students. We tell you which before you spend anything."
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>
              Check my eligibility
            </Button>
            <Button variant="outlineOnDark" size="lg" icon="graduation-cap" onClick={() => go("study-in-turkiye")}>
              Back to Study in Türkiye
            </Button>
          </>
        }
      />

      <PageBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Side by side"
              title="Which one applies to you"
              lead="The odds column is the one to read first. It is written plainly rather than encouragingly."
            />
          </ScrollReveal>

          <ScrollReveal delay={60}>
            {/* Scrolls inside its own container. A table this wide on a phone would
                otherwise take the whole page sideways with it. */}
            <div style={{ overflowX: "auto" }}>
              <Card padding="0" style={{ overflow: "hidden", minWidth: 640 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.6fr 1fr 1fr" }}>
                  {["Scholarship", "Covers", "When to apply", "Your odds"].map((column) => (
                    <span
                      key={column}
                      className="ct-eyebrow"
                      style={{
                        padding: "var(--space-5) var(--space-6)",
                        background: "var(--green-050)",
                        color: "var(--green-700)",
                      }}
                    >
                      {column}
                    </span>
                  ))}

                  {scholarships.map((scholarship) =>
                    [scholarship.name, scholarship.covers, scholarship.when, scholarship.competitive].map(
                      (cell, column) => (
                        <span
                          key={`${scholarship.name}-${column}`}
                          style={{
                            padding: "var(--space-5) var(--space-6)",
                            borderTop: "1px solid var(--border-subtle)",
                            fontFamily: "var(--font-ui)",
                            fontSize: "var(--fs-body-sm)",
                            lineHeight: "var(--lh-body)",
                            fontWeight: column === 0 ? "var(--fw-medium)" : "var(--fw-regular)",
                            color: column === 0 ? "var(--green-800)" : "var(--text-body)",
                          }}
                        >
                          {cell}
                        </span>
                      ),
                    ),
                  )}
                </div>
              </Card>
            </div>
          </ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow="In detail" title="What each one is" />
          </ScrollReveal>

          <CardGrid min={280} gap="var(--space-6)">
            {scholarships.map((scholarship, index) => (
              <ScrollReveal key={scholarship.name} delay={index * 60} style={{ display: "flex" }}>
                <Card
                  padding="var(--space-8)"
                  surface={index === 0 ? "tinted" : "plain"}
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", alignItems: "flex-start" }}>
                    <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{scholarship.name}</h2>
                    {index === 0 ? <Badge tone="brand" icon="award">Full ride</Badge> : null}
                  </div>
                  <p style={{ color: "var(--text-body)", margin: 0 }}>{scholarship.who}</p>
                  <BrandDivider />
                  {(
                    [
                      ["Covers", scholarship.covers],
                      ["Timing", scholarship.when],
                      ["Your odds", scholarship.competitive],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span className="ct-eyebrow">{label}</span>
                      <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{value}</span>
                    </div>
                  ))}
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>
        </div>

        <ScrollReveal>
          <Card
            padding="var(--space-8)"
            style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}
          >
            <Icon name="info" size={20} color="var(--green-600)" />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <h2 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>What none of them cover</h2>
              <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0, maxWidth: "62ch" }}>
                A scholarship reduces tuition. It does not remove the cost of living, which runs
                about $350 to $550 a month in most cities, and only Türkiye Bursları includes
                accommodation and flights. Budget for both before you accept an offer.
              </p>
              <span>
                <Button variant="secondary" icon="arrow-right" onClick={() => go("study-in-turkiye/student-life")}>
                  What a month costs
                </Button>
              </span>
            </div>
          </Card>
        </ScrollReveal>

        {MONEY_FAQ.length > 0 ? (
          <FaqLayout
            heading={
              <ScrollReveal>
                <SectionHeading eyebrow="Questions" title="Money questions" lead="Anything else, message us on WhatsApp." />
              </ScrollReveal>
            }
          >
            <ScrollReveal delay={80}>
              <Accordion items={MONEY_FAQ} />
            </ScrollReveal>
          </FaqLayout>
        ) : null}

        <ScrollReveal>
          <CTABanner
            eyebrow="Next step"
            title="Find out what you qualify for"
            body="One short form. We reply with a shortlist, real tuition and the scholarships that apply to your grades and your country."
            primaryLabel="Apply Now"
            primaryHref="#/apply"
            secondaryLabel="Book a Consultation"
            secondaryHref="#/contact"
            assetBase={ASSETS}
          />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
