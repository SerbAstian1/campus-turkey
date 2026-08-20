"use client";

/**
 * A resource article. Ported from site/Company.jsx (BlogPostScreen).
 *
 * An unknown slug renders a real not-found rather than falling back to the first
 * article, which is the same correction applied on the other detail screens.
 */

import { BrandDivider, Badge, Button, Card, Icon, ScrollReveal } from "@/ds";
import { useT } from "@/i18n/context";
import { articles, getArticle } from "@/content";
import { ImagePlaceholder } from "@/components/Common";
import { articlePhoto } from "@/content/article-photos";
import { PhotoCredit } from "@/components/PhotoCredit";
import { go, useHref } from "@/app/router";
import { ErrorScreen } from "./Errors";

export default function Article({ slug }: { slug: string | null }) {
  const t = useT();
  const href = useHref();
  const post = slug ? getArticle(slug) : undefined;
  if (!post) return <ErrorScreen state="notFound" />;

  const more = articles.filter((r) => r.slug !== post.slug).slice(0, 3);

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <section style={{ background: "var(--gradient-brand-deep)", paddingTop: 150, paddingBottom: "calc(var(--section-y) + 40px)", marginBottom: "calc(var(--overlap) * -1)" }}>
        <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 820 }}>
          <button type="button" onClick={() => go("resources")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,.78)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", cursor: "pointer", width: "fit-content", padding: 0 }}>
            <Icon name="arrow-left" size={16} /> {t("All resources")}
          </button>
          <span style={{ alignSelf: "flex-start" }}><Badge tone="onDark">{post.tag}</Badge></span>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-h1)", lineHeight: "var(--lh-display)", margin: 0 }}>{post.title}</h1>
          <p style={{ color: "rgba(255,255,255,.86)", fontSize: "var(--fs-lead)", margin: 0 }}>{post.body}</p>
          <span style={{ color: "rgba(255,255,255,.7)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)" }}>
            {post.date} · {post.read} read · {post.author}
          </span>
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
        <div className="ct-container ct-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px,320px)", gap: "var(--space-12)", alignItems: "start" }}>
          <article style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", maxWidth: 720 }}>
            {/* The lead image where one has been sourced, the reserved frame where it
                has not — two of the six articles have no free photograph of the right
                country. See `article-photos.ts`. */}
            <ImagePlaceholder slot={`post-${post.slug}`} label={t("Article lead image, 16:9")} ratio="16 / 9"
              {...(articlePhoto(post.slug) ? { src: articlePhoto(post.slug)!.src, alt: articlePhoto(post.slug)!.alt } : {})} />
            <PhotoCredit photo={articlePhoto(post.slug)} />
            {post.sections.map((section, i) => (
              <ScrollReveal key={section.heading} delay={i * 40} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{section.heading}</h2>
                {section.paragraphs.map((p) => (
                  <p key={p} style={{ fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0, textWrap: "pretty" }}>{p}</p>
                ))}
              </ScrollReveal>
            ))}
            <BrandDivider />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
              <Button variant="primary" onClick={() => go("apply")}>{t("Apply Now")}</Button>
              <Button variant="secondary" onClick={() => go("contact")}>{t("Book a Consultation")}</Button>
            </div>
          </article>

          <aside style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <span className="ct-eyebrow">{t("In this article")}</span>
              {post.sections.map((s) => (
                <span key={s.heading} style={{ display: "flex", gap: "var(--space-2)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>
                  <Icon name="chevron-right" size={15} color="var(--green-500)" />{s.heading}
                </span>
              ))}
            </Card>
            <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">{t("More resources")}</span>
              {more.map((m) => (
                <a key={m.slug} href={href(`blog/${m.slug}`)} style={{ display: "flex", flexDirection: "column", gap: 2, textDecoration: "none" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{m.title}</span>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.tag} · {m.read}</span>
                </a>
              ))}
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
