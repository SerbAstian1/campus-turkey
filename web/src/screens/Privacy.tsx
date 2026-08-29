"use client";

/**
 * Privacy notice, rendered with the design system.
 *
 * The words are in `content/privacy.ts` rather than here, because this page is rendered
 * twice: this component for a browser that has run the design system bundle, and
 * `PrivacySeo` as plain HTML in the server's response. Two hand-maintained copies of a
 * legal notice would eventually disagree, and the disagreement would be invisible.
 *
 * The caveats about what still needs the client's counsel are recorded with the content.
 */

import { Card, Icon, SectionHeading, ScrollReveal } from "@/ds";
import { useT } from "@/i18n/context";
import { useHref } from "@/app/router";
import { privacyNotice } from "@/content/privacy";
import { PageBody, PageHero } from "./shared";

const bodyStyle = {
  color: "var(--text-body)",
  lineHeight: "var(--lh-body)",
  margin: 0,
} as const;

export default function Privacy() {
  const t = useT();
  const href = useHref();

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow={t("Privacy")} title={t(privacyNotice.title)} lead={t(privacyNotice.lead)} />

      <PageBody>
        <ScrollReveal>
          <Card surface="tinted" padding="var(--space-6)">
            <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
              <Icon name="calendar-check" size={20} color="var(--green-500)" />
              <p style={{ ...bodyStyle, fontSize: "var(--fs-body-sm)" }}>
                {t("Last updated")}: {privacyNotice.lastUpdated}.{" "}
                {t("If we change how we use your information, we will update this page and the date above.")}
              </p>
            </div>
          </Card>
        </ScrollReveal>

        {privacyNotice.sections.map((section) => (
          <ScrollReveal
            key={section.heading}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
          >
            <SectionHeading size="h3" title={t(section.heading)} />
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} style={bodyStyle}>
                {t(paragraph)}
              </p>
            ))}
            {section.list ? (
              <ul
                style={{
                  ...bodyStyle,
                  paddingLeft: "var(--space-6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                {section.list.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            ) : null}
          </ScrollReveal>
        ))}

        <ScrollReveal>
          <Card surface="tinted" padding="var(--space-6)">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <SectionHeading size="h3" title={t("Questions about this page")} />
              <p style={bodyStyle}>
                {t("If something here is unclear, or you want us to delete what we hold, get in touch and say so plainly. You do not need to use any particular wording.")}
              </p>
              <a
                href={href("contact")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-body-sm)",
                  fontWeight: "var(--fw-medium)",
                  color: "var(--green-700)",
                }}
              >
                <Icon name="mail" size={16} />
                {t("Contact Campus Turkey")}
              </a>
            </div>
          </Card>
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
