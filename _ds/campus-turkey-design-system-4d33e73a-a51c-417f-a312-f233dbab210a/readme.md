# Campus Turkey Design System

Campus Turkey is an international gateway to Türkiye. Higher education is the core of the business ("your guide to study in Turkey" is the brand tagline), with five supporting service lines: medical tourism, business facilitation, employment services, educational and business tours, and partnerships / country representatives.

The audience is global and mostly first-time: students, patients, business travellers, workers, agencies and institutional partners across Africa, the Middle East, Asia and beyond. Everything in this system is built around one rule — **assume every visitor needs the simplest possible path**, and never let the five secondary services compete with education for attention.

## Products represented

1. **Marketing website** (the only product in scope today) — multi-page, conversion-focused, multi-language. Home, service pages, university directory, application flow, partner and representative registration, partner login. Target stack: React + Vite + TypeScript + Tailwind CSS + lucide-react.

## Sources given

- **Brand artwork:** `uploads/Logo + Tagline@4x.png`, `uploads/Icon@4x.png` — the reversed (white) lockup and the standalone emblem. Both were trimmed and copied into `assets/`.
- **Colour swatch files:** four PNGs naming the palette (`#2EAE6E` primary green, `#1F7A4D` dark green, `#FFFFFF` white, `#E30A17` Turkish red, flag accent only).
- **Fonts:** `uploads/PlayfairDisplay.ttf` + Italic, `uploads/IBMPlexSans.ttf` + Italic. Both are real files, copied to `assets/fonts/` — **no substitutions were needed.**
- **Written brief:** `uploads/Website Template.txt` — the full page-by-page specification (hero, about/trust, services, directory, required pages, copy rules). This is the primary source of truth for structure and behaviour.
- **Interaction source code:** `uploads/nav bar animation.txt` (a framer-motion animated navigation menu with spring 350/32/0), `uploads/Button Hover.txt` (the pill button whose trailing icon disc travels to the leading edge and rotates 45° over 500ms), `uploads/page scroll animation.txt` (a scroll-progress timeline). These gave the motion values in `tokens/motion.css`.
- **Reference screenshots** (`hero section.png`, `nav bar.png`, `services section.png`, `footer section.png`, `stats section.png`, `timelines section.png`, `FAQ accordion.png`, `Multi-step form.png`, `CTA banner.png`, `login page.png`, `university directory page full look.png`, `video testimonials section.png`, `featured universities section.png`, `nav bar mega menu.png`, `button.png`) — **these are third-party sites collected as inspiration, not Campus Turkey designs.** They were read for *structure* only (which sections exist, floating pill nav, overlapping rounded sections, sticky columns, scroll reveals). None of their visual identity was copied.
- `uploads/map of turkey.jpg` — flat province map, used for the directory map and the hero watermark.
- `uploads/edsai.skill` — the frontend-operations skill the brief pairs this project with. Not a design source.

No Figma file, no codebase, and no slide deck were provided. There is no existing production site to recreate, so the UI kit is a build of the written brief using the supplied brand assets — not a recreation of a live product.

---

## CONTENT FUNDAMENTALS

**Voice.** Plain, warm, factual. The brand sells trust, not excitement. Write like a competent person explaining something to someone who has never done it before.

**Person.** "We" for Campus Turkey, "you" for the visitor. Never "our clients" or "the student" in the third person. *"We help international students gain admission to public and private universities."* *"You get a shortlist with real costs and real deadlines."*

**Sentence length.** Short. One idea per sentence. Two sentences per paragraph is the norm on the homepage; three is the maximum in a card.

**No em dashes.** This is an explicit brand rule. Use a period, a comma, or a simple conjunction instead. (Applies to website copy. This readme is internal documentation.)

**Casing.** Sentence case for headings and buttons ("Apply Now" and "Book a Consultation" are the two title-case exceptions, because they are fixed CTA labels). UPPERCASE only for eyebrows, the tagline and the wordmark. Never all-caps a sentence.

**Numbers are specific or absent.** "$600 to $2,000 per year", "within one working day", "200+ partner universities". Never "affordable prices", never "fast service", never a stat the business cannot defend.

**Türkiye, not Turkey**, in body copy and headings — except inside the logo lockup and the tagline, where the supplied artwork reads TURKEY.

**CTA vocabulary is fixed.** Apply Now · Book a Consultation · WhatsApp · Become a Partner · Become a Representative · Contact us. Do not invent new verbs ("Get started", "Learn more" is allowed only as an inline card link).

**Questions are written as visitors ask them.** *"How much does a public university cost?"* not *"Tuition information"*. Answer first, detail second.

**Emoji.** Not used in copy, headings, or as icons — with exactly one sanctioned exception: **flag emoji in the language switcher**, because a recognisable flag next to a language code is the fastest thing to spot for a visitor who does not read English.

**Vibe.** Institutional but human. Laurel-wreath-and-pediment seriousness in the mark, softened by generous whitespace, rounded surfaces and green light. Closer to a reputable university's admissions office than to a travel startup.

---

## VISUAL FOUNDATIONS

**Colour.** Two greens carry everything: `#2EAE6E` primary (CTAs, active states, accents) and `#1F7A4D` dark (gradient depth, hover, deep panels). White is a full member of the palette, used for text, icons, the wordmark and separator lines. Turkish red `#E30A17` appears **only** inside the flag roundel of the mark, or as a `Badge tone="flag"` in explicit country context — never as a button, never as an error colour (status red is a separate, desaturated `#B3352F`). A ten-step green ramp and an eleven-step warm-neutral grey ramp are derived from those brand values. At most two background fields per page: a light one (`--surface-page` / `--surface-subtle`) and a green one (`--gradient-brand` / `--gradient-brand-deep`).

**Type.** Playfair Display for every heading, pull quote and headline figure. IBM Plex Sans for every sentence, label, control and caption. Never the reverse, never a third family. Display sizes are fluid `clamp()` values; headings sit at `--lh-heading` 1.14 with `-0.01em` tracking, display at 1.04 with `-0.02em`. Eyebrows are 13px IBM Plex 600 uppercase at `.16em`; the tagline uses `.22em` to match the artwork.

**Spacing.** A 4px base step (`--space-1` … `--space-32`). Sections breathe on `--section-y` (64 → 128px fluid) with a `--gutter` of 20 → 64px and a 1240px max container. The signature rhythm move is the **25px overlap**: the hero ends with a negative bottom margin and the next section pulls up over it with `border-radius: 25px 25px 0 0`. The footer mirrors it with the same 25px top corners.

**Backgrounds.** Never a pattern, never a texture, never hand-drawn illustration. Three treatments only: flat light surfaces, green gradient fields (135° for banners, 180° for deep panels), and full-bleed photography or video behind a scrim. The hero is a full-viewport muted video loop under `bg-black/30` (`--surface-overlay-hero`) or a brand-tinted `--surface-overlay-brand` at 40%. Text over imagery always gets `--gradient-protect-bottom` rather than a capsule — capsules are reserved for the floating nav pill and for chips.

**Imagery colour vibe.** Warm, bright, daylight, real people and real campuses. No grain, no duotone, no black and white, no heavy filters. Green tinting of photography is not allowed; the green comes from the UI around the image.

**Corner radii.** 6 / 10 / 14 / 20 / 25 / 32px plus the pill. Buttons, chips, nav and floating elements are **always fully pill-rounded**. Cards default to 20px. Section overlaps and hero-family panels use 25px. Inputs use 10px.

**Cards.** White surface, 1px `--border-subtle` hairline, 20px radius, `--shadow-sm`, 32px padding. Interactive cards lift 3px, swap the hairline to `--border-brand` and go to `--shadow-lg`. There are exactly four card surfaces: plain, tinted (pale green), inverse (deep green), brand (green gradient). No coloured left-border accent cards.

**Shadows.** Green-tinted, never neutral black: `rgba(15,61,42,…)`. Six steps from `--shadow-xs` to `--shadow-float` (for the nav pill and the WhatsApp button) plus `--shadow-brand`, a green glow used only on a hovered primary button. Inner shadow is limited to `--shadow-inset-hairline`, a 1px white inset used on glass surfaces over video.

**Transparency and blur.** Only where something floats over content: the nav pill (`rgba(10,44,30,.42)` + `blur(10px)` over the hero, `rgba(255,255,255,.88)` + blur once scrolled), overlay scrims, and `onDark` chips at 14–16% white. Never blur a static section background.

**Borders.** 1px hairlines everywhere; 2px only for the active step ring and the timeline rail. On green, separator lines are white at 22–28% opacity — the same device as the rule under the wordmark in the lockup.

**Animation.** Restrained and fast. `--ease-out` cubic-bezier(.16,1,.3,1) is the default. 150ms for hover and focus, 250ms for panels and toggles, 500ms for the one signature move (the button's icon disc travelling across the pill and rotating 45°), 700ms for scroll reveals. Navigation motion runs on a critically-damped 380ms `cubic-bezier(.22,1,.28,1)` — the CSS stand-in for the reference's 350 stiffness / 32 damping / 0 bounce spring: one highlight pill slides between links, and one shared mega-menu viewport travels under the active trigger while morphing width and height, with content sliding in from the direction of travel. Scroll behaviour is site-wide, not decorative: a 3px page-progress hairline in the brand gradient, every section entering on a 16px rise at 700ms with 80ms sibling stagger, sticky asides beside scrolling content, and masked hairline rails that fill with the brand gradient as their section scrolls. The hamburger is the only element allowed an overshoot easing (`--ease-hamburger`). No bounces, no parallax, no auto-playing carousels. Everything collapses to 0ms under `prefers-reduced-motion`.

**Hover states.** Fills darken one step (primary green → dark green). Quiet surfaces tint to `--green-050`. Cards lift 3px and gain a green hairline. Links go *lighter* (`--text-link` dark green → `--text-link-hover` primary green). Never use opacity alone for hover.

**Press states.** Colour only, one further step down the ramp (`--action-primary-active`, green-700). Nothing shrinks or scales on press.

**Focus.** A 3px `--focus-ring` halo (green at 45%) plus the green border. Never removed, never replaced by a browser outline.

**Layout rules.** Two elements are fixed: the navbar (top, floating white pill, full-width padded container) and the WhatsApp button (bottom-end, 24px inset). **The navbar is static on scroll** — it does not shrink, change surface, hide, or swap theme; it lands and stays. Pages that do not open with the hero reserve `padding-top: 140px`. Sticky-but-not-fixed: the left column of the journey and FAQ sections on desktop. Everything else scrolls. Minimum touch target 44px. The hero and the footer are deliberately in the same compositional family — green field, 25px corners, centred brand presence, dots-and-rule divider — so the page opens and closes on the same note.

---

## ICONOGRAPHY

**One set: Lucide.** The brief specifies `lucide-react` and no other icon library, and the supplied interaction source code imports from it (`ArrowUpRight`, `ChevronDownIcon`, `Sparkles`, `Users`, `Building2`…). No icon assets were included in the sources, so Lucide is linked from CDN (`unpkg.com/lucide@0.454.0`) in every card and UI-kit page, and wrapped by the `Icon` component. **This is a substitution only in delivery mechanism, not in set** — the icon set itself is the one the brief names.

- Style: 2px stroke, rounded caps, 24px grid, currentColor. Never filled, never duotone, never mixed with another set.
- Sizes: 13–14px inline with caption text, 16–17px inside buttons and links, 20–22px standalone, 26px inside a service-card icon tile.
- Icon tiles: a rounded square (`--radius-md`) filled `--green-050` with a `--green-100` hairline, glyph in `--green-500`. On brand surfaces the tile is 18% white with a 24% white hairline.
- No PNG icons, no icon font, no SVG sprite, no unicode glyphs used as icons (no ✓, ★, →), and **no hand-drawn SVG** — if a glyph does not exist in Lucide, the design changes rather than the icon set.
- **Emoji** are used in exactly one place: flag emoji in the `LanguageSwitcher`. Nowhere else.
- The brand emblem (laurel wreath + pediment + flag roundel) is artwork, not an icon. It comes from `assets/mark-*.png` via the `Logo` component and is never redrawn, recoloured or used at icon sizes.

### Assets on hand

| File | What it is |
| --- | --- |
| `assets/logo-lockup-reversed.png` | Supplied master lockup: mark + CAMPUS TURKEY + tagline, white and green artwork for dark grounds |
| `assets/logo-lockup-onlight.png` | Mechanical recolor of the master (white → `#0F3D2A`, red roundel untouched) for light grounds |
| `assets/mark-reversed.png` / `assets/mark-onlight.png` | The emblem alone, same two themes |
| `assets/logo-tagline.png`, `assets/icon-flag.png` | Untrimmed originals as supplied |
| `assets/map-of-turkey.jpg` | Flat province map of Türkiye |
| `assets/fonts/*.ttf` | The four supplied font binaries |

**Missing and requested:** hero background video, campus / hospital / classroom photography, student and partner portraits, university logos, and a region-level SVG map of Türkiye with per-province hit areas. Every component falls back to a green gradient or an initial avatar rather than stock imagery.

---

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | Root entry point. Nothing but `@import` lines — link this one file. |
| `tokens/` | `fonts.css` (`@font-face`), `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css`, `base.css` (element resets + `.ct-eyebrow` / `.ct-tagline` / `.ct-container` helpers) |
| `guidelines/` | 20 foundation specimen cards: colour, type, spacing, radius, elevation, motion, borders, imagery, logo clear space |
| `components/` | React primitives, grouped by concern (below) |
| `ui_kits/website/` | The marketing-website UI kit: 4 click-through screens + `README.md` on what is deliberately blank |
| `templates/lead-page/` | Starter template: a single-service landing page consuming projects can copy |
| `assets/` | Logo artwork, map, fonts |
| `thumbnail.html` | Homepage tile |
| `SKILL.md` | Agent Skills entry point |

### Components

**`components/core/`** — `Icon`, `Button`, `IconButton`, `Badge`, `Tag`, `Card`
**`components/brand/`** — `Logo`, `BrandDivider`
**`components/navigation/`** — `Navbar`, `MegaMenuPanel`, `LanguageSwitcher`, `WhatsAppButton`
**`components/forms/`** — `Field`, `Input`, `Select`, `Checkbox`, `StepIndicator`
**`components/content/`** — `SectionHeading`, `ServiceCard`, `UniversityCard`, `StatBlock`, `TestimonialCard`
**`components/sections/`** — `Accordion`, `TimelineTrack`, `CTABanner`, `DirectoryToolbar`, `Footer`

Every component has a sibling `.d.ts` (props contract) and `.prompt.md` (what it is, when to use it, a usage example). Each directory has one `@dsCard` HTML showing its states.

### Intentional additions

The sources define no component library, only a written brief plus three pasted interaction snippets. The inventory above is derived section-by-section from that brief. Two components exist for practical reasons rather than because the brief names them:

- **`Icon`** — a Lucide wrapper, so cards and prototypes can render the same glyph set the production stack uses via `lucide-react`.
- **`Field`** — the shared label / hint / error wrapper extracted from `Input` and `Select`, so custom controls (textarea, file drop) inherit identical labelling.
- **`components/motion/`** — `ScrollReveal`, `ScrollProgress` and `StickyScrollSection`, the shared implementation of the scroll behaviour specified in `uploads/page scroll animation.txt`. Without them every screen would hand-roll its own IntersectionObserver and the timings would drift.

`Checkbox` covers radios via `type="radio"` rather than shipping a separate `Radio`. There is no Toast, Tooltip, Avatar, Modal or Tabs component, because nothing in the brief calls for one.
