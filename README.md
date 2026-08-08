# Campus Turkey — website prototype

A working, clickable prototype of the Campus Turkey site: 26 screens, a partner
portal, a filterable university directory on a real map, and 17 languages.

## Three things live in this project

**`Campus Turkey Website.html`** — the prototype. Open it in a browser, no build. This
is the original reference for how every screen looks and behaves.

**`app/`** — the frontend. React, TypeScript, Vite. Every screen and all the content are
ported from the prototype; `npm run build` passes. Routing here is still hash-based.

**`web/`** — the server. Next.js, PostgreSQL, Prisma, Better Auth. Ten API routes, the
schema and its integrity migration, authentication, security headers, a real HTTP 404,
sitemap and structured data. Start at [`web/README.md`](web/README.md); the engineering
report and the Production Audit are in
[`web/docs/ENGINEERING.md`](web/docs/ENGINEERING.md).

The two halves are joined at the typed contracts in `app/src/content/types.ts`, which
the server imports rather than restates. Merging them into one deployable is the
remaining step, sequenced in [`web/docs/MIGRATION.md`](web/docs/MIGRATION.md).

```bash
npm install          # from the project root
npm run setup        # copies design tokens and brand assets into app/public
npm run dev
```

Run all three from the **project root**, not from `app/`. The root is an npm workspace,
so `npm install` there installs the app's dependencies. Node 20 or newer.

Read `app/README.md` next. It has the architecture, the motion rules and the recipe for
porting the remaining screens out of the prototype.

## Running the prototype

Open `Campus Turkey Website.html` in a browser. No build step and no install. It
needs an internet connection for React, the icon set, the fonts and the map tiles.

## What is in here

```
Campus Turkey Website.html    Shell: routing, navigation, footer, mobile nav, i18n wiring
site/
  data.js                     All content. Every screen reads from this one file.
  i18n.js                     Phrase book plus machine-translation fallback, 17 languages
  Common.jsx                  Brand mark, WhatsApp action, image frames
  Home.jsx                    Homepage
  Directory.jsx               University directory and university detail
  Study.jsx                   Study in Türkiye, and the four service pages
  Pages.jsx                   Partner registration, representative, institution pages
  Company.jsx                 About, contact, resources, blog post
  Errors.jsx                  Error states: 404, load failure, offline, maintenance, session expired
  Apply.jsx                   Student application, partner login and registration
  Portal.jsx                  Partner portal: students, commissions, payouts, account
assets/                       Brand artwork and the map base image
_ds/                          Campus Turkey design system (tokens, components, fonts)
screens/
  pages/                      One PNG per page, in navigation order
  components/                 Menus, sheets, mobile navigation, RTL layout
Developer handoff notes.md    Read this before porting. 12 items, 3 are blockers.
```

## Architecture

Content is separated from presentation. `site/data.js` holds every university,
service, article, FAQ and portal record; the screens are presentational and read from
it. Swapping in a CMS or an API means replacing that one file's shape, not rewriting
components.

Routing is hash-based (`#/study`, `#/university/itu`). Each route is wrapped in an
error boundary, so a failure in one screen shows a recoverable panel rather than
blanking the page. Unknown addresses render a real not-found screen, a dropped
connection swaps in the offline screen wherever the visitor is, and every error state
is reachable at `#/error/<state>` for review.

Every visual decision comes from the design system in `_ds/`. Colours, type, spacing
and components are tokens, not literals.

## Known limits

Three things must change in the **prototype** before it serves real users: the
translation layer calls a public endpoint with no key, withdrawals are approved
client-side, and payout details are held in browser state. All three are specified in
`Developer handoff notes.md` with what breaks if they are skipped.

**All three are now resolved on the server.** `web/` has a keyed translation proxy, a
server-authoritative withdrawal that recomputes the balance inside the transaction that
writes it, and a payout flow that stores only an opaque provider token and a masked
label. The money path is at 100% test coverage.

What remains is connecting them: the screens in `app/` do not call these endpoints yet,
and routing there is still hash-based. The Production Audit returned **REQUIRES
IMPROVEMENT** — no Blockers, but three open Major issues in testing and operations,
listed in [`web/docs/ENGINEERING.md`](web/docs/ENGINEERING.md) §10.

Photography is not included. Every image frame carries a `data-slot` name and a label
describing what belongs there.

University logos need written permission from each university. Testimonial portraits
need a signed release from the person named, or the quote should run as text only.
