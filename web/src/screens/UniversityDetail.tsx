"use client";

/**
 * University detail. Ported from site/Directory.jsx.
 *
 * One departure from the prototype, kept from the earlier pass: an unknown slug renders
 * a real not-found rather than silently falling back to the first university, which
 * served the wrong page for any stale link.
 */

import { BrandDivider, Badge, Button, Card, Icon, ScrollReveal, Tag, UniversityCard } from "@/ds";

import { go, useHref } from "@/app/router";
import { Facts } from "./shared";
import { ErrorScreen } from "./Errors";
import { CardGrid } from "@/components/CardGrid";
import { useT } from "@/i18n/context";
import { universityPhoto, universityCardImage } from "@/content/university-photos";

/**
 * The record and its neighbours, both fetched by the server page.
 *
 * Passed in rather than fetched here. The page is statically generated with ISR, so the
 * data already exists when the HTML is built; re-fetching in the browser would turn a
 * static page into one that flashes empty and then fills, for information that has not
 * changed since the build.
 */
export interface UniversityDetailData {
  slug: string;
  name: string;
  city: string;
  type: "PUBLIC" | "PRIVATE";
  about: string;
  languages: string[];
  tuition: string;
  programs: number;
  scholarship: boolean;
  founded: number | null;
  students: string | null;
  ranking: string | null;
  faculties: string[];
  deadlines: [string, string][];
  /**
   * Campus photography, per university, from `University.coverImage`.
   *
   * Nullable and expected to stay nullable for some time: these are licensed images
   * that arrive one institution at a time, and a university without one still has a
   * page. The reserved frame renders instead — see `ImagePlaceholder`.
   */
  coverImage: string | null;
}

export interface SimilarUniversity {
  slug: string;
  name: string;
  city: string;
  type: "PUBLIC" | "PRIVATE";
  languages: string[];
  tuition: string;
  programs: number;
  scholarship: boolean;
}

/**
 * The enum the database stores; the word the card shows.
 *
 * Not translated, and the parameter is no longer called `t`. `UniversityCard` uses this
 * single prop as both the badge's text and its styling switch — `tone: type === "Public"
 * ? "brand" : "neutral"` — so a translated value renders correctly and silently turns
 * every public university's badge grey in sixteen of the seventeen languages. Translate
 * it when the card accepts a separate label.
 */
const typeLabel = (kind: "PUBLIC" | "PRIVATE") => (kind === "PUBLIC" ? "Public" : "Private");

/**
 * The photographer's credit, under the picture.
 *
 * **Not optional and not decoration.** These images are used under CC BY, CC BY-SA and
 * the Free Art Licence, which grant the right to publish only on condition that the
 * author and the licence are stated. Removing this line does not tidy the page; it ends
 * the permission the image is published under. CC0 and public-domain entries impose no
 * such condition and are credited anyway, because one uniform line beats two rules.
 *
 * Rendered from `universityPhotos` rather than from the database record, because the
 * credit belongs to the specific file in `assets/` — a photograph an administrator later
 * uploads through the console is the client's own and correctly finds no entry here.
 *
 * Untranslated on purpose: an author's name is a proper noun and a licence identifier is
 * a term of art. "CC BY-SA 4.0" is the name of the instrument in every language.
 */
function PhotoCredit({ slug }: { slug: string }) {
  const photo = universityPhoto(slug);
  if (!photo) return null;

  /*
   * No licence means the client supplied the photograph, and their own picture needs no
   * credit line. Rendering one anyway is not a harmless extra: it would name somebody who
   * did not take it. Both halves are checked because a half-filled entry is a mistake
   * rather than a third case.
   */
  if (!photo.licence || !photo.author) return null;

  const linkStyle = { color: "inherit", textDecoration: "underline" };
  return (
    <p style={{
      margin: "var(--space-4) 0 0", fontFamily: "var(--font-ui)",
      // On the hero photograph rather than on paper, so the muted grey would vanish.
      fontSize: "var(--fs-micro)", color: "rgba(255,255,255,.72)",
    }}>
      {"Photo: "}
      <a href={photo.source} target="_blank" rel="noopener noreferrer nofollow" style={linkStyle}>
        {photo.author}
      </a>
      {" · "}
      {photo.licenceUrl
        ? (
          <a href={photo.licenceUrl} target="_blank" rel="noopener noreferrer nofollow" style={linkStyle}>
            {photo.licence}
          </a>
        )
        : photo.licence}
      {" · via Wikimedia Commons"}
    </p>
  );
}

export default function UniversityDetail({
  university,
  similar,
}: {
  university: UniversityDetailData | null;
  similar: SimilarUniversity[];
}) {
  const href = useHref();
  const t = useT();
  const u = university;
  if (!u) return <ErrorScreen state="notFound" />;

  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      <section style={{ position: "relative", overflow: "hidden", background: "var(--gradient-brand-deep)", paddingTop: 150, paddingBottom: "calc(var(--section-y) + 40px)", marginBottom: "calc(var(--overlap) * -1)" }}>
        {/*
          The university behind its own title.

          Darkened at the source rather than veiled by a green wash, which is the same
          decision `Hero` documents on the homepage and for the same reason: a wash tints
          the photograph so every campus reads as brand green instead of as a place, while
          `brightness` lowers the exposure and leaves the colour alone. The value matches
          `Hero`'s, and it is set by contrast rather than taste — white display type sits
          on top of this, and at full exposure it fails against the bright frames.

          `--gradient-protect-bottom` stays over it. It is not decoration: the badges,
          heading and buttons sit low in the section, and without it they land on whatever
          that particular photograph happens to show there.

          Decorative here — `alt=""`, `aria-hidden`. The heading directly on top of it is
          the institution's name, so a described background would have a screen reader say
          it twice before the page begins. The credit line beneath carries the attribution
          the licence requires.

          Eager and high priority: it is above the fold and now the largest element in the
          viewport, so it is the LCP candidate rather than something competing with one.

          Three universities have no verified photograph of their campus and no stand-in
          is used for them, so the section keeps `--gradient-brand-deep` on its own —
          which is what every one of these looked like until recently.
        */}
        {u.coverImage ? (
          <>
            <img
              src={u.coverImage}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45)" }}
            />
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--gradient-protect-bottom)" }} />
          </>
        ) : null}
        <div className="ct-container" style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <button type="button" onClick={() => go("universities")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,.78)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", cursor: "pointer", width: "fit-content", padding: 0 }}>
            <Icon name="arrow-left" size={16} /> {t("All universities")}
          </button>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Badge tone="onDark" icon="map-pin">{u.city}</Badge>
            <Badge tone="onDark">{u.type}</Badge>
            {u.scholarship ? <Badge tone="onDark" icon="award">{t("Scholarships available")}</Badge> : null}
          </div>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", maxWidth: "18ch", margin: 0 }}>{u.name}</h1>
          <p style={{ color: "rgba(255,255,255,.86)", fontSize: "var(--fs-lead)", maxWidth: 620, margin: 0 }}>{u.ranking}. Taught in {u.languages.join(" and ")}.</p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)", alignItems: "center" }}>
            <Button variant="onDark" size="lg" onClick={() => go("apply")}>{t("Apply Now")}</Button>
            <Button variant="outlineOnDark" size="lg" icon="calendar-check" onClick={() => go("contact")}>{t("Book a Consultation")}</Button>
          </div>
          {/*
            The credit sits with the photograph it belongs to, which is now the hero.
            It used to sit under a framed copy of the same image further down the page —
            two prints of one photograph, both visible in the same viewport. The hero is
            the better place for it and the licence is satisfied either way, so the
            duplicate went rather than the credit.
          */}
          <PhotoCredit slug={u.slug} />
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
        <div className="ct-container ct-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px,340px)", gap: "var(--space-12)", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
            {/*
              The photograph when this university has one, the reserved frame when it
              does not. `alt` names the institution rather than saying "campus photo",
              because that is what a screen reader user needs to know here — the page
              is already titled, and "campus photography" describes the medium, not the
              subject.
            */}
            <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("About the university")}</h2>
              <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0 }}>{u.about}</p>
              <BrandDivider />
              {/* Rows with no value are dropped rather than shown empty. A fact panel with
                  "Founded —" reads as missing data on the university's part rather than
                  on ours. */}
              {/* Programs and tuition follow the same rule as the two above, for the same
                  reason. A university added before its figures are confirmed carries
                  `programs: 0` and an empty tuition string, and "Programs 0 / Tuition —"
                  states something false rather than stating nothing. The card already
                  reaches the same conclusion on its own: no tuition renders as "Contact
                  for tuition" rather than an empty amount. */}
              <Facts items={[
                ...(u.founded ? [[t("Founded"), u.founded] as [string, string | number]] : []),
                ...(u.students ? [[t("Students"), u.students] as [string, string | number]] : []),
                ...(u.programs ? [[t("Programs"), u.programs] as [string, string | number]] : []),
                ...(u.tuition ? [[t("Tuition"), u.tuition] as [string, string | number]] : []),
              ]} />
            </ScrollReveal>

            <ScrollReveal delay={80} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Popular faculties")}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                {u.faculties.map((f) => <Tag key={f}>{f}</Tag>)}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={160} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Dates for the 2026 intake")}</h2>
              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {u.deadlines.map(([k, v], i) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-6)", flexWrap: "wrap", paddingTop: i ? "var(--space-4)" : 0, borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{k}</span>
                    <span style={{ color: "var(--text-body)" }}>{v}</span>
                  </div>
                ))}
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={200} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{t("Similar universities")}</h2>
              <CardGrid min={220} gap="var(--space-5)">
                {similar.map((s) => (
                  <UniversityCard key={s.slug} name={s.name} city={s.city} type={typeLabel(s.type)} languages={s.languages}
                    image={universityCardImage(s.slug)}
                    tuition={s.tuition} scholarship={s.scholarship} programs={s.programs}
                    href={href(`university/${s.slug}`)} style={{ width: "100%" }} />
                ))}
              </CardGrid>
            </ScrollReveal>
          </div>

          <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">{t("Yearly tuition")}</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h1)", lineHeight: 1, color: "var(--green-700)" }}>{u.tuition}</span>
              <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: 0 }}>
                {t("Living costs in {city} run about $350 to $550 per month, including housing.", { city: u.city })}
              </p>
              <Button variant="primary" size="lg" fullWidth onClick={() => go("apply")}>{t("Apply Now")}</Button>
              <Button variant="secondary" fullWidth icon="calendar-check" onClick={() => go("contact")}>{t("Book a Consultation")}</Button>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>{t("We confirm the exact fee with the university before you pay anything.")}</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
