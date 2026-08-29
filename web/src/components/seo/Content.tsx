/**
 * The server-rendered half of every public page.
 *
 * Deliberately **not** a client component and deliberately not built from `@/ds`. The
 * design system is a browser global installed by a script tag, so anything that touches
 * it cannot run on the server, and the server is the only place this content matters.
 * These are plain elements: a heading is an `h1`, a list is a `ul`, a set of facts is a
 * `dl`. That is the whole design goal, because the reader here is a crawler, a reader
 * mode, a screen reader running ahead of hydration, or someone whose bundle failed.
 *
 * Styled from the design tokens rather than left bare. `tokens.css` and `base.css` are
 * real stylesheets imported by the root layout, so they are already applied when this
 * renders. Using them means the pre-hydration page looks like a plain version of the
 * site instead of an unstyled document, which keeps the swap to the design system from
 * reading as a page reload.
 *
 * Kept narrow on purpose. This is a legible text version of a page, not a second
 * implementation of it. If a section here starts needing layout, it belongs in the
 * design system screen instead.
 */

import type { CSSProperties, ReactNode } from "react";

const prose: CSSProperties = {
  color: "var(--text-body)",
  lineHeight: "var(--lh-body)",
  margin: 0,
};

/**
 * The outer frame.
 *
 * `<main>` because this is the page's primary content, and before hydration it is the
 * only content: the navbar and footer are design system components and render nothing
 * yet, so without a landmark here a screen reader would find no main region at all.
 */
export function SeoDocument({ children }: { children: ReactNode }) {
  return (
    <main
      className="ct-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-8)",
        paddingTop: "var(--space-12)",
        paddingBottom: "var(--space-12)",
        maxWidth: "72ch",
      }}
    >
      {children}
    </main>
  );
}

/** The page's one `h1`, with the standing line underneath it. */
export function SeoTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-h1)",
          lineHeight: "var(--lh-display)",
          color: "var(--green-900)",
        }}
      >
        {title}
      </h1>
      {lead ? <p style={{ ...prose, fontSize: "var(--fs-lead)" }}>{lead}</p> : null}
    </header>
  );
}

/** A titled block of prose. `heading` is optional so a section can be body text alone. */
export function SeoSection({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {heading ? (
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-h3)",
            lineHeight: "var(--lh-heading)",
            color: "var(--green-800)",
          }}
        >
          {heading}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function SeoText({ children }: { children: ReactNode }) {
  return <p style={prose}>{children}</p>;
}

/** Several paragraphs from an array, which is how the article bodies are stored. */
export function SeoParagraphs({ paragraphs }: { paragraphs: readonly string[] }) {
  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} style={prose}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

export function SeoList({ items }: { items: readonly string[] }) {
  return (
    <ul style={{ ...prose, paddingLeft: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Label and value pairs, as a description list.
 *
 * A `dl` rather than a table or a stack of divs: tuition, intake dates and languages of
 * instruction are definitions of the thing being described, and the pairing is the
 * information. A crawler reading "Tuition" next to "USD 4,800 a year" gets the fact; the
 * same two strings in sibling divs are two unrelated strings.
 *
 * Blank values are dropped rather than rendered empty, because a university with no
 * ranking on file should not appear to have a ranking of nothing.
 */
export function SeoFacts({ items }: { items: readonly (readonly [string, string | number | null | undefined])[] }) {
  const present = items.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  if (present.length === 0) return null;

  return (
    <dl
      style={{
        ...prose,
        display: "grid",
        gridTemplateColumns: "minmax(8rem, auto) 1fr",
        gap: "var(--space-2) var(--space-5)",
        margin: 0,
      }}
    >
      {present.map(([label, value]) => (
        <div key={label} style={{ display: "contents" }}>
          <dt style={{ fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{label}</dt>
          <dd style={{ margin: 0 }}>{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Internal links, so the pre-hydration page is not a dead end.
 *
 * This matters more than it looks. Before hydration the navbar and footer render
 * nothing, so without these a crawler arriving on a university page finds a document
 * with no outgoing links and no way to reach the other thirty-nine. Link equity has to
 * flow through something, and until the design system loads, this is the something.
 */
export function SeoLinks({ heading, links }: { heading: string; links: readonly { href: string; label: string }[] }) {
  if (links.length === 0) return null;

  return (
    <SeoSection heading={heading}>
      <ul style={{ ...prose, paddingLeft: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} style={{ color: "var(--green-700)" }}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </SeoSection>
  );
}
