/**
 * The picture at the top of every university page, with the attribution its licence
 * requires — and an honest label for what it actually shows.
 *
 * **Two kinds, and the distinction is the point.** Thirty-three universities have a `campus`
 * photograph: a freely licensed image of that institution's own grounds or buildings. The
 * remaining seven have a `city` photograph instead: Marmara, Uludağ, İnönü, Van Yüzüncü
 * Yıl, Süleyman Demirel, Harran and Gaziantep, for which no freely licensed photograph of
 * the campus exists at all — repeated searches of Commons categories, the universities'
 * own Wikipedia articles and their named campuses (Görükle, Osmanbey, Göztepe, Zeve)
 * returned nothing usable. Harran gets Balıklıgöl, Van the view from the castle.
 *
 * A city picture is never captioned as a campus. `UniversityDetail` renders it as
 * "Şanlıurfa, where Harran University is based", because a photograph on a recruitment
 * page is evidence, and a pretty building that is not the university's would be a lie
 * told to the person choosing where to move.
 *
 * That split is what makes complete coverage possible at all. A photograph is a
 * copyrighted work, so the only lawful source is freely licensed imagery, and the free
 * corpus of *Turkish campuses* is thin — mostly amateur snapshots. Rejected along the way:
 * an empty football pitch, a state dormitory belonging to the housing authority rather
 * than the university, a municipal bus, two statues in town squares, a logo on a wall, an
 * 1883 engraving, a photograph of The Hague that matched "Van" through the Dutch word
 * "vanaf", and several whose subject was a group of identifiable students. Turkish
 * *cities*, by contrast, are photographed well and freely — so the fallback is both
 * truthful and better looking than the campus snapshots would have been.
 *
 * **The attribution is not decorative.** CC BY, CC BY-SA and the Free Art Licence all
 * grant use *on condition* that the author and licence are stated; publishing without the
 * credit ends the permission the image is published under. Public-domain and CC0 entries
 * impose no such condition and are credited anyway, because one uniform line beats two
 * rules. Share-alike binds the image, not this codebase: a resized WEBP crop is a
 * derivative and stays under the same licence, which is what shipping the credit does.
 */
export interface UniversityPhoto {
  readonly src: string;
  readonly author: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly source: string;
  /** `campus` is this university's own grounds. `city` is the place it sits in. */
  readonly kind: "campus" | "city";
  /** Set only when `kind` is `city` — the city the photograph shows. */
  readonly city?: string;
}

export const universityPhotos: Readonly<Record<string, UniversityPhoto>> = {
  "istanbul-technical-university": {
    src: "/assets/university-campus/istanbul-technical-university.webp",
    author: "Dikkülah",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Teknokent_Gate,_Istanbul_Technical_University_Ayazaga_Campus.jpg",
    kind: "campus",
  },
  "middle-east-technical-university": {
    src: "/assets/university-campus/middle-east-technical-university.webp",
    author: "Foora",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:METU_Campus.jpg",
    kind: "campus",
  },
  "bilkent-university": {
    src: "/assets/university-campus/bilkent-university.webp",
    author: "collage bird's eye v…",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Bilkent_University_-_panoramio.jpg",
    kind: "campus",
  },
  "ege-university": {
    src: "/assets/university-campus/ege-university.webp",
    author: "Ayratayrat",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ege_%C3%BCniversitesi_kamp%C3%BCs_i%C3%A7inde.jpg",
    kind: "campus",
  },
  "ko-university": {
    src: "/assets/university-campus/ko-university.webp",
    author: "Khutuck",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Ko%C3%A7_%C3%9Cniversitesi_Ana_Kamp%C3%BCs_Bilim_Kap%C4%B1s%C4%B1.JPG",
    kind: "campus",
  },
  "akdeniz-university": {
    src: "/assets/university-campus/akdeniz-university.webp",
    author: "AntalyasporFC",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Akdeniz%C3%9CniversiteStadyumu1.jpg",
    kind: "campus",
  },
  "sabanc-university": {
    src: "/assets/university-campus/sabanc-university.webp",
    author: "Cerian",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:SabanciUniversity_DormView.jpg",
    kind: "campus",
  },
  "ukurova-university": {
    src: "/assets/university-campus/ukurova-university.webp",
    author: "Zeynel Cebeci",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Main_Refectory_Building,_%C3%87ukurova_University_03.jpg",
    kind: "campus",
  },
  "karadeniz-technical-university": {
    src: "/assets/university-campus/karadeniz-technical-university.webp",
    author: "MirkoS18",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Karadeniz_Teknik_%C3%9Cniversitesi_02_%D0%A2%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%BA%D0%B8_%D1%83%D0%BD%D0%B8%D0%B2%D0%B5%D1%80%D0%B7%D0%B8%D1%82%D0%B5%D1%82_%D0%BD%D0%B0_%D0%A6%D1%80%D0%BD%D0%BE%D0%BC_%D0%BC%D0%BE%D1%80%D1%83.jpg",
    kind: "campus",
  },
  "bo-azi-i-university": {
    src: "/assets/university-campus/bo-azi-i-university.webp",
    author: "Denizmiş",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Bo%C4%9Fazi%C3%A7i_University_North_Campus_Pyramid_at_Night.jpg",
    kind: "campus",
  },
  "istanbul-university": {
    src: "/assets/university-campus/istanbul-university.webp",
    author: "Dosseman",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Istanbul_University_Architecture_Faculty_Decan%27s_offices_3767.jpg",
    kind: "campus",
  },
  "marmara-university": {
    src: "/assets/city-photos/istanbul.webp",
    author: "Hunanuk",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Historical_peninsula_and_modern_skyline_of_Istanbul.jpg",
    kind: "city",
    city: "Istanbul",
  },
  "y-ld-z-technical-university": {
    src: "/assets/university-campus/y-ld-z-technical-university.webp",
    author: "Chapultepec",
    licence: "Public domain",
    licenceUrl: "",
    source: "https://commons.wikimedia.org/wiki/File:Y%C4%B1ld%C4%B1z_Technical_University_in_Istanbul,_lower_entrance.jpg",
    kind: "campus",
  },
  "bah-e-ehir-university": {
    src: "/assets/university-campus/bah-e-ehir-university.webp",
    author: "Nevit Dilmen (talk)",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Bahcesehir_University_conferance_hall_3959.jpg",
    kind: "campus",
  },
  "istanbul-bilgi-university": {
    src: "/assets/university-campus/istanbul-bilgi-university.webp",
    author: "Kurmanbek",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Istanbul_Bilgi_University_Ku%C5%9Ftepe_campus.jpg",
    kind: "campus",
  },
  "zye-in-university": {
    src: "/assets/university-campus/zye-in-university.webp",
    author: "Bo yaser",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:%C3%96zye%C4%9Fin_University_Campus.jpg",
    kind: "campus",
  },
  "ankara-university": {
    src: "/assets/university-campus/ankara-university.webp",
    author: "Ankara University",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Ankara_%C3%9Cniversitesi_11.jpg",
    kind: "campus",
  },
  "hacettepe-university": {
    src: "/assets/university-campus/hacettepe-university.webp",
    author: "Gargarapalvin",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Hacettepe_%C3%9Cniversitesi_Beytepe_Kamp%C3%BCs%C3%BC_-_Hacettepe_University_Beytepe_Campus_(10.05.2023)_87.jpg",
    kind: "campus",
  },
  "gazi-university": {
    src: "/assets/university-campus/gazi-university.webp",
    author: "Ben Linus",
    licence: "CC BY 2.5",
    licenceUrl: "https://creativecommons.org/licenses/by/2.5",
    source: "https://commons.wikimedia.org/wiki/File:Basketball_courts_on_Gazi_University_Be%C5%9Fevler_campus.jpg",
    kind: "campus",
  },
  "dokuz-eyl-l-university": {
    src: "/assets/university-campus/dokuz-eyl-l-university.webp",
    author: "Samizambak",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Rectorate_Building_of_Dokuz_Eylul_University.jpg",
    kind: "campus",
  },
  "ya-ar-university": {
    src: "/assets/university-campus/ya-ar-university.webp",
    author: "ToprakM",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ya%C5%9Far_%C3%9Cniversitesi.jpg",
    kind: "campus",
  },
  "uluda-university": {
    src: "/assets/city-photos/bursa.webp",
    author: "Metuboy",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Bursa_image.jpg",
    kind: "city",
    city: "Bursa",
  },
  "sel-uk-university": {
    src: "/assets/university-campus/sel-uk-university.webp",
    author: "Vyildirim42",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:SEL%C3%87UKSEM_Hizmet_Binas%C4%B1.jpg",
    kind: "campus",
  },
  "anadolu-university": {
    src: "/assets/university-campus/anadolu-university.webp",
    author: "Merhabaviki",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Anadolu_%C3%9Cniversitesi_K%C3%BCt%C3%BCphanesi_binas%C4%B1.jpg",
    kind: "campus",
  },
  "erciyes-university": {
    src: "/assets/university-campus/erciyes-university.webp",
    author: "brandmaster07",
    licence: "CC BY 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Erciyes_Universitesi_Bridge_-_panoramio.jpg",
    kind: "campus",
  },
  "ondokuz-may-s-university": {
    src: "/assets/university-campus/ondokuz-may-s-university.webp",
    author: "Chidgk1",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Electric_bus_passes_mosque_at_19_May%C4%B1s_%C3%9Cniversitesi_(_OM%C3%9C_),_Atakum,_T%C3%BCrkiye.jpeg",
    kind: "campus",
  },
  "mersin-university": {
    src: "/assets/university-campus/mersin-university.webp",
    author: "Cobija",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Mersin_%C3%9Cniversitesi_giri%C5%9F_kap%C4%B1s%C4%B1.jpg",
    kind: "campus",
  },
  "dicle-university": {
    src: "/assets/university-campus/dicle-university.webp",
    author: "Sralp2",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Dicle_%C3%9Cniversitesi_Kamp%C3%BCs%C3%BC.jpg",
    kind: "campus",
  },
  "i-n-n-university": {
    src: "/assets/city-photos/malatya.webp",
    author: "Zeynel Cebeci",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Mosque,_Malatya_02.jpg",
    kind: "city",
    city: "Malatya",
  },
  "van-y-z-nc-y-l-university": {
    src: "/assets/city-photos/van.webp",
    author: "EvgenyGenkin",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:City_of_Van_(view_from_Van_Kalesi).jpg",
    kind: "city",
    city: "Van",
  },
  "trakya-university": {
    src: "/assets/university-campus/trakya-university.webp",
    author: "Hamdigumus",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Karaa%C4%9Fa%C3%A7_Tren_%C4%B0stasyonu,_Trakya_%C3%9Cniversitesi_Karaa%C4%9Fa%C3%A7_Yerle%C5%9Fkesi_2015.jpg",
    kind: "campus",
  },
  "pamukkale-university": {
    src: "/assets/university-campus/pamukkale-university.webp",
    author: "Grozdovaa",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Winter_in_Pamukkale_University.jpg",
    kind: "campus",
  },
  "sakarya-university": {
    src: "/assets/university-campus/sakarya-university.webp",
    author: "Kurmanbek",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Main_gate_of_Sakarya_University_(3).jpg",
    kind: "campus",
  },
  "s-leyman-demirel-university": {
    src: "/assets/city-photos/isparta.webp",
    author: "Isparta at Turkish Wikipedia",
    licence: "Public domain",
    licenceUrl: "",
    source: "https://commons.wikimedia.org/wiki/File:DaglardanIsparta.jpg",
    kind: "city",
    city: "Isparta",
  },
  "adnan-menderes-university": {
    src: "/assets/university-campus/adnan-menderes-university.webp",
    author: "Zeynel Cebeci",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Central_Library,_Adnan_Menderes_University.jpg",
    kind: "campus",
  },
  "mu-la-s-tk-ko-man-university": {
    src: "/assets/university-campus/mu-la-s-tk-ko-man-university.webp",
    author: "Gargarapalvin",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Mu%C4%9Fla_S%C4%B1tk%C4%B1_Ko%C3%A7man_%C3%9Cniversitesi_K%C3%B6tekli_Kamp%C3%BCs%C3%BC,_2021_01.jpg",
    kind: "campus",
  },
  "harran-university": {
    src: "/assets/city-photos/sanliurfa.webp",
    author: "Bernard Gagnon",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Balikli_G%C3%B6l_03.jpg",
    kind: "city",
    city: "Şanlıurfa",
  },
  "gaziantep-university": {
    src: "/assets/city-photos/gaziantep.webp",
    author: "Emz12",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Gaziantepskyline.jpg",
    kind: "city",
    city: "Gaziantep",
  },
  "atat-rk-university": {
    src: "/assets/university-campus/atat-rk-university.webp",
    author: "Eğitmen Mahmut",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Erzurum-Atat%C3%BCrk_%C3%9Cniversitesi_Kamp%C3%BCs_giri%C5%9F.jpg",
    kind: "campus",
  },
  "anakkale-onsekiz-mart-university": {
    src: "/assets/university-campus/anakkale-onsekiz-mart-university.webp",
    author: "Zafer",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:%C3%87anakkale_Onsekiz_Mart_University_Faculty_of_Art_and_Sciences_(4).jpg",
    kind: "campus",
  },
};

/** The photograph for a university. Every university in the directory has one. */
export const universityPhoto = (slug: string): UniversityPhoto | undefined =>
  universityPhotos[slug];

/**
 * The image for a `UniversityCard`, or `undefined` to leave the card's brand gradient.
 *
 * **Campus photographs only, and that is the difference between a card and a page.** A
 * card is a bare image behind a name — it carries no caption, no credit and no room for
 * one, so a picture of İstanbul behind "Marmara University" would read as a claim that it
 * is the campus. The detail hero can show a city photograph because the city badge sits
 * directly on it and the credit line beneath says so; a card can say neither.
 *
 * The seven without a campus photograph therefore keep `--gradient-brand` and the
 * building icon, which is the design system's own empty state rather than a hole.
 */
export const universityCardImage = (slug: string): string | undefined => {
  const photo = universityPhotos[slug];
  return photo?.kind === "campus" ? photo.src : undefined;
};
