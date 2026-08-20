/**
 * Photographs for the partner-institution pages, by slug.
 *
 * These illustrate an audience — universities, agencies — rather than naming a partner,
 * so a Turkish university building on "For universities" is illustration and not a
 * claim about anyone's affiliation.
 *
 * Hospitals and chambers of commerce have no entry. Commons offers chambers in Greece,
 * Wisconsin and Colombia, and its Turkish hospital categories returned an ethnography
 * museum and a carved facade. Neither frame is worth filling with those.
 */
export interface InstitutionPhoto {
  readonly src: string;
  readonly alt: string;
  readonly author: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly source: string;
}

export const institutionPhotos: Readonly<Record<string, InstitutionPhoto>> = {
  "agencies": {
    src: "/assets/institution-photos/agencies.webp",
    alt: "The skyscrapers of Levent, Istanbul's business district",
    author: "Antoloji",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:4._Levent_g%C3%B6kdelenler.jpg",
  },
  "universities": {
    src: "/assets/institution-photos/universities.webp",
    alt: "The rectorate building of a Turkish state university",
    author: "Samizambak",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Rectorate_Building_of_Dokuz_Eylul_University.jpg",
  },
};

/** The photograph for this record, or `undefined` where none has been sourced. */
export const institutionPhoto = (slug: string): InstitutionPhoto | undefined => institutionPhotos[slug];
