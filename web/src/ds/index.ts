"use client";

/**
 * Typed façade over the design system.
 *
 * The bundle is untyped JavaScript on a global, so these declarations are the contract:
 * they are transcribed from the component signatures in `_ds_bundle.js` and are the
 * only place that knows the namespace exists.
 *
 * Each export resolves its implementation at render time rather than at module
 * evaluation, because the bundle is loaded by a script tag that may not have run when
 * this module is first imported. The wrapper renders nothing of its own, so the DOM the
 * design system produces is unchanged.
 */

import React from "react";
import { DS_NAMESPACE } from "./load";

/* ---------------------------------------------------------------- prop types */

export type Theme = "light" | "dark";
export type OnDarkTheme = "onLight" | "onDark" | "reversed";

export interface CommonProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface BrandDividerProps extends CommonProps {
  theme?: Theme;
  width?: string | number;
  dots?: number;
}

export interface LogoProps extends CommonProps {
  variant?: "lockup" | "mark";
  theme?: "reversed" | "onLight";
  height?: number;
  assetBase?: string;
  href?: string;
}

export interface SectionHeadingProps extends CommonProps {
  eyebrow?: string;
  title?: React.ReactNode;
  lead?: React.ReactNode;
  align?: "start" | "center";
  theme?: Theme;
  size?: "h1" | "h2" | "h3";
  actions?: React.ReactNode;
  maxWidth?: number | string;
}

export interface CardProps extends CommonProps {
  children?: React.ReactNode;
  surface?: "plain" | "tinted" | "inverse";
  padding?: string;
  radius?: string;
  interactive?: boolean;
  elevation?: "none" | "sm" | "md" | "lg";
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export interface IconProps extends CommonProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  title?: string;
}

export interface StatBlockProps extends CommonProps {
  value: React.ReactNode;
  label: string;
  description?: string;
  icon?: string;
  theme?: Theme;
  align?: "start" | "center";
}

export interface TestimonialCardProps extends CommonProps {
  quote: string;
  name: string;
  role?: string;
  country?: string;
  poster?: string;
  video?: boolean;
  duration?: string;
}

export interface BadgeProps extends CommonProps {
  children?: React.ReactNode;
  tone?: "brand" | "neutral" | "onDark" | "warning" | "danger";
  icon?: string;
  dot?: boolean;
}

export interface ServiceCardProps extends CommonProps {
  icon?: string;
  title: string;
  description?: string;
  points?: string[];
  badge?: string;
  ctaLabel?: string;
  href?: string;
  emphasis?: "default" | "primary";
  index?: number;
}

export interface UniversityCardProps extends CommonProps {
  name: string;
  city: string;
  type?: "Public" | "Private";
  languages?: string[];
  tuition?: string;
  scholarship?: boolean;
  image?: string;
  programs?: number;
  href?: string;
  layout?: "grid" | "row";
}

export interface ButtonProps extends CommonProps {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "onDark" | "outlineOnDark" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconSwap?: boolean;
  href?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent) => void;
}

export interface IconButtonProps extends CommonProps {
  icon: string;
  label: string;
  variant?: "quiet" | "solid" | "outline";
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
}

export interface TagProps extends CommonProps {
  children?: React.ReactNode;
  selected?: boolean;
  count?: number;
  onClick?: () => void;
  onRemove?: () => void;
}

export interface CheckboxProps extends CommonProps {
  id: string;
  label: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "checkbox" | "radio";
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface InputProps extends CommonProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  icon?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  inputMode?: string;
  autoComplete?: string;
}

export interface SelectProps extends CommonProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  options?: readonly string[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}

export interface StepIndicatorProps extends CommonProps {
  steps?: readonly string[];
  current?: number;
  theme?: Theme;
}

export interface ScrollRevealProps extends CommonProps {
  children?: React.ReactNode;
  delay?: number;
  distance?: number;
  threshold?: number;
  once?: boolean;
  as?: string;
}

export interface StickyScrollSectionProps extends CommonProps {
  aside?: React.ReactNode;
  items?: { content: React.ReactNode }[];
  stickyTop?: number;
}

export interface Language { code: string; label: string; flag?: string; dir?: "ltr" | "rtl" }

export interface LanguageSwitcherProps extends CommonProps {
  value?: string;
  languages?: Language[];
  theme?: OnDarkTheme;
  display?: "dropdown" | "inline";
  compact?: boolean;
  onChange?: (code: string) => void;
}

export interface MegaLink { label: string; description?: string; icon?: string; href?: string }

export interface MegaMenuPanelProps extends CommonProps {
  groups?: { title: string; links: MegaLink[] }[];
  columns?: { title: string; links: MegaLink[] }[];
  feature?: React.ReactNode;
}

export interface NavItem {
  label: string;
  href?: string;
  children?: React.ReactNode;
  _route?: string;
}

export interface NavbarProps extends CommonProps {
  items?: NavItem[];
  activeItem?: string;
  lang?: string;
  onLangChange?: (code: string) => void;
  ctaLabel?: string;
  ctaHref?: string;
  /**
   * Label only. **The Navbar has no `secondaryHref`** — it hardcodes
   * `href="#consultation"` on this button and offers no way to change it, unlike
   * `CTABanner`, which does take one. Relabelling this button does not repoint it;
   * the destination is corrected by `usePlaceholderLinks` in `app/router.ts`.
   */
  secondaryLabel?: string;
  logoHeight?: number;
  assetBase?: string;
  onSelect?: (item: NavItem, e?: React.MouseEvent) => void;
}

export interface AccordionProps extends CommonProps {
  items?: { question: string; answer: string }[];
  defaultOpen?: number | null;
  allowMultiple?: boolean;
}

export interface CTABannerProps extends CommonProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showMark?: boolean;
  assetBase?: string;
}

export interface DirectoryToolbarProps extends CommonProps {
  total?: number;
  shown?: number;
  sort?: string;
  sortOptions?: readonly string[];
  onSortChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClear?: () => void;
  view?: "grid" | "list";
  onViewChange?: (view: "grid" | "list") => void;
}

export interface FooterProps extends CommonProps {
  columns?: { title: string; links: { label: string; href?: string }[] }[];
  contact?: { address?: string; phone?: string; email?: string; whatsapp?: string };
  lang?: string;
  onLangChange?: (code: string) => void;
  socials?: { icon: string; label: string }[];
  legal?: string;
  assetBase?: string;
}

export interface TimelineTrackProps extends CommonProps {
  steps?: { meta: string; title: string; description: string; icon: string }[];
}

export interface ScrollProgressProps extends CommonProps {
  height?: number;
}

/* ------------------------------------------------------------------ resolver */

/**
 * The design system namespace, or `undefined` when it is not there yet.
 *
 * The `typeof window` guard is load-bearing rather than defensive. Screens are client
 * components, and a client component still renders **on the server** to produce the
 * initial HTML — so this runs in Node, where `window` is not merely empty but
 * undeclared, and a bare `window[...]` is a ReferenceError that fails the whole render.
 *
 * It never fired while `DesignSystemProvider` withheld every screen until the bundle had
 * loaded, because nothing below the gate reached the server at all. Now that the gate
 * publishes its status instead of blanking the page, the chrome renders server-side with
 * the bundle absent, and `bind` needs a `undefined` here rather than a crash.
 */
const namespace = () =>
  typeof window === "undefined" ? undefined : window[DS_NAMESPACE];

/**
 * Binds a name in the design system namespace to a typed component.
 *
 * The lookup happens on render, not on import. In development a missing name is loud —
 * a silent null here would look like a styling bug three screens away.
 */
function bind<P extends object>(name: string): React.FC<P> {
  const Bound: React.FC<P> = (props) => {
    const Impl = namespace()?.[name] as React.ComponentType<P> | undefined;
    if (!Impl) {
      if (process.env.NODE_ENV !== "production") console.error(`Design system component "${name}" is not available.`);
      return null;
    }
    return React.createElement(Impl, props);
  };
  Bound.displayName = `DS.${name}`;
  return Bound;
}

/* ------------------------------------------------------------------ components */

export const BrandDivider = bind<BrandDividerProps>("BrandDivider");
export const Logo = bind<LogoProps>("Logo");
export const SectionHeading = bind<SectionHeadingProps>("SectionHeading");
export const Card = bind<CardProps>("Card");
export const Icon = bind<IconProps>("Icon");
export const StatBlock = bind<StatBlockProps>("StatBlock");
export const TestimonialCard = bind<TestimonialCardProps>("TestimonialCard");
export const Badge = bind<BadgeProps>("Badge");
export const ServiceCard = bind<ServiceCardProps>("ServiceCard");
export const UniversityCard = bind<UniversityCardProps>("UniversityCard");
export const Button = bind<ButtonProps>("Button");
export const IconButton = bind<IconButtonProps>("IconButton");
export const Tag = bind<TagProps>("Tag");
export const Checkbox = bind<CheckboxProps>("Checkbox");
export const Input = bind<InputProps>("Input");
export const Select = bind<SelectProps>("Select");
export const StepIndicator = bind<StepIndicatorProps>("StepIndicator");
export const ScrollReveal = bind<ScrollRevealProps>("ScrollReveal");
export const ScrollProgress = bind<ScrollProgressProps>("ScrollProgress");
export const StickyScrollSection = bind<StickyScrollSectionProps>("StickyScrollSection");
export const LanguageSwitcher = bind<LanguageSwitcherProps>("LanguageSwitcher");
export const MegaMenuPanel = bind<MegaMenuPanelProps>("MegaMenuPanel");
export const Navbar = bind<NavbarProps>("Navbar");
export const Accordion = bind<AccordionProps>("Accordion");
export const CTABanner = bind<CTABannerProps>("CTABanner");
export const DirectoryToolbar = bind<DirectoryToolbarProps>("DirectoryToolbar");
export const Footer = bind<FooterProps>("Footer");
export const TimelineTrack = bind<TimelineTrackProps>("TimelineTrack");

/** The design system's language list, after the prototype's extension to seventeen. */
export const languages = (): Language[] => (namespace()?.["LANGUAGES"] as Language[]) ?? [];

/**
 * Asset base the design system components resolve brand artwork against.
 *
 * **Absolute, and it has to be.** The design system's own default is the relative string
 * `"assets"`, which is correct for the `site/` prototype it was written against: that is
 * hash-routed, so the document is always at the root and `assets/…` always resolves.
 * Here every page is `/[locale]/…`, and a relative URL resolves against the current
 * directory — so the same string reached `/assets/…` at `/en` and `/en/assets/…` at
 * `/en/apply`, `/en/universities/assets/…` one level deeper again. The brand artwork was
 * therefore correct on the locale root and 404 on every other page in the application.
 *
 * That is not only the logo. `Logo` and `CTABanner` take this as `assetBase`, and the
 * footer photograph, the `PageHero` map wash and the hero video interpolate it directly,
 * so a single relative string broke a different subset of images on every route depth.
 *
 * `next.config.ts` sets no `basePath` or `assetPrefix`, so the leading slash is the whole
 * fix; if the app is ever mounted under a sub-path, this constant is the one place that
 * has to learn about it. `src/test/asset-urls.test.ts` fails if it goes relative again.
 */
export const ASSETS = "/assets";
