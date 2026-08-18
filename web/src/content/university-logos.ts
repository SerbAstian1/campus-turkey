/**
 * University logos, by slug.
 *
 * A map rather than a convention like `/assets/university-logos/${slug}.png`, and for two
 * separate reasons.
 *
 * The first is coverage: only fourteen of the two hundred universities in the directory
 * have a logo. Under a naming convention a missing file is a broken image on the page;
 * a missing key here just leaves the reserved frame in place, which is what the marquee
 * was built to fall back to.
 *
 * The second is that **the slug is not the name**. `slugify` reduces anything outside
 * `[a-z0-9]` to a dash, and most of these are Turkish names — so Boğaziçi is
 * `bo-azi-i-university`, Yıldız is `y-ld-z-technical-university`, and Koç is
 * `ko-university`. The keys below are the slugs the router and this content actually
 * produce; the filenames stay readable, so the two differ on purpose wherever a name
 * carries a Turkish character. Deriving a path from the slug would give a filename no
 * one could recognise in a directory listing.
 *
 * **These are third-party trademarks and are not ours to use by default.** They were
 * sourced from Wikimedia Commons and from the universities' own sites, which establishes
 * what each mark looks like, not permission to put it on a commercial recruitment site.
 * `scripts/image-manifest.mjs` already records the route for photography — the
 * institution's press office — and it is the same route here: an affiliated university
 * will normally grant a recruitment partner written permission on request, and that is
 * what should back these files. Until it does, treat them as placeholders.
 *
 * Each file is an 88px square PNG with a real alpha channel, sized so the artwork sits
 * inside the marquee's 44px circular mask at 2x.
 */
export const universityLogos: Readonly<Record<string, string>> = {
  "istanbul-technical-university": "/assets/university-logos/istanbul-technical-university.png",
  "middle-east-technical-university": "/assets/university-logos/middle-east-technical-university.png",
  "bilkent-university": "/assets/university-logos/bilkent-university.png",
  "ege-university": "/assets/university-logos/ege-university.png",
  "ko-university": "/assets/university-logos/koc-university.png",
  "akdeniz-university": "/assets/university-logos/akdeniz-university.png",
  "sabanc-university": "/assets/university-logos/sabanci-university.png",
  "ukurova-university": "/assets/university-logos/cukurova-university.png",
  "karadeniz-technical-university": "/assets/university-logos/karadeniz-technical-university.png",
  "bo-azi-i-university": "/assets/university-logos/bogazici-university.png",
  "istanbul-university": "/assets/university-logos/istanbul-university.png",
  "marmara-university": "/assets/university-logos/marmara-university.png",
  "y-ld-z-technical-university": "/assets/university-logos/yildiz-technical-university.png",
  "bah-e-ehir-university": "/assets/university-logos/bahcesehir-university.png",
};

/** The logo for a university, or `undefined` where none has been sourced yet. */
export const universityLogo = (slug: string): string | undefined => universityLogos[slug];
