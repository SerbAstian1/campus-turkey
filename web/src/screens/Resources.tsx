"use client";

/** Resources index. Ported from site/Company.jsx. */

import { useState } from "react";
import { Badge, CTABanner, Card, Icon, ScrollReveal, Tag, ASSETS } from "@/ds";
import { articles } from "@/content";
import { ImagePlaceholder } from "@/components/Common";
import { articlePhoto } from "@/content/article-photos";
import { PageBody, PageHero } from "./shared";
import { useT } from "@/i18n/context";
import { useHref } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";

export default function Resources() {
  const t = useT();
  const href = useHref();
  const [tag, setTag] = useState<string | null>(null);
  const tags = [...new Set(articles.map((r) => r.tag))];
  const list = articles.filter((r) => !tag || r.tag === tag);

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <PageHero eyebrow={t("Resources")} title={t("Guides, checklists and costs")}
        lead={t("Everything we send students, written down. Read before you apply, or ask us to walk you through it.")} />

      <PageBody>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <span className="ct-eyebrow" style={{ marginInlineEnd: "var(--space-2)" }}>{t("Filter")}</span>
          {tags.map((t) => (
            <Tag key={t} selected={tag === t} onClick={() => setTag(tag === t ? null : t)}
              count={articles.filter((r) => r.tag === t).length}>{t}</Tag>
          ))}
        </div>

        <CardGrid min={280} gap="var(--space-6)">
          {list.map((r, i) => (
            <ScrollReveal key={r.slug} delay={i * 60} style={{ display: "flex" }}>
              <Card interactive href={href(`blog/${r.slug}`)} padding="var(--space-6)" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {/* No credit line on the index: the card is a link, and the licence is
                    stated on the article itself where the image is shown at size. */}
                <ImagePlaceholder slot={`article-${r.slug}`} label={t("Article image, 16:9")} ratio="16 / 9"
                  {...(articlePhoto(r.slug) ? { src: articlePhoto(r.slug)!.src, alt: "" } : {})} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
                  <Badge tone="neutral">{r.tag}</Badge>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{r.read} read</span>
                </div>
                <h3 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{r.title}</h3>
                <p style={{ color: "var(--text-body)", lineHeight: "var(--lh-body)", margin: 0, flex: 1 }}>{r.body}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-600)" }}>
                  Read the guide <Icon name="arrow-right" size={15} />
                </span>
              </Card>
            </ScrollReveal>
          ))}
        </CardGrid>

        <ScrollReveal>
          <CTABanner eyebrow={t("Faster than reading")} title={t("Ask us your question directly")}
            body="A person replies on WhatsApp, usually the same day."
            primaryLabel="Book a Consultation" primaryHref={href("contact")} secondaryLabel="Apply Now" secondaryHref={href("apply")} assetBase={ASSETS} />
        </ScrollReveal>
      </PageBody>
    </div>
  );
}
