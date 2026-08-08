# Migration: Vite + hash routing → Next.js + real routes

## Where this stands

**Done — the server half.** `web/` is a working Next.js application: nine API endpoints,
the schema and its integrity migration, auth, the security headers, a real 404, the
sitemap, robots, structured data, and the edge maintenance response. `tsc --noEmit`
passes, 165 tests pass, `prisma generate` validates the schema.

**Not done — the screen half.** The seventeen screens in `app/src/screens/` still render
under the Vite shell and still navigate by `location.hash`. Nothing in `app/` has been
moved, renamed or broken: it builds and its tests pass exactly as before.

That split is deliberate. Moving `app/src` and rewriting the URL layer across seventeen
screens is a large mechanical change that cannot be verified without running the result,
and leaving the repository in a state where neither the old app nor the new one works
would be worse than either. The steps below are ordered so that each one is verifiable
on its own.

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

And delete `outputFileTracingRoot` from `next.config.mjs` — it exists only to let Next
compile files from outside its root during this transition.

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

| Route | Screen | Notes |
|---|---|---|
| `/` | `Home` | |
| `/study` | `Study` | |
| `/universities` | `Universities` | filters move to `searchParams` |
| `/universities/[slug]` | `UniversityDetail` | `generateStaticParams`, JSON-LD |
| `/services/[slug]` | `Service` | JSON-LD, FAQ schema |
| `/apply` | `Apply` | posts to `/api/leads` |
| `/partners` | `Partners` | |
| `/representative` | `Representative` | |
| `/institutions/[slug]` | `Institution` | |
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
`location.hash` on first paint and `history.replaceState`s to the real path. The
server-side `redirects()` in `next.config.mjs` already handle the singular→plural drift
(`/university/:slug` → `/universities/:slug`).

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
