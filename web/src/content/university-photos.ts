/**
 * Campus photographs, by university slug, with the attribution their licences require.
 *
 * **Only the university's own grounds. Never a stand-in.** An earlier version filled the
 * gaps with a photograph of the city each university sits in, captioned as such. That is
 * gone at the client's request, and the request was right: on a recruitment page the
 * picture is evidence, and a reader deciding where to move should not have to read a
 * caption to learn that the building above it is not the place they are looking at.
 *
 * Thirty-seven of forty. The three without — Harran, Van Yüzüncü Yıl and Süleyman
 * Demirel — have no freely licensed photograph of their campus that could be verified as
 * theirs, and they render the reserved frame rather than a substitute. Every near miss
 * was rejected by looking at it:
 *
 *   - "Harran Üniversitesi Panorama" and "Harran Üniversitesi Kalıntıları" are both the
 *     ruins of the *ancient* Harran university, a thousand years older than the campus.
 *   - Van's only candidate is a lecture theatre full of identifiable students.
 *   - Süleyman Demirel's is a glass campus captioned "SDU … Smart campus" with
 *     English-only signage and no category placing it in Isparta. There is a Suleyman
 *     Demirel University in Kazakhstan; Wikidata attributes the file to the Turkish one
 *     and may be right, but "may be right" is not a standard to publish a foreign
 *     university's building under.
 *
 * The same eye caught a Japanese university returned for Koç, an American graduation
 * ceremony offered as Turkish campus life, and a photograph of The Hague shortlisted for
 * Van because the Dutch word "vanaf" contains the city's name. Filename heuristics rank a
 * plausible wrong answer exactly as confidently as a right one.
 *
 * **The attribution is not decorative.** CC BY, CC BY-SA and the Free Art Licence grant
 * use only on condition that the author and licence are stated; publishing without the
 * credit ends the permission the image is published under. Public-domain and CC0 entries
 * impose no such condition and are credited anyway, because one uniform line beats two
 * rules. Share-alike binds the image rather than this codebase: a resized WEBP crop is a
 * derivative and stays under its own licence, which is what shipping the credit does.
 */
export interface UniversityPhoto {
  readonly src: string;
  readonly author: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly source: string;
}

export const universityPhotos: Readonly<Record<string, UniversityPhoto>> = {
  "istanbul-technical-university": {
    src: "/assets/university-campus/istanbul-technical-university.webp",
    author: "Dikk\u00fclah",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Teknokent_Gate,_Istanbul_Technical_University_Ayazaga_Campus.jpg",
  },
  "middle-east-technical-university": {
    src: "/assets/university-campus/middle-east-technical-university.webp",
    author: "Foora",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:METU_Campus.jpg",
  },
  "bilkent-university": {
    src: "/assets/university-campus/bilkent-university.webp",
    author: "collage bird's eye v\u2026",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Bilkent_University_-_panoramio.jpg",
  },
  "ege-university": {
    src: "/assets/university-campus/ege-university.webp",
    author: "Ayratayrat",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ege_%C3%BCniversitesi_kamp%C3%BCs_i%C3%A7inde.jpg",
  },
  "ko-university": {
    src: "/assets/university-campus/ko-university.webp",
    author: "Khutuck",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Ko%C3%A7_%C3%9Cniversitesi_Ana_Kamp%C3%BCs_Bilim_Kap%C4%B1s%C4%B1.JPG",
  },
  "akdeniz-university": {
    src: "/assets/university-campus/akdeniz-university.webp",
    author: "AntalyasporFC",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Akdeniz%C3%9CniversiteStadyumu1.jpg",
  },
  "sabanc-university": {
    src: "/assets/university-campus/sabanc-university.webp",
    author: "Cerian",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:SabanciUniversity_DormView.jpg",
  },
  "ukurova-university": {
    src: "/assets/university-campus/ukurova-university.webp",
    author: "Zeynel Cebeci",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Main_Refectory_Building,_%C3%87ukurova_University_03.jpg",
  },
  "karadeniz-technical-university": {
    src: "/assets/university-campus/karadeniz-technical-university.webp",
    author: "MirkoS18",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Karadeniz_Teknik_%C3%9Cniversitesi_02_%D0%A2%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%BA%D0%B8_%D1%83%D0%BD%D0%B8%D0%B2%D0%B5%D1%80%D0%B7%D0%B8%D1%82%D0%B5%D1%82_%D0%BD%D0%B0_%D0%A6%D1%80%D0%BD%D0%BE%D0%BC_%D0%BC%D0%BE%D1%80%D1%83.jpg",
  },
  "bo-azi-i-university": {
    src: "/assets/university-campus/bo-azi-i-university.webp",
    author: "Denizmi\u015f",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Bo%C4%9Fazi%C3%A7i_University_North_Campus_Pyramid_at_Night.jpg",
  },
  "istanbul-university": {
    src: "/assets/university-campus/istanbul-university.webp",
    author: "Dosseman",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Istanbul_University_Architecture_Faculty_Decan%27s_offices_3767.jpg",
  },
  "marmara-university": {
    src: "/assets/university-campus/marmara-university.webp",
    author: "Anilyilmaz",
    licence: "CC BY 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0",
    source: "https://commons.wikimedia.org/wiki/File:MarmaraUni.jpg",
  },
  "y-ld-z-technical-university": {
    src: "/assets/university-campus/y-ld-z-technical-university.webp",
    author: "Chapultepec",
    licence: "Public domain",
    licenceUrl: "",
    source: "https://commons.wikimedia.org/wiki/File:Y%C4%B1ld%C4%B1z_Technical_University_in_Istanbul,_lower_entrance.jpg",
  },
  "bah-e-ehir-university": {
    src: "/assets/university-campus/bah-e-ehir-university.webp",
    author: "Nevit Dilmen (talk)",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Bahcesehir_University_conferance_hall_3959.jpg",
  },
  "istanbul-bilgi-university": {
    src: "/assets/university-campus/istanbul-bilgi-university.webp",
    author: "Kurmanbek",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Istanbul_Bilgi_University_Ku%C5%9Ftepe_campus.jpg",
  },
  "zye-in-university": {
    src: "/assets/university-campus/zye-in-university.webp",
    author: "Bo yaser",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:%C3%96zye%C4%9Fin_University_Campus.jpg",
  },
  "ankara-university": {
    src: "/assets/university-campus/ankara-university.webp",
    author: "Ankara University",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Ankara_%C3%9Cniversitesi_11.jpg",
  },
  "hacettepe-university": {
    src: "/assets/university-campus/hacettepe-university.webp",
    author: "Gargarapalvin",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Hacettepe_%C3%9Cniversitesi_Beytepe_Kamp%C3%BCs%C3%BC_-_Hacettepe_University_Beytepe_Campus_(10.05.2023)_87.jpg",
  },
  "gazi-university": {
    src: "/assets/university-campus/gazi-university.webp",
    author: "Ben Linus",
    licence: "CC BY 2.5",
    licenceUrl: "https://creativecommons.org/licenses/by/2.5",
    source: "https://commons.wikimedia.org/wiki/File:Basketball_courts_on_Gazi_University_Be%C5%9Fevler_campus.jpg",
  },
  "dokuz-eyl-l-university": {
    src: "/assets/university-campus/dokuz-eyl-l-university.webp",
    author: "Samizambak",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Rectorate_Building_of_Dokuz_Eylul_University.jpg",
  },
  "ya-ar-university": {
    src: "/assets/university-campus/ya-ar-university.webp",
    author: "ToprakM",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ya%C5%9Far_%C3%9Cniversitesi.jpg",
  },
  "uluda-university": {
    src: "/assets/university-campus/uluda-university.webp",
    author: "Ollios",
    licence: "CC BY 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Mimarl%C4%B1k_Fak%C3%BCltesi.jpg",
  },
  "sel-uk-university": {
    src: "/assets/university-campus/sel-uk-university.webp",
    author: "Vyildirim42",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:SEL%C3%87UKSEM_Hizmet_Binas%C4%B1.jpg",
  },
  "anadolu-university": {
    src: "/assets/university-campus/anadolu-university.webp",
    author: "Merhabaviki",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Anadolu_%C3%9Cniversitesi_K%C3%BCt%C3%BCphanesi_binas%C4%B1.jpg",
  },
  "erciyes-university": {
    src: "/assets/university-campus/erciyes-university.webp",
    author: "brandmaster07",
    licence: "CC BY 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Erciyes_Universitesi_Bridge_-_panoramio.jpg",
  },
  "ondokuz-may-s-university": {
    src: "/assets/university-campus/ondokuz-may-s-university.webp",
    author: "Chidgk1",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Electric_bus_passes_mosque_at_19_May%C4%B1s_%C3%9Cniversitesi_(_OM%C3%9C_),_Atakum,_T%C3%BCrkiye.jpeg",
  },
  "mersin-university": {
    src: "/assets/university-campus/mersin-university.webp",
    author: "Cobija",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Mersin_%C3%9Cniversitesi_giri%C5%9F_kap%C4%B1s%C4%B1.jpg",
  },
  "dicle-university": {
    src: "/assets/university-campus/dicle-university.webp",
    author: "Sralp2",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Dicle_%C3%9Cniversitesi_Kamp%C3%BCs%C3%BC.jpg",
  },
  "i-n-n-university": {
    src: "/assets/university-campus/i-n-n-university.webp",
    author: "Inonu University",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:%C4%B0n%C3%B6n%C3%BC_University_Center_Campus.jpg",
  },
  "trakya-university": {
    src: "/assets/university-campus/trakya-university.webp",
    author: "Hamdigumus",
    licence: "CC0",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Karaa%C4%9Fa%C3%A7_Tren_%C4%B0stasyonu,_Trakya_%C3%9Cniversitesi_Karaa%C4%9Fa%C3%A7_Yerle%C5%9Fkesi_2015.jpg",
  },
  "pamukkale-university": {
    src: "/assets/university-campus/pamukkale-university.webp",
    author: "Grozdovaa",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Winter_in_Pamukkale_University.jpg",
  },
  "sakarya-university": {
    src: "/assets/university-campus/sakarya-university.webp",
    author: "Kurmanbek",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Main_gate_of_Sakarya_University_(3).jpg",
  },
  "adnan-menderes-university": {
    src: "/assets/university-campus/adnan-menderes-university.webp",
    author: "Zeynel Cebeci",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Central_Library,_Adnan_Menderes_University.jpg",
  },
  "mu-la-s-tk-ko-man-university": {
    src: "/assets/university-campus/mu-la-s-tk-ko-man-university.webp",
    author: "Gargarapalvin",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Mu%C4%9Fla_S%C4%B1tk%C4%B1_Ko%C3%A7man_%C3%9Cniversitesi_K%C3%B6tekli_Kamp%C3%BCs%C3%BC,_2021_01.jpg",
  },
  "gaziantep-university": {
    src: "/assets/university-campus/gaziantep-university.webp",
    author: "YG01",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Gaziantep_University.IMG_2033.jpg",
  },
  "atat-rk-university": {
    src: "/assets/university-campus/atat-rk-university.webp",
    author: "E\u011fitmen Mahmut",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Erzurum-Atat%C3%BCrk_%C3%9Cniversitesi_Kamp%C3%BCs_giri%C5%9F.jpg",
  },
  "anakkale-onsekiz-mart-university": {
    src: "/assets/university-campus/anakkale-onsekiz-mart-university.webp",
    author: "Zafer",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:%C3%87anakkale_Onsekiz_Mart_University_Faculty_of_Art_and_Sciences_(4).jpg",
  },
};

/** The campus photograph for a university, or `undefined` where none is verified. */
export const universityPhoto = (slug: string): UniversityPhoto | undefined =>
  universityPhotos[slug];

/**
 * The image for a `UniversityCard`. The same photograph the page uses, or nothing.
 *
 * Kept as its own function because the card's empty state differs from the page's: a card
 * with no photograph falls back to `--gradient-brand` and the design system's building
 * icon, while the page falls back to `ImagePlaceholder`'s reserved frame.
 */
export const universityCardImage = (slug: string): string | undefined =>
  universityPhotos[slug]?.src;
