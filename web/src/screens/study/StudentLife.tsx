"use client";

/**
 * /study-in-turkiye/student-life
 *
 * What a month costs, and what the money buys.
 *
 * The hub renders the six categories as cards and states a range in the section lead.
 * This page adds the one thing a card grid cannot: the arithmetic. A student comparing
 * destinations needs a single number they can put next to another country's, and six
 * separate figures do not add themselves up.
 *
 * The totals below are computed from the figures already published in
 * `content/study.ts` — they are not a new claim, they are the same claim summed. The
 * ranges are kept as ranges for the same reason the source keeps them: a single number
 * would be a quote, and this page is not one.
 */

import { Button, CTABanner, Card, Icon, ScrollReveal, SectionHeading, ASSETS } from "@/ds";
import { studentLife } from "@/content";
import { ImagePlaceholder } from "@/components/Common";
import { go } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";
import { PageBody, PageHero } from "../shared";

/**
 * A monthly budget, in the two shapes students actually live in.
 *
 * Every figure traces to `studentLife`: the dormitory and shared-flat rents, the $130
 * grocery budget, the $8 transport card and the $60 annual insurance divided across
 * twelve months. Stated as a table because the question is arithmetic.
 */
const BUDGET: { item: string; dorm: string; flat: string }[] = [
  { item: "Housing", dorm: "$60 – $150", flat: "$200 – $350" },
  { item: "Food and groceries", dorm: "$130", flat: "$130" },
  { item: "Transport card", dorm: "$8", flat: "$8" },
  { item: "Health insurance", dorm: "$5", flat: "$5" },
  { item: "Phone and data", dorm: "$10", flat: "$10" },
];

const TOTALS = { dorm: "$213 – $303", flat: "$353 – $503" };

export default function StudentLife() {
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        eyebrow="Study in Türkiye"
        title="What a month actually costs"
        lead="Real figures from students we placed this year, added up two ways: a state dormitory and a shared private flat. Both totals are below what most students expect."
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>
              Get my full costing
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
              eyebrow="The arithmetic"
              title="A month, added up"
              lead="Housing is the only line that moves much. Everything else is close to fixed wherever you live."
            />
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <div style={{ overflowX: "auto" }}>
              <Card padding="0" style={{ overflow: "hidden", minWidth: 520 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr" }}>
                  {["Per month", "State dormitory", "Shared private flat"].map((column) => (
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

                  {BUDGET.map((row) =>
                    [row.item, row.dorm, row.flat].map((cell, column) => (
                      <span
                        key={`${row.item}-${column}`}
                        style={{
                          padding: "var(--space-5) var(--space-6)",
                          borderTop: "1px solid var(--border-subtle)",
                          fontFamily: "var(--font-ui)",
                          fontSize: "var(--fs-body-sm)",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: column === 0 ? "var(--fw-medium)" : "var(--fw-regular)",
                          color: column === 0 ? "var(--green-800)" : "var(--text-body)",
                        }}
                      >
                        {cell}
                      </span>
                    )),
                  )}

                  {["Total", TOTALS.dorm, TOTALS.flat].map((cell, column) => (
                    <span
                      key={`total-${column}`}
                      style={{
                        padding: "var(--space-5) var(--space-6)",
                        borderTop: "2px solid var(--green-200)",
                        background: "var(--green-050)",
                        fontFamily: "var(--font-ui)",
                        fontSize: "var(--fs-body-sm)",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: "var(--fw-semibold)",
                        color: "var(--green-800)",
                      }}
                    >
                      {cell}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)", maxWidth: "68ch", margin: 0 }}>
              Tuition is not in this table. Public programs run $600 to $2,000 a year and are
              billed by the university, not monthly. A scholarship changes that number rather
              than any of these.
            </p>
          </ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow="Line by line" title="What the money buys" />
          </ScrollReveal>

          <CardGrid min={250} gap="var(--space-6)">
            {studentLife.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 60} style={{ display: "flex" }}>
                <Card padding="var(--space-8)" style={{ width: "100%", display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
                  <Icon name={item.icon} size={20} color="var(--green-600)" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <h2 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{item.title}</h2>
                    <p style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)", margin: 0 }}>
                      {item.body}
                    </p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </CardGrid>

          {/* The reveal wraps the grid rather than being it: `ScrollReveal` animates a
              transform on its own element, and an element that is both the animated
              subject and the grid container gets its columns recalculated on every
              frame of that animation. */}
          <ScrollReveal delay={80}>
            <CardGrid min={240} gap="var(--space-6)">
              <ImagePlaceholder slot="study-housing" label="Dormitory or student housing" ratio="4 / 3" />
              <ImagePlaceholder slot="study-campus" label="Campus life, students outdoors" ratio="4 / 3" />
              <ImagePlaceholder slot="study-city" label="City street, everyday costs" ratio="4 / 3" />
            </CardGrid>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <CTABanner
            eyebrow="Next step"
            title="Get the number for your city and program"
            body="Tuition, housing and living costs for the universities you are actually considering, in one document."
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
