/**
 * Service photographs, by service slug.
 *
 * These illustrate a service rather than evidencing a place, which is the difference from
 * `university-photos.ts`. A campus photograph is a claim about where a student would go, so
 * the wrong building misleads; a congress centre beside "Business Facilitation" is
 * illustration, and generic imagery is legitimate. What is still ruled out is an
 * identifiable individual, a patient, or somebody else's mark shown as the client's.
 *
 * **Three of the four require their credit to be rendered.** CC BY-SA grants use only while
 * the author and licence are stated, so the credit line prints beneath the frame. Marmaris
 * is public domain and imposes no condition; it is credited anyway, because one uniform
 * line is simpler than two rules.
 *
 * Chosen by looking at every candidate rather than trusting a search rank, and two
 * rejections are worth recording: a file called "Factory in Türkiye" is an aerial of
 * farmland, and "Hälsa Yatak Üretim Tesisi" is a Swedish plant — the sign in frame reads
 * HAVSLÄGET AB, and it sits in a Turkish category only because the company sells there.
 */
export interface ServicePhoto {
  readonly src: string;
  /** Describes the picture, not the service — the heading already names that. */
  readonly alt: string;
  readonly author: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly source: string;
}

export const servicePhotos: Readonly<Record<string, ServicePhoto>> = {
  "medical": {
    alt: "The Acıbadem hospital tower in Ataşehir, Istanbul",
    src: "/assets/service-photos/medical.webp",
    author: "Metuboy",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Acibadem_Atasehir.jpg",
  },
  "business": {
    alt: "The Selçuklu Congress Centre in Konya",
    src: "/assets/service-photos/business.webp",
    author: "Alperenbaybagan",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Sel%C3%A7uklu_Kongre_Merkezi.jpg",
  },
  "employment": {
    alt: "An automated production line in a chocolate factory in Konya",
    src: "/assets/service-photos/employment.webp",
    author: "Mark Lowen",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Chocolate_factory_in_Konya,_Turkey,_May_24,_2015.jpg",
  },
  "tours": {
    alt: "Wooden gulets moored at Marmaris marina",
    src: "/assets/service-photos/tours.webp",
    author: "George Chernilevsky",
    licence: "Public domain",
    licenceUrl: "",
    source: "https://commons.wikimedia.org/wiki/File:Marmaris_marina_2019_G2.jpg",
  },
};

/** The photograph for a service, or `undefined` where none has been sourced. */
export const servicePhoto = (slug: string): ServicePhoto | undefined => servicePhotos[slug];
