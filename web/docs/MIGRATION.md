# Migration: Vite + hash routing → Next.js + real routes

## Where this stands

**Done — the server half.** `web/` is a working Next.js application: the API surface,
the schema and its migrations, auth, the security headers, a real 404, the sitemap,
robots, structured data, and the edge maintenance response.

**Done — the screen half.** Steps 1–5 below are applied. The screens live in `web/src/`,
`src/app/router.ts` navigates through the Next.js router rather than `location.hash`, and
every route in the table has a `page.tsx`. `tsc --noEmit` passes and the suite is green.

**Done — step 6, the cutover.** `app/` is deleted. The root package is no longer a
workspace, its scripts point at `web/`, and CI no longer builds a Vite application that
does not exist. The revert is one `git revert` of that commit, which is why it is its
own.

**Still to do, and it needs a deployment:** the preview walk in step 6 below. Every
route is covered by a test and by the build, but nobody has loaded this site in a
browser. Two things in particular can only be checked there — that `/no-such-page`
answers a real 404, and that `/ds/_ds_bundle.js` answers 200 rather than 404. The
second is new to this document and is the more dangerous of the two; see
[DEPLOYMENT.md](DEPLOYMENT.md), "Design system assets".

The steps below are ordered so that each one is verifiable on its own, and are kept in
the past tense of a plan rather than rewritten as a description — the reasoning is why
each was done the way it was.

## Why the URL layer had to change at all

Two handoff notes made it unavoidable, and they are the two the client pays for:

- **Note 6 (blocker).** Hash routes mean every page shares one URL, one `<title>` and
  one meta description. For a business whose funnel is organic search on "study in
  Türkiye", that is the most expensive omission in the document.
- **Note 12.** A real HTTP 404 is required. A hash-routed SPA physically cannot return
  one — every address resolves to the same 200 — so no amount of client-side error
  handling substitutes.

Everything visual is preserved. Only the URL layer changes.

## Steps

### 1. Move `app/src` → `web/src`

```bash
git mv app/src web/src
git mv app/public/* web/public/
```

Then in `web/tsconfig.json`, change one line:

```diff
- "@contracts/*": ["../app/src/content/*"]
+ "@contracts/*": ["./src/content/*"]
```

`outputFileTracingRoot` stays, but its reason changes. It existed to let Next compile
files from outside its root during the transition; it is kept because `web/` has its own
lockfile, and without it Next walks up, finds the root workspace lockfile as well, and
traces the wrong files into the deployment bundle.

**Verify:** `npx tsc --noEmit` still passes.

### 2. Replace the router

Delete `src/app/router.ts` (hash routing) and `src/app/router.tsx` (dead — see the note
at the end). Next's file-system router replaces both.

Create one `page.tsx` per route under `web/app/`, each a thin server component that sets
metadata and renders the existing screen:

```tsx
// web/app/universities/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getUniversity } from "@/src/content/universities";
import { pageMetadata, universityJsonLd, jsonLdScript } from "@/server/lib/seo";
import UniversityDetail from "@/src/screens/UniversityDetail";

export function generateStaticParams() {
  return universities.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const university = getUniversity(slug);
  if (!university) return {};
  return pageMetadata({
    title: `${university.name} — ${university.city}`,
    description: university.about.slice(0, 155),
    path: `/universities/${university.slug}`,
  });
}

export default async function Page({ params }) {
  const { slug } = await params;
  const university = getUniversity(slug);
  // The 404 that hash routing could not produce.
  if (!university) notFound();

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(universityJsonLd(university)) }} />
      <UniversityDetail university={university} />
    </>
  );
}
```

The route table to reproduce, from `src/app/screens.tsx`:

Paths below are current. Where one differs from the prototype's, the old address 308s to
it in every locale — see `src/app/moved-routes.ts`, which is the one list those redirects,
the sitemap and `moved-routes.test.ts` all read.

| Route | Screen | Notes |
|---|---|---|
| `/` | `Home` | |
| `/study-in-turkiye` | `Study` | was `/study` |
| `/study-in-turkiye/scholarships` | `study/Scholarships` | |
| `/study-in-turkiye/application-process` | `study/ApplicationProcess` | |
| `/study-in-turkiye/student-life` | `study/StudentLife` | |
| `/universities` | `Universities` | filters move to `searchParams` |
| `/universities/[slug]` | `UniversityDetail` | `generateStaticParams`, JSON-LD |
| `/services` | `Services` | added; the address was a 404 |
| `/services/[slug]` | `Service` | JSON-LD, FAQ schema |
| `/apply` | `Apply` | posts to `/api/leads` |
| `/partnerships` | `Partnerships` | added; the hub over the three tracks |
| `/partnerships/agents` | `Partners` | was `/partners` |
| `/partnerships/representatives` | `Representative` | was `/representative` |
| `/partnerships/universities` | `Institution` | was `/institutions/universities`; excluded from that route's `generateStaticParams` so it is not served twice |
| `/institutions/[slug]` | `Institution` | agencies, hospitals, chambers. No index page — the three are reached from the nav |
| `/about` | `About` | |
| `/contact` | `Contact` | posts to `/api/leads` |
| `/resources` | `Resources` | |
| `/resources/[slug]` | `Article` | JSON-LD |
| `/portal/*` | `Portal` | `noindex`, auth-gated |

### 3. Rewrite the link layer

Mechanical, and the only step that touches every screen:

- `go("study")` → `router.push("/study")` from `next/navigation`
- `href="#/study"` → `<Link href="/study">`
- `useRoute()` → `usePathname()` / `useParams()`
- `usePlaceholderLinks()` — delete. It exists to map the design system's placeholder
  `#consultation`-style hrefs onto hash routes; with real routes the mapping belongs in
  the props passed to `Navbar` and `Footer`.

**The old addresses.** A hash never reaches the server, so `#/study` cannot be
redirected server-side. Add a client-side rewrite in the root layout that reads
`location.hash` on first paint and `history.replaceState`s to the real path.

Everything that *can* be redirected server-side is in `src/app/moved-routes.ts`, which
`redirects()` in `next.config.ts` reads. Each entry is emitted twice: unprefixed for
English and as `/:locale/...` for the other sixteen. The locale half is not optional — it
was missing at first, and an Arabic visitor following `/ar/university/itu` got a 404 while
the English form redirected correctly. Sixteen languages of broken inbound links,
invisible from an English browser.

The config is TypeScript rather than `.mjs` for exactly this: a `.mjs` config cannot
import the table, and keeping the same list in two files is how one copy gets edited.

**Check the slugs before deploying.** `slugify` does not transliterate: `Boğaziçi
University` becomes `bo-azi-i-university`, not `bogazici-university`. Those are the
published addresses. Improve them later behind 301s — never by changing the rule.

### 4. Guard the portal

```tsx
// web/app/portal/layout.tsx
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) redirect("/partner-login");
```

If you add `?returnTo=`, **reject any target that does not start with a single `/`**.
Handoff note 14 flags exactly that advisory class — `//evil.com` and
`https://evil.com` both start with something that looks like a path.

### 5. Client components

Anything using `useState`, `useEffect`, GSAP or Framer Motion needs `"use client"`. The
design system loader in `src/ds/load.ts` reads a global `React` and must not run on the
server: keep it client-only, render the shell server-side, hydrate when it resolves. The
boot screen in `index.html` already covers that window.

### 6. Cut over

1. Deploy `web/` to a preview URL. Walk all fourteen routes.
2. Confirm `curl -o /dev/null -w '%{http_code}' <preview>/no-such-page` returns **404**.
3. Confirm `view-source:` shows a distinct `<title>` per route — if the title is only in
   the hydrated DOM, step 2 of this document has not actually worked.
4. Point the domain at `web/`. Delete `app/` in a **separate** commit, so the revert is
   one `git revert`.

## The dead file

`app/src/app/router.tsx` imports `./Shell`, `@/components/ErrorScreen`,
`@/screens/Directory` and `@/screens/ErrorPreview`. **None of these exist.** It passes
`tsc` because `router.ts` and `router.tsx` share a basename, and TypeScript's
extension-priority rule silently drops the `.tsx` from the program.

It is a leftover from an earlier iteration. Delete it in step 2 — but note that if
anyone deletes `router.ts` first, the build breaks with four missing modules and no
obvious cause.
