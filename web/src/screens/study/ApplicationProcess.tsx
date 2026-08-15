"use client";

/**
 * /study-in-turkiye/application-process
 *
 * The five steps, with what the student is actually holding at each one.
 *
 * The hub renders the same `journey` as a timeline strip and stops there, which answers
 * "what happens" but not "what do I need". Those are different questions and the second
 * one is the one that stalls an application: a student who does not know a transcript is
 * needed at step 3 finds out at step 3.
 *
 * The document lists below are the only new content on this page, and every item on them
 * is a document named elsewhere in the site — the apply form's fields and the resources
 * guides. Nothing here invents a requirement.
 */

import { Accordion, Button, CTABanner, Card, Icon, ScrollReveal, SectionHeading, TimelineTrack, ASSETS } from "@/ds";
import { generalFaq, journey } from "@/content";
import { useT } from "@/i18n/context";
import { go, useHref } from "@/app/router";
import { FaqLayout, PageBody, PageHero } from "../shared";

/**
 * What to have ready, and when.
 *
 * Keyed by the step it belongs to rather than listed as one long checklist, because a
 * single list of eleven documents reads as eleven things needed today — which is both
 * wrong and the most common reason someone closes the page.
 */
function useReady(): { step: string; heading: string; items: string[]; note?: string }[] {
  const t = useT();

  return [
    {
      step: t("Step 1"),
      heading: t("Nothing yet"),
      items: [t("Your name and how to reach you"), t("The subject you want to study"), t("Roughly when you want to start")],
      note: t("No documents at this stage, and nothing to pay."),
    },
    {
      step: t("Step 2"),
      heading: t("Your results"),
      items: [
        t("High school transcript, or degree transcript for a master's"),
        t("Your grades as they stand. Predicted grades are fine here"),
        t("Any English or Turkish language certificate you already hold"),
      ],
      note: t("These decide the shortlist. Send what you have; a missing certificate does not stop this step."),
    },
    {
      step: t("Step 3"),
      heading: t("The application file"),
      items: [
        t("Passport, valid for the whole of your first year"),
        t("Certified transcript and school leaving certificate"),
        t("Passport photographs to the university's specification"),
        t("Language certificate, where the program requires one"),
      ],
      note: t("We tell you which of these need translation and certification before you pay for either."),
    },
    {
      step: t("Step 4"),
      heading: t("The visa file"),
      items: [
        t("Your acceptance letter, which we obtain"),
        t("Proof of funds in the amount the consulate asks for"),
        t("Health insurance, which is mandatory and costs about $60 a year"),
        t("Your visa appointment booking"),
      ],
      note: t("You only pay after your student visa is approved."),
    },
    {
      step: t("Step 5"),
      heading: t("On arrival"),
      items: [
        t("Residence permit application, within your first month"),
        t("Bank account and a local phone line"),
        t("University registration in person"),
      ],
      note: t("Airport pickup, accommodation and your first week are arranged before you travel."),
    },
  ];
}

/** The process questions from the shared FAQ. The money ones live on the scholarships page. */
const PROCESS_FAQ = generalFaq.filter((item) =>
  /visa|turkish|land|apply|document|admission/i.test(item.question),
);

export default function ApplicationProcess() {
  const href = useHref();
  const t = useT();
  const ready = useReady();
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        eyebrow={t("Study in Türkiye")}
        title={t("How to apply, and what to have ready")}
        lead={t("Five steps from first message to first week on campus. This page says what happens at each one and which documents you need before it, so nothing arrives as a surprise.")}
        actions={
          <>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>
              {t("Start step one")}
            </Button>
            <Button variant="outlineOnDark" size="lg" icon="graduation-cap" onClick={() => go("study-in-turkiye")}>
              {t("Back to Study in Türkiye")}
            </Button>
          </>
        }
      />

      <PageBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading eyebrow={t("The route")} title={t("What happens, in order")} />
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <TimelineTrack steps={journey} />
          </ScrollReveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <ScrollReveal>
            <SectionHeading
              eyebrow={t("Documents")}
              title={t("What to have ready, and when")}
              lead={t("Grouped by step rather than as one list. Eleven documents in a single column reads as eleven things needed today, which is not true of any of them.")}
            />
          </ScrollReveal>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {ready.map((group, index) => {
              const step = journey[index];
              return (
                <ScrollReveal key={group.step} delay={index * 60}>
                  <Card padding="var(--space-8)" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-8)" }}>
                    <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <span className="ct-eyebrow">{group.step}</span>
                      <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{group.heading}</h2>
                      {step ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-body-sm)", margin: 0, maxWidth: "44ch" }}>
                          {step.title}. {step.description}
                        </p>
                      ) : null}
                    </div>

                    <div style={{ flex: "2 1 340px", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        {group.items.map((item) => (
                          <li key={item} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                            <Icon name="check" size={17} color="var(--green-600)" />
                            <span style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)" }}>
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {group.note ? (
                        <p
                          style={{
                            margin: 0,
                            paddingTop: "var(--space-4)",
                            borderTop: "1px solid var(--border-subtle)",
                            color: "var(--text-muted)",
                            fontSize: "var(--fs-body-sm)",
                            lineHeight: "var(--lh-body)",
                          }}
                        >
                          {group.note}
                        </p>
                      ) : null}
                    </div>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {PROCESS_FAQ.length > 0 ? (
          <FaqLayout
            heading={
              <ScrollReveal>
                <SectionHeading eyebrow={t("Questions")} title={t("About the process")} lead={t("Anything else, message us on WhatsApp.")} />
              </ScrollReveal>
            }
          >
            <ScrollReveal delay={80}>
              <Accordion items={PROCESS_FAQ} />
            </ScrollReveal>
          </FaqLayout>
        ) : null}

        <ScrollReveal>
          <CTABanner
            eyebrow={t("Next step")}
            title={t("Send us step one")}
            body={t("Your name, the subject and roughly when. No documents, nothing to pay, and a shortlist back with real tuition.")}
            primaryLabel={t("Apply Now")}
            primaryHref={href("apply")}
            secondaryLabel={t("Book a Consultation")}
            secondaryHref={href("contact")}
            assetBase={ASSETS}
          />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
