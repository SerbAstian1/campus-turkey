"use client";

/**
 * The services index.
 *
 * There was no such page. `/services/medical` existed and `/services` was a 404, so the
 * four non-education services had no shared address — nothing to link to from the
 * navbar, nothing to put in the sitemap, and no way to arrive at the business knowing
 * only that Campus Turkey does more than admissions.
 *
 * Composition: an L-arrangement per card — the icon and eyebrow set on the vertical, the
 * title and lead running out along the horizontal — repeated down the grid so the eye
 * lands on the same corner in each. What varies between cards is the content, not the
 * shape, which is what makes four unlike services scan as one offer.
 *
 * Education is deliberately absent from the grid and present as a closing line. It is
 * the largest thing this company does and it has its own hub; putting it in a card
 * beside a dental quote would misdescribe both.
 */

import { Button, CTABanner, Card, Icon, ScrollReveal, SectionHeading, ASSETS } from "@/ds";
import { services } from "@/content";
import { go } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";
import { PageBody, PageHero } from "./shared";
import { useT } from "@/i18n/context";

export default function Services() {
  const t = useT();
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        eyebrow={t("Services")}
        title={t("What we do beyond admissions")}
        lead={t("Four services, each run by the people who do the work. Every one of them starts with a conversation and a written scope before anybody pays anything.")}
        actions={
          <>
            <Button size="lg" icon="message-circle" onClick={() => go("contact")}>
              Book a Consultation
            </Button>
            <Button variant="outlineOnDark" size="lg" onClick={() => go("study")}>
              Looking to study?
            </Button>
          </>
        }
      />

      <PageBody>
        <ScrollReveal>
          <SectionHeading
            eyebrow={t("The four")}
            title={t("Pick the one you came for")}
            lead={t("Each page carries the full process, what is included, what is not, and indicative prices.")}
          />
        </ScrollReveal>

        <CardGrid min={320} gap="var(--space-6)">
          {services.map((service, index) => (
            <ScrollReveal key={service.slug} delay={index * 60} style={{ display: "flex" }}>
              <Card
                interactive
                href={`#/services/${service.slug}`}
                padding="var(--space-8)"
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
              >
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 48, height: 48, borderRadius: "var(--radius-sm)",
                    background: "var(--green-050)",
                  }}
                >
                  <Icon name={service.icon} size={23} color="var(--green-600)" />
                </span>

                <span className="ct-eyebrow">{service.eyebrow}</span>
                <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{service.title}</h3>
                <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0, flex: 1 }}>
                  {service.lead}
                </p>

                {/* The first three tags only. A card carrying all eight becomes a list,
                    and the page it links to is where the full list belongs. */}
                {service.tags?.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    {service.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "4px 10px", borderRadius: 999,
                          background: "var(--green-050)", color: "var(--green-700)",
                          fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {service.tags.length > 3 ? (
                      <span
                        style={{
                          padding: "4px 10px",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-ui)",
                          fontSize: "var(--fs-caption)",
                        }}
                      >
                        +{service.tags.length - 3} more
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)",
                    fontWeight: "var(--fw-semibold)", color: "var(--green-600)",
                  }}
                >
                  {service.cta} <Icon name="arrow-right" size={15} />
                </span>
              </Card>
            </ScrollReveal>
          ))}
        </CardGrid>

        <ScrollReveal>
          <Card
            padding="var(--space-8)"
            surface="tinted"
            style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span className="ct-eyebrow">{t("And the main one")}</span>
              <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{t("University admissions")}</h3>
              <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0, maxWidth: "56ch" }}>
                Placing students in Turkish universities is the largest thing we do, and it has
                its own hub: tuition, scholarships, intakes and what a year actually costs.
              </p>
            </div>
            <Button size="lg" icon="graduation-cap" onClick={() => go("study")}>
              Study in Türkiye
            </Button>
          </Card>
        </ScrollReveal>

        <ScrollReveal>
          <CTABanner
            eyebrow={t("Not sure which")}
            title={t("Tell us what you need")}
            body="Describe it in a sentence. We will say which service it is, or that it is not one we run."
            primaryLabel="Book a Consultation"
            primaryHref="#/contact"
            secondaryLabel="Apply Now"
            secondaryHref="#/apply"
            assetBase={ASSETS}
          />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
