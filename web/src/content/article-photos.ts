/**
 * Lead images for the guides and checklists, by article slug.
 *
 * Editorial illustration rather than evidence: a banknote beside a piece on what a
 * degree costs, a stamped passport beside one on visa documents. Nothing here claims to
 * be a particular place, which is what separates these from the campus photographs.
 *
 * Two of the six articles have no entry. The only free lecture halls on Commons are in
 * Hungary and Bolivia and the only reading rooms in Chile and Mexico — accurate images
 * of the wrong country to put on a page about studying in Türkiye. The frames stay
 * reserved until something of the right place exists.
 */
export interface ArticlePhoto {
  readonly src: string;
  readonly alt: string;
  readonly author: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly source: string;
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
    alt: "Passport pages covered in entry and exit stamps",
    author: "Dennis Sylvester Hurd",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0",
    source: "https://commons.wikimedia.org/wiki/File:Out_of_Pages_-_Flickr_-_Dennis_S._Hurd.jpg",
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

/** The photograph for this record, or `undefined` where none has been sourced. */
export const articlePhoto = (slug: string): ArticlePhoto | undefined => articlePhotos[slug];
