# Campus Turkey — production notes for the developer

The prototype at `Campus Turkey Website.html` is a working front end. Three parts of
it are deliberately shimmed, because they cannot be finished safely in a browser-only
build. Each note below says what the prototype does today, what to replace it with,
and what happens if the note is ignored.

---

## 1. Translation

**Today.** `site/i18n.js` runs two layers. A hand-checked phrase book covers
navigation and calls to action instantly. Everything else is sent to a public Google
translate endpoint on demand and cached in `localStorage` under `ct-mt2-<LANG>`.
Protected terms (brand, university names, cities, people, exam acronyms) are masked
with sentinels before the request and restored after, so they survive untranslated.

**Replace with.** A keyed provider. Point `fetchOne()` at DeepL, Google Cloud
Translation v3, or Azure Translator, called from your own server so the key never
reaches the browser. Keep the masking and the cache exactly as they are.

**Better still.** Run the cache once per language, export it as static JSON per
locale, have a native speaker review it, and ship those files. Machine output is good
enough to read but not good enough to sign a contract against, and admissions copy
carries commitments about money and deadlines.

**If ignored.** The endpoint is undocumented and unmetered. It will rate-limit under
real traffic, and it can change or disappear without notice. When it fails the site
silently stays English, so the failure is quiet rather than broken, but a visitor who
picked Arabic gets English and no explanation.

---

## 2. Withdrawals

**Today.** `site/Portal.jsx` holds the balance in React state. `WithdrawForm`
validates the $200 minimum and the available ceiling in the browser, then decrements
the number and prepends a Processing row.

**Replace with.**

- **Server-side balance.** The client-side check is a courtesy for the user, not a
  control. Recompute the available balance on the server from confirmed registrations
  minus prior withdrawals, inside the same transaction that creates the payout.
- **Idempotency key.** Generate a UUID when the sheet opens and send it with the
  request. A double-click, a retried request or a flaky connection must not create
  two payouts. The server stores the key and returns the original result on a repeat.
- **Approval state.** Model the payout as `requested → approved → sent → settled`
  or `failed`, not as a boolean. Someone at Campus Turkey approves before money
  moves; the UI already says "reviewed the same working day".
- **Audit trail.** Append-only. Who requested, who approved, the amount, the method,
  the provider reference, and the timestamp on every transition. Never update a
  payout row in place.

**If ignored.** This is the one place in the product where a bug costs real money.
Without a server-side balance a modified request can withdraw more than is owed.
Without an idempotency key a retry pays twice. Without an audit trail a dispute with
a representative cannot be settled, and neither can an internal one.

---

## 3. Payout methods

**Today.** `AddPayoutMethodForm` collects IBAN, SWIFT, wallet addresses and mobile
money numbers into React state and keeps them in memory only.

**Replace with.** Vault them with the payout provider (Wise, Payoneer, Stripe
Connect, a mobile money aggregator) and store only the returned token plus a display
mask, for example `GTBank ending 4417`. Your database should never hold a full
account number or a raw wallet address.

**If ignored.** Storing bank details yourself pulls you into PCI-adjacent scope, GDPR
obligations for financial data, and breach notification duties. The prototype copy
already promises "your details are held by our payment provider, not on this site",
so shipping local storage would also make the interface untrue.

---

## Also worth carrying over

### 4. Build and delivery (blocker)

The prototype transpiles seven JSX files in the browser with Babel standalone and
loads React's development builds. That is correct for a prototype and disqualifying
for production: expect a multi-second first paint. The React and Vite port removes
it, but treat it as a gate rather than an assumption, and bundle the CDN icons,
fonts and Leaflet at the same time so nothing is fetched cross-origin at runtime.
Add a CSP once everything is self-hosted.

**Image weight, measured.** The brand artwork in `assets/` ships at print
resolution and is roughly ten times the size it is ever displayed at:

| File | Source | Weight | Displayed at |
| --- | --- | --- | --- |
| `logo-lockup-reversed.png` | 6477 × 2846 | 667 KB | 104px tall in the loader, ~164px in the footer |
| `mark-reversed.png` | 2178 × 1714 | 229 KB | ~57px, three times on the homepage |

That is about 900 KB of decorative raster on the critical path of every page, and
the loader image gates first paint. For an audience on mobile data across Africa,
the Middle East and South Asia this is a real LCP problem, not a theoretical one.
Generate delivery variants at about 2× the largest render size (roughly 440px wide
for the lockup, 220px for the mark), serve those, and keep the originals for print.
An AVIF or WebP pair with a PNG fallback is better still. Add `width`, `height` and
`decoding="async"` to every brand `<img>` so they cannot cause layout shift.

### 5. Error boundary (blocker)

There is none. One throw anywhere blanks the whole page. Wrap each route in a
boundary so a failing section degrades instead of taking the site with it.

### 6. Routing and SEO (blocker)

The prototype uses hash routes, so every page shares one URL, one `<title>` and one
meta description. For a business whose funnel is organic search on "study in
Türkiye", this is the most expensive omission in this document. Real routes with
per-route metadata, canonical URLs, a sitemap and structured data for the university
and article pages are required, not optional.

### 7. Translation runtime cost (major)

The sweep walks and rewrites text nodes after every render, with a MutationObserver
re-firing on subtree changes. On the directory page that is a measurable interaction
cost. Shipping reviewed static locale files (note 1) removes the sweep entirely.

### 8. Translation cache growth (major)

`ct-mt2-<LANG>` grows unbounded across six languages with no eviction and no quota
handling. Static locale files remove this too; if the runtime layer survives, cap it
and catch the quota error.

### 9. Language switch discards form state (major)

Changing language remounts the page tree, so anything typed into a form is lost.
Keep locale out of the remount key.

### 10. Focus management (major)

The portal sheet has no focus trap and does not return focus to the trigger on
close. Keyboard and screen reader users lose their place.

### 11. Responsive behaviour

**Fixed in the prototype, carry the approach over.** At 768px and below, the desktop
navigation pill is replaced wholesale by `MobileNav` in the shell: a fixed bar with
the lockup, the language switcher and a 48px hamburger, plus a dropdown panel holding
every destination the desktop mega menus reach, grouped Education / Services /
Partners / Company. Tap targets are 56px on group rows and CTAs, 52px on sub-links.
Body scroll locks while the panel is open, Escape closes it, and a scrim sits behind.

The hamburger is deliberately phone-only. Above 768px the inline pill stays exactly as
designed, which is the intended desktop and tablet experience.

**One thing to watch.** The five nav labels need about 1044px to sit inline, and the
default header gutter (`clamp(20px,5vw,64px)` each side) spends 93px of that at tablet
widths. The prototype reclaims the gutter between 769px and 1100px, which recovers
more than the 44px shortfall and keeps the inline nav intact. If you add a sixth nav
item or a longer label, re-measure `ul.scrollWidth` against `ul.clientWidth` — that
comparison is the whole test.

Existing breakpoints below that: 1000px collapses the two-column splits and the
portal sidebar, 900px unstacks the FAQ and detail grids, 760px makes every form single
column, 640px tightens the portal sheets. Type and spacing tokens are `clamp()`-based,
so they scale without extra rules. Tables sit in `overflow-x:auto` wrappers.

`@media (hover:none)` neutralises hover-driven transforms, because a touch device
never fires the matching leave event and can otherwise leave a card stuck mid-lift.

What still needs real-device testing: iOS Safari's dynamic viewport (the `100vh`
values in the portal and login should become `100dvh`), the Leaflet map's touch
gestures against page scroll, and the hero video's behaviour on mobile data.

### 12. Error pages

**Built in the prototype.** `site/Errors.jsx` holds one `ErrorScreen` component with
five states, each reachable at `#/error/<state>` for review:

| State | When it shows | Recovery offered |
| --- | --- | --- |
| `notFound` | Unknown address | Home, directory, apply, contact |
| `failed` | A screen throws, caught by `RouteBoundary` | Retry, home, resume application |
| `offline` | `navigator.onLine` goes false, via `OfflineGuard` | Retry, reassurance that nothing is lost |
| `maintenance` | Planned downtime, set by the server | Retry, WhatsApp |
| `sessionExpired` | Portal idle timeout | Sign in again, contact |

Every state answers the same three things in the same order: what happened, whether
it is the visitor's fault, and what to do next. The recovery routes differ per state
because "go home" is useless advice to someone whose connection dropped.

**What the server still has to do.** The prototype has no server, so two of these are
client-side only today:

- Return a real HTTP **404** status for unknown paths, not a 200 with an error page.
  A soft 404 gets the page indexed and dilutes the site's search presence.
- Return **503** with a `Retry-After` header during maintenance, and render the
  `maintenance` state from the edge or the server rather than from the app bundle,
  which will not load if the app itself is down.
- Log caught boundary errors to real error tracking. `componentDidCatch` currently
  writes to the console; the thrown message is shown to the visitor behind a collapsed
  "Technical detail" toggle, which should be suppressed in production builds.

The session-expired state is designed but not wired to a timer, because the timeout
is an auth-provider decision. Trigger it when the token refresh fails.

### 13. Operational items

- **Bot protection on public forms.** Apply, Contact, Partner and Representative
  registration all post lead data. Add a captcha or a rate limit before launch.
- **Consent and retention.** The forms collect passport-adjacent details and, on the
  medical desk, health information. Decide a retention period and record consent.
- **Map tiles.** The directory uses OpenStreetMap's public tile server, which asks
  that production traffic use a paid tile host. Swap in MapTiler, Mapbox or a
  self-hosted set.
- **Reduced motion is already handled.** Keep the `prefers-reduced-motion` block when
  porting to React.

### 14. Dependency advisories — do not run `npm audit fix --force`

`npm audit` reports 7 findings. The count is misleading and the forced fix breaks the
build. What each one actually is:

- **vitest (critical).** Fires only when the Vitest UI server is listening.
  `@vitest/ui` is not installed and nothing passes `--ui`; the script is a headless
  `vitest run`. Not reachable. Dev dependency, never bundled.
- **vite / esbuild (high + moderate).** Dev-server issues, two of them Windows-specific.
  `vite.config.ts` sets no `server` block, so the dev server binds to localhost and is
  not exposed to the network. Dev dependency, never bundled. Relevant only while
  `npm run dev` is running.
- **react-router-dom (high).** RSC-mode CSRF. RSC mode needs a server runtime, the
  `@react-router/rsc` packages and route actions. This app is a static SPA on
  `createBrowserRouter` with no loaders or actions, so it cannot be reached.

`npm audit fix` unforced is a no-op — every remaining fix crosses a major boundary.
`--force` would install vite 8 and vitest 4 together, which breaks the `test` block and
`manualChunks` in `vite.config.ts`.

Two upgrades are blocked on purpose, not forgotten:

- **react-router 8** fixes the RSC advisory but requires React >= 19.2.7. That pulls in
  React 19, `@types/react` 19, and react-leaflet 5 (v4 does not support React 19). Not
  worth it for an unreachable finding. Revisit when React 19 is on the roadmap anyway.
- **vite 8 / vitest 4** are three and two majors ahead respectively. Do them
  deliberately, one at a time, not through `audit fix`.

The open-redirect advisories that did ship to users were closed by moving
react-router-dom to 7.18.2. That upgrade is why routing must stay on 7.18.2 or higher:
every version at or below 7.17.0 carries them. **If you add a `?returnTo=` or `?next=`
parameter to the portal sign-in, that is exactly what those advisories cover** — keep
the router current and reject any redirect target that does not start with a single `/`.

---

## Where the boundary sits

The front end owns everything under `src/`: components, tokens, motion, routing.
Everything above owns the server side of that line. The two meet at typed API
contracts, which should be written once and shared, not redeclared per screen.
