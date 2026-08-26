"use client";

/** University directory. Ported from site/Directory.jsx. */

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, CTABanner, Card, DirectoryToolbar, Icon, ScrollReveal, Tag, UniversityCard, ASSETS } from "@/ds";
import { useDirectory, useFacets, useFilters } from "@/features/universities/data";
import { go, useHref } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";
import { useT } from "@/i18n/context";
import { universityCardImage } from "@/content/university-photos";

/**
 * Leaflet and its stylesheet are the largest thing this route loads, and the map is
 * below the fold on every viewport. Imported statically they sat in the initial
 * bundle, which put this page at 174 kB of first-load JS against a 170 kB budget —
 * audit finding m3.
 *
 * `ssr: false` is not a workaround here, it is the truth: the component builds its map
 * imperatively against a real DOM node in an effect, so it renders nothing on the
 * server either way. The placeholder holds the map's exact height so the cards below
 * it do not move when the chunk lands.
 */
const TurkeyMap = dynamic(() => import("./UniversitiesMap"), {
  ssr: false,
  loading: () => (
    <Card padding="0" style={{ overflow: "hidden", position: "relative" }}>
      <div style={{ width: "100%", height: "clamp(320px,46vh,520px)", background: "var(--neutral-100)" }} />
    </Card>
  ),
});

/**
 * The directory now queries the database rather than filtering an imported array.
 *
 * What changed and why: §44 requires server-side filtering and §78 forbids shipping the
 * whole catalogue to the browser. Every filter below sets state, the hook debounces and
 * fetches, and the result arrives paged. The visible behaviour is deliberately the same
 * — the same tags, the same toolbar, the same empty state — because the point was to
 * change where the work happens, not what the page looks like.
 *
 * Sort options are now the three the API can actually order by. "Most popular" and
 * "Lowest tuition" are gone: the first was `programs` descending under a label that
 * claimed something the data does not know, and the second parsed digits out of a
 * display string like "$400 – $1,500 / year", which sorts on 400 and silently ignores
 * the range. Real tuition sorting arrives with `Program.tuitionMinor`.
 */

/** A hook, not a module constant — see the note in About.tsx. */
function useSorts() {
  const t = useT();

  return [
    { value: "name", label: t("Name A to Z") },
    { value: "city", label: t("City A to Z") },
    { value: "founded", label: t("Oldest first") },
  ] as const;
}

export default function Universities() {
  const href = useHref();
  const t = useT();
  const sorts = useSorts();
  const { filters, update, reset } = useFilters();
  const facets = useFacets();
  const directory = useDirectory(filters);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [pin, setPin] = useState<string | null>(null);

  const clear = () => { reset(); setPin(null); };

  const onPin = (slug: string | null) => {
    setPin(slug);
    if (slug) go(`university/${slug}`);
  };

  return (
    <div style={{ background: "var(--surface-subtle)", paddingTop: 140 }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)", paddingBottom: "var(--section-y)" }}>
        <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span className="ct-eyebrow">{t("University directory")}</span>
          <h1 style={{ fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", color: "var(--text-heading)", margin: 0, maxWidth: "20ch" }}>{t("Find your university in Türkiye")}</h1>
          <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0, maxWidth: 620 }}>
            {t("Filter by city, type, language of instruction and scholarships.")}
          </p>
        </ScrollReveal>

        {/* Pins for every match, not just the visible page. A map that pages would drop
            and restore pins as somebody clicks through, which reads as broken. */}
        <ScrollReveal delay={80}><TurkeyMap universities={directory.pins} active={pin} onSelect={onPin} /></ScrollReveal>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", height: 44, padding: "0 16px", background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", minWidth: 260 }}>
            <Icon name="search" size={17} color="var(--neutral-500)" />
            <input value={filters.search} onChange={(e) => update({ search: e.target.value })}
              placeholder={t("Search by university or city")} aria-label={t("Search universities")}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)" }} />
          </div>
          {/* Counts are gone from the tags. They were computed from the full array, which
              no longer exists here; showing a per-filter count would mean a query per tag
              on every keystroke to display a number nobody acts on. The total is in the
              toolbar, where it answers the question people actually have. */}
          {/* `kind`, not `t` — the parameter shadowed the translator, which is why the
              two labels below could not be wrapped where they stood. */}
          {facets.types.map((kind) => (
            <Tag key={kind} selected={filters.type === kind}
              onClick={() => update({ type: filters.type === kind ? null : kind })}>
              {kind === "PUBLIC" ? t("Public") : t("Private")}
            </Tag>
          ))}
          <Tag selected={filters.scholarship} onClick={() => update({ scholarship: !filters.scholarship })}>
            {t("Scholarship")}
          </Tag>
          {facets.languages.includes("English") ? (
            <Tag selected={filters.language === "English"}
              onClick={() => update({ language: filters.language === "English" ? null : "English" })}>
              {t("English-taught")}
            </Tag>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <span className="ct-eyebrow" style={{ marginInlineEnd: "var(--space-2)" }}>{t("City")}</span>
          {facets.cities.slice(0, 10).map((c) => (
            <Tag key={c} selected={filters.city === c}
              onClick={() => update({ city: filters.city === c ? null : c })}
              onRemove={filters.city === c ? () => update({ city: null }) : undefined}>{c}</Tag>
          ))}
        </div>

        <DirectoryToolbar total={directory.total} shown={directory.items.length} view={view}
          onViewChange={setView} onClear={clear}
          sort={sorts.find((s) => s.value === filters.sort)?.label ?? sorts[0].label}
          sortOptions={sorts.map((s) => s.label)}
          onSortChange={(e) => {
            const chosen = sorts.find((s) => s.label === e.target.value);
            if (chosen) update({ sort: chosen.value });
          }} />

        {directory.error ? (
          <Card style={{ textAlign: "center", padding: "var(--space-16)" }}>
            <Icon name="alert-circle" size={26} color="var(--status-danger)" />
            <h3 style={{ margin: "var(--space-4) 0 var(--space-2)", fontSize: "var(--fs-h3)" }}>{directory.error}</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>{t("This is usually temporary. Try again in a moment.")}</p>
          </Card>
        ) : directory.items.length ? (
          /* Grid and list are different layouts, not one layout with a different
             column count — the list is a single flowing column of row-shaped cards and
             has no rows to balance. Rendering the cards once and choosing the container
             keeps the two in step. */
          (() => {
            const cards = directory.items.map((u, i) => (
              <ScrollReveal key={u.slug} delay={(i % 3) * 80} style={{ display: "flex" }}>
                <UniversityCard
                  name={u.name} city={u.city}
                  /* The API returns the enum; the card renders the word. */
                  /*
                   * Deliberately not translated, and it is the design system's
                   * constraint rather than an oversight. `UniversityCard` uses this one
                   * prop as both the badge's text and its styling switch —
                   * `tone: type === "Public" ? "brand" : "neutral"` — so a translated
                   * value renders correctly and silently turns every public university's
                   * badge grey in sixteen of the seventeen languages. Exactly the
                   * label/value conflation `useTranslatedOptions` exists to prevent,
                   * except here there is no second prop to separate them. Translate it
                   * when the card takes a `typeLabel`.
                   */
                  type={u.type === "PUBLIC" ? "Public" : "Private"}
                  languages={u.languages} tuition={u.tuitionDisplay}
                  scholarship={u.scholarship} programs={u.programCount}
                  /* Campus photographs only — see `universityCardImage` for why a card
                     cannot carry a city picture the way the detail hero can. */
                  image={universityCardImage(u.slug)}
                  href={href(`university/${u.slug}`)} layout={view === "grid" ? "grid" : "row"} style={{ width: "100%" }}
                />
              </ScrollReveal>
            ));

            return view === "grid" ? (
              <CardGrid min={280} gap="var(--space-6)">{cards}</CardGrid>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>{cards}</div>
            );
          })()
        ) : (
          <Card style={{ textAlign: "center", padding: "var(--space-16)" }}>
            <Icon name="search-x" size={26} color="var(--neutral-400)" />
            <h3 style={{ margin: "var(--space-4) 0 var(--space-2)", fontSize: "var(--fs-h3)" }}>{t("No universities match those filters")}</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>{t("Clear a filter and try again, or message us and we will search for you.")}</p>
            <Button variant="secondary" icon="rotate-ccw" onClick={clear} style={{ marginInline: "auto" }}>{t("Clear filters")}</Button>
          </Card>
        )}

        {/* Numbered pages rather than "load more". The directory is something people
            scan and come back to, and "page 3 of 4" is a position you can return to
            while "I pressed load more twice" is not. */}
        {directory.pageCount > 1 ? (
          <nav aria-label={t("Directory pages")} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="secondary" size="md" icon="chevron-left"
              disabled={directory.page <= 1 || directory.loading}
              onClick={() => update({ page: directory.page - 1 })}>
              Previous
            </Button>
            <span aria-live="polite" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>
              Page {directory.page} of {directory.pageCount}
            </span>
            <Button variant="secondary" size="md" icon="chevron-right"
              disabled={directory.page >= directory.pageCount || directory.loading}
              onClick={() => update({ page: directory.page + 1 })}>
              Next
            </Button>
          </nav>
        ) : null}

        <ScrollReveal>
          <CTABanner eyebrow={t("Not sure which one")} title={t("Send us your grades and we will shortlist for you")}
            body={t("One short form. We reply with universities you can actually get into.")} primaryLabel={t("Apply Now")}
            primaryHref={href("apply")} secondaryLabel={t("Book a Consultation")} secondaryHref={href("contact")} assetBase={ASSETS} />
        </ScrollReveal>
      </div>
    </div>
  );
}
