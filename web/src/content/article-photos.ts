/**
 * Lead images for the guides and checklists, by article slug.
 *
 * Editorial illustration rather than evidence: a banknote beside a piece on what a
 * degree costs, a stamped passport beside one on visa documents. Nothing here claims to
 * be a particular place, which is what separates these from the campus photographs.
 *
 * The two topics that had no accurate licensed photograph now use original editorial
 * scenes made for Campus Turkey. They illustrate the subject without claiming to show a
 * named university, student or scholarship recipient.
 */
export interface ArticlePhoto {
  readonly src: string;
  readonly alt: string;
  readonly author?: string;
  readonly licence?: string;
  readonly licenceUrl?: string;
  readonly source?: string;
}

export const articlePhotos: Readonly<Record<string, ArticlePhoto>> = {
  "public-university-costs-2026": {
    src: "/assets/article-photos/public-university-costs-2026.webp",
    alt: "A hundred-lira banknote of the Turkish Republic",
    author: "tcmb.gov.tr",
    licence: "Public domain",
    licenceUrl: "",
    source: "https://commons.wikimedia.org/wiki/File:100-II_TL_reverse.jpg",
  },
  "student-visa-documents": {
    src: "/assets/article-photos/student-visa-documents.webp",
    alt: "The inner pages of a Republic of Türkiye passport",
    author: "Boy from far",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Turkish_passport_page.jpg",
  },
  "turkiye-burslari-who-gets-it": {
    src: "/assets/editorial/scholarship-planning.webp",
    alt: "An international student reviewing university application notes with an adviser in a library",
  },
  "english-or-turkish-taught": {
    src: "/assets/editorial/language-classroom.webp",
    alt: "International students taking part in a Turkish language class",
  },
  "first-week-in-istanbul": {
    src: "/assets/article-photos/first-week-in-istanbul.webp",
    alt: "A nostalgic red tram on İstiklal Avenue, Istanbul",
    author: "Nan Palmero from San Antonio, TX, USA",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0",
    source: "https://commons.wikimedia.org/wiki/File:Nostalgic_%C4%B0stiklal_Caddesi_Tram_(52556940139).jpg",
  },
  "how-treatment-packages-are-priced": {
    src: "/assets/article-photos/how-treatment-packages-are-priced.webp",
    alt: "The Gülhane teaching and research hospital in Ankara",
    author: "Dosseman",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ankara_G%C3%BClhane_E%C4%9Fitim_ve_Ara%C5%9Ft%C4%B1rma_Hastanesi_in_2012_01.jpg",
  },
};

/** The editorial photograph for this record. */
export const articlePhoto = (slug: string): ArticlePhoto | undefined => articlePhotos[slug];
