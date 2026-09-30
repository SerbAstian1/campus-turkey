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

import { Button, CTABanner, Card, ScrollReveal, SectionHeading, ASSETS } from "@/ds";
import { services } from "@/content";
import { go, useHref } from "@/app/router";
import { PageBody, PageHero } from "./shared";
import { useT } from "@/i18n/context";
import { translateContent, SERVICE_KEYS } from "@/i18n/content";
import { servicePhoto } from "@/content/service-photos";
import { EditorialImage, EditorialIndex, EditorialSplit } from "@/components/Editorial";

export default function Services() {
  const t = useT();
  const href = useHref();
  const cards = translateContent(services, t, SERVICE_KEYS);
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero
        eyebrow={t("Services")}
        title={t("What we do beyond admissions")}
        lead={t("Four services, each run by the people who do the work. Every one of them starts with a conversation and a written scope before anybody pays anything.")}
        actions={
          <>
            <Button size="lg" icon="message-circle" onClick={() => go("contact")}>
              {t("Book a Consultation")}
            </Button>
            <Button variant="outlineOnDark" size="lg" onClick={() => go("study")}>
              {t("Looking to study?")}
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

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          {cards.map((service, index) => {
            const photo = servicePhoto(service.slug);
            return (
              <ScrollReveal key={service.slug} delay={index * 60}>
                <EditorialSplit
                  reverse={index % 2 === 1}
                  tone={index % 2 === 0 ? "plain" : "tinted"}
                  media={
                    photo ? (
                      <EditorialImage
                        slot={`services-${service.slug}`}
                        src={photo.src}
                        alt={photo.alt}
                        credit={photo}
                        ratio="4 / 3"
                      />
                    ) : null
                  }
                >
                  <EditorialIndex>{String(index + 1).padStart(2, "0")}</EditorialIndex>
                  <div>
                    <span className="ct-eyebrow">{service.eyebrow}</span>
                    <h3 style={{ fontSize: "var(--fs-h2)", margin: "var(--space-2) 0 0" }}>{service.title}</h3>
                  </div>
                  <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", fontSize: "var(--fs-lead)", margin: 0 }}>
                    {service.lead}
                  </p>
                  {service.tags?.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {service.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "6px 12px", borderRadius: 999,
                            background: "var(--surface-page)", border: "1px solid var(--border-subtle)",
                            color: "var(--green-700)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <Button variant="secondary" icon="arrow-right" onClick={() => go(`service/${service.slug}`)}>
                    {service.cta}
                  </Button>
                </EditorialSplit>
              </ScrollReveal>
            );
          })}
        </div>

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
                {t("Placing students in Turkish universities is the largest thing we do, and it has its own hub: tuition, scholarships, intakes and what a year actually costs.")}
              </p>
            </div>
            <Button size="lg" icon="graduation-cap" onClick={() => go("study")}>
              {t("Study in Türkiye")}
            </Button>
          </Card>
        </ScrollReveal>

        <ScrollReveal>
          <CTABanner
            eyebrow={t("Not sure which")}
            title={t("Tell us what you need")}
            body={t("Describe it in a sentence. We will say which service it is, or that it is not one we run.")}
            primaryLabel={t("Book a Consultation")}
            primaryHref={href("contact")}
            secondaryLabel={t("Apply Now")}
            secondaryHref={href("apply")}
            assetBase={ASSETS}
          />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
