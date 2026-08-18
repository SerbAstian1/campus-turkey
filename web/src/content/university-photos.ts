/**
 * The picture at the top of every university page, with the attribution its licence
 * requires — and an honest label for what it actually shows.
 *
 * **Two kinds, and the distinction is the point.** Eighteen universities have a `campus`
 * photograph: a freely licensed image of that institution's own grounds or buildings. The
 * other twenty-two have a `city` photograph instead — Pamukkale's travertines for
 * Pamukkale University, Balıklıgöl for Harran, the Kordon for the two in İzmir. A city
 * picture is never captioned as a campus. `UniversityDetail` renders it as "İzmir, where
 * Ege University is based", because a photograph on a recruitment page is evidence, and a
 * pretty building that is not the university's would be a lie told to someone choosing
 * where to move.
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
    src: "/assets/city-photos/istanbul.webp",
    author: "Hunanuk",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Historical_peninsula_and_modern_skyline_of_Istanbul.jpg",
    kind: "city",
    city: "Istanbul",
  },
  "middle-east-technical-university": {
    src: "/assets/city-photos/ankara.webp",
    author: "ekrem osmanoglu",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Ahmet_Hamdi_Akseki_Mosque,_Ankara_02.jpg",
    kind: "city",
    city: "Ankara",
  },
  "bilkent-university": {
    src: "/assets/city-photos/ankara.webp",
    author: "ekrem osmanoglu",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Ahmet_Hamdi_Akseki_Mosque,_Ankara_02.jpg",
    kind: "city",
    city: "Ankara",
  },
  "ege-university": {
    src: "/assets/city-photos/izmir.webp",
    author: "Dosseman",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Izmir_Alsancak_Kordon_2617.jpg",
    kind: "city",
    city: "Izmir",
  },
  "ko-university": {
    src: "/assets/city-photos/istanbul.webp",
    author: "Hunanuk",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Historical_peninsula_and_modern_skyline_of_Istanbul.jpg",
    kind: "city",
    city: "Istanbul",
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
    src: "/assets/city-photos/ankara.webp",
    author: "ekrem osmanoglu",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Ahmet_Hamdi_Akseki_Mosque,_Ankara_02.jpg",
    kind: "city",
    city: "Ankara",
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
    src: "/assets/city-photos/izmir.webp",
    author: "Dosseman",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Izmir_Alsancak_Kordon_2617.jpg",
    kind: "city",
    city: "Izmir",
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
    src: "/assets/city-photos/mersin.webp",
    author: "Mersin Page",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Mersin-tekneler.jpg",
    kind: "city",
    city: "Mersin",
  },
  "dicle-university": {
    src: "/assets/city-photos/diyarbakir.webp",
    author: "ArdviAnahlta",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Amed_-_Diyarbak%C4%B1r_historical_ten-eyed_bridge_05.jpg",
    kind: "city",
    city: "Diyarbakır",
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
    src: "/assets/city-photos/denizli.webp",
    author: "Juicybear213",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Pamukkale_Traventines,_Turkey.jpg",
    kind: "city",
    city: "Denizli",
  },
  "sakarya-university": {
    src: "/assets/city-photos/sakarya.webp",
    author: "A.Savin",
    licence: "FAL",
    licenceUrl: "http://artlibre.org/licence/lal/en",
    source: "https://commons.wikimedia.org/wiki/File:TR_Sakarya_asv2021-10_img21_Urban_Park.jpg",
    kind: "city",
    city: "Sakarya",
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
    src: "/assets/city-photos/aydin.webp",
    author: "CeeGee",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:MonumentAyd%C4%B1n_(3).JPG",
    kind: "city",
    city: "Aydın",
  },
  "mu-la-s-tk-ko-man-university": {
    src: "/assets/city-photos/mugla.webp",
    author: "Dosseman",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Mu%C4%9Fla_General_street_view_in_2015_4239.jpg",
    kind: "city",
    city: "Muğla",
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
    src: "/assets/city-photos/erzurum.webp",
    author: "Zeynel Cebeci",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Erzurum_Citadel_-_Erzurum_Kalesi_01.jpg",
    kind: "city",
    city: "Erzurum",
  },
  "anakkale-onsekiz-mart-university": {
    src: "/assets/city-photos/canakkale.webp",
    author: "Webturkey",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:%C3%87anakkale_Liman%C4%B1.jpg",
    kind: "city",
    city: "Çanakkale",
  },
};

/** The photograph for a university. Every university in the directory has one. */
export const universityPhoto = (slug: string): UniversityPhoto | undefined =>
  universityPhotos[slug];
