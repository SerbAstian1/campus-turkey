"use client";

/**
 * The credit line beneath a photograph.
 *
 * **Not decoration, and not optional where it renders.** CC BY, CC BY-SA and the Free Art
 * Licence grant use only on condition that the author and the licence are stated. Removing
 * this line does not tidy the page; it ends the permission the image is published under.
 *
 * It renders nothing when either field is absent, which is how a client-supplied
 * photograph is expressed: their own picture needs no credit, and giving it one would name
 * somebody who did not take it. Both fields are checked rather than one, because a
 * half-filled record is a mistake rather than a third case.
 *
 * One definition rather than four. The university, service, article and institution
 * screens all print the same line, and they had begun to diverge — the second copy already
 * omitted the guard the first one grew. Public-domain and CC0 images impose no condition
 * and are credited anyway, because one uniform line is simpler than two rules.
 */
export interface Credited {
  readonly author?: string;
  readonly licence?: string;
  readonly licenceUrl?: string;
  readonly source?: string;
}

const linkStyle = { color: "inherit", textDecoration: "underline" } as const;

export function PhotoCredit({ photo }: { photo: Credited | undefined }) {
  if (!photo?.author || !photo.licence) return null;

  return (
    <p style={{
      margin: "var(--space-2) 0 0", fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-micro)", color: "var(--neutral-500)",
    }}>
      {"Photo: "}
      {photo.source
        ? (
          <a href={photo.source} target="_blank" rel="noopener noreferrer nofollow" style={linkStyle}>
            {photo.author}
          </a>
        )
        : photo.author}
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
