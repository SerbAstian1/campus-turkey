/**
 * Photographs for the partner-institution pages, by slug.
 *
 * These illustrate an audience — universities, agencies — rather than naming a partner,
 * so a Turkish university building on "For universities" is illustration and not a
 * claim about anyone's affiliation.
 *
 * The hospital and chamber pages use original editorial scenes rather than an unrelated
 * building. They communicate the work without claiming a named partner or location.
 */
export interface InstitutionPhoto {
  readonly src: string;
  readonly alt: string;
  readonly author?: string;
  readonly licence?: string;
  readonly licenceUrl?: string;
  readonly source?: string;
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
  "hospitals": {
    src: "/assets/editorial/patient-consultation.webp",
    alt: "An international patient speaking with a physician and care coordinator in a consultation room",
  },
  "chambers": {
    src: "/assets/editorial/trade-delegation.webp",
    alt: "An international business delegation in a working meeting overlooking Istanbul",
  },
};

/** The editorial photograph for this institution audience. */
export const institutionPhoto = (slug: string): InstitutionPhoto | undefined => institutionPhotos[slug];
