# Campus Turkey — production app

React + TypeScript + Vite. This is the buildable version of the prototype in the
project root.

```bash
npm install          # from the PROJECT ROOT, not from app/
npm run setup        # copies design tokens and brand assets into app/public
npm run dev
```

The project root is an npm workspace and `app/` is the only member, so `npm install`
belongs at the root. Running it inside `app/` also works, but `npm run setup` does not,
because it resolves paths from the root. Node 20 or newer.

Optional: `cp .env.example .env` and fill in the translation endpoint and WhatsApp
number. The app runs without it; those two features are simply inert.

`src/styles/tokens.css` imports the token files rather than restating their values, so
the app and the design system cannot drift apart.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check, then production build |
| `npm run preview` | Serve the built output locally |
| `npm run typecheck` | Types only, no emit |
| `npm test` | Vitest |

## Architecture

```
src/
  app/          Router and shell. Route table, page transition, scroll reset.
  components/   Shared UI: the local component kit, header, footer, error surface.
  screens/      One file per route. Lazy-loaded, so each is its own chunk.
  features/     Domain logic that is not a screen (portal withdrawals, payouts, views).
  content/      Typed content, one module per collection. The CMS boundary.
  i18n/         Locale files plus the machine fallback.
  motion/       Engine assignment, timing values, GSAP scoping.
  styles/       Token imports, component classes and layout plumbing.
```

**Content is separated from presentation.** `content/types.ts` holds the shapes;
screens read from them and never from loose objects. Swapping in a CMS or an API means
changing the loaders in `content/`, not the screens. Those same types are the contracts
that cross into the backend — declare them once here and import them server-side.

**The component kit is local.** The design system in `_ds/` is a UMD bundle that expects
browser globals and cannot be imported by a bundler, so `components/ui.tsx`,
`components/sections.tsx` and `components/forms.tsx` are the local equivalents. They
consume tokens and the `ct-*` classes in `styles/base.css`; nothing in them hard-codes a
colour, a radius or a duration.

**Interactive state lives in CSS.** Hover and focus come from `:hover` and
`:focus-visible`, not from React state. A `useState` per button re-renders a screen on
mouse move; a CSS rule costs nothing and works before hydration.

**Every screen is code-split.** The initial bundle carries the shell, the router and
one screen. `manualChunks` in `vite.config.ts` additionally pulls motion and the map
into their own chunks, since both are heavy and neither is needed on first paint.

## Motion

Two engines, split by what each is good at rather than by preference:

- **Framer Motion** owns component state — mount and unmount, layout, drawers, sheets,
  presence. Anything React re-renders.
- **GSAP with ScrollTrigger** owns scroll-driven and timeline work — section reveals,
  counters, sequenced hero copy. Anything tied to scroll position.

Import from `src/motion/`, not from the libraries directly, so the engine choice stays
reviewable in one place. One easing curve, `cubic-bezier(.16,1,.3,1)`, is used
everywhere; a single curve across a product is what makes motion feel authored rather
than assembled.

Two rules that are easy to get wrong and expensive to debug:

1. **Scope every GSAP call and revert it.** `useGsap()` does this. Without it,
   ScrollTriggers accumulate on each route change until scrolling is visibly janky,
   and the cause is very hard to trace.
2. **The page transition animates transform only, never opacity.** Animating opacity
   means the computed value is 0 at frame 0, so anything that restarts the animation
   without running it — a backgrounded tab, a DOM clone built for a screenshot —
   renders the page invisible. This exact bug shipped in the prototype.

`prefersReducedMotion()` returns the final state immediately rather than a shortened
animation. The request is for no motion, not for faster motion.

## Screens

All fourteen routes are ported from the prototype. The route table is `app/screens.tsx`
and routing is hash-based via `app/router.ts`; the directory screen is
`screens/Universities.tsx` and every error state lives in `screens/Errors.tsx`.
`screens/Home.tsx` is the reference
when changing a shared pattern: it exercises the GSAP hero timeline, Framer reveals, a
staggered grid, count-up statistics and the CTA hierarchy in one file.

Three deliberate departures from the prototype, each of which fixed a real defect:

- **Unknown slugs render the not-found screen.** The prototype fell back to the first
  record, which served the wrong page for a stale link. `Service`, `Institution`,
  `UniversityDetail` and `Article` all render `ErrorScreen` from `screens/Errors.tsx`
  instead. Note that this is a *client-side* not-found: routing here is hash-based, so
  the HTTP status is still 200. A real 404 arrives with the Next.js migration — see
  `../web/docs/MIGRATION.md`.
- **Forms validate.** The design system's `Field` never forwarded `required` to the
  control it labelled, so nothing in the prototype validated; the prototype HTML
  monkey-patched it back at runtime. `components/forms.tsx` uses real inputs.
- **Anchors use `scroll-margin-top`.** The prototype subtracted a magic 116px in a
  scroll handler, so a pasted `#partner-form` link landed under the navbar.

**University slugs do not transliterate.** `slugify` in `content/universities.ts` is the
prototype's rule character for character: lowercase, then everything outside `a-z0-9`
becomes a hyphen. Turkish letters are not in `a-z`, so `Boğaziçi University` becomes
`bo-azi-i-university`, not `bogazici-university`. That is a genuine flaw, and it is
kept on purpose — these are the addresses the prototype publishes, and changing the rule
silently breaks every link already shared. Improve it later by transliterating before
the filter and redirecting the old slugs to the new ones.

## What is deliberately not here

- **Photography.** Every image frame carries a `data-slot` name describing what belongs
  there. Testimonials run as text: a portrait needs a signed release from the person
  named.
- **A backend — now built, in `../web/`.** `features/portal/*.ts` call `/api/...` routes
  that this workspace does not serve. Those endpoints now exist in the Next.js
  application next door: the server-side balance check, the idempotency key and the
  vaulted payout details are all implemented and the money path is at 100% test
  coverage. What remains is connecting these screens to them, which happens during the
  migration — see `../web/docs/MIGRATION.md`.
- **Authentication.** `/portal` signs in by navigating. Better Auth is configured in
  `../web/server/lib/auth.ts`; this shell still needs the route guard. Until then the
  portal here is a demo of the surface, not a protected area.
- **Form submission.** Apply, Contact and the partner forms advance their own state.
  `POST /api/leads` now exists and handles all five form kinds with a captcha, a rate
  limit, consent capture and a retention window. These screens do not call it yet — and
  a contact form that silently drops messages is worse than none, because the visitor
  believes they reached you.
- **Translation beyond English.** `i18n/` has the loader, the 17-language list, the RTL
  directions and the protected-terms rule, but only `locales/en.json`, and the screens
  do not call `t()` yet. The prototype's phrase book is at `../site/i18n.js`.
- **Analytics and error tracking.** Wire your own; `ErrorScreen` already surfaces the
  thrown message in development only.

Read `../Developer handoff notes.md` before starting. It has thirteen items, and the
first four are blockers.
