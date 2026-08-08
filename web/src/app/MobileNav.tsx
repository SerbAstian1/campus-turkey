"use client";

/**
 * Phone navigation. Transcribed from `Campus Turkey Website.html`.
 *
 * Below 768px the desktop pill is hidden and this takes over: a compact bar plus a
 * dropdown panel. Everything the desktop mega menus reach is reachable here, grouped
 * the same way, with tap targets at 48px.
 */

import { useEffect, useState } from "react";
import { Button, Icon, LanguageSwitcher, Logo, ASSETS } from "@/ds";
import { useT } from "@/i18n/context";
import { go } from "./router";

type Group = { key: string; label: string; icon: string; links: [string, string, string][] };

export function MobileNav({
  lang, onLangChange, route,
}: {
  lang: string;
  onLangChange: (code: string) => void;
  route: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);

  useEffect(() => { setOpen(false); setSection(null); }, [route]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const groups: Group[] = [
    { key: "education", label: t("Education"), icon: "graduation-cap", links: [
      ["Study in Türkiye", "study", "graduation-cap"],
      ["University directory", "universities", "landmark"],
      ["Scholarships", "study", "award"],
      ["Resources", "resources", "book-open"]] },
    { key: "services", label: t("Services"), icon: "heart-pulse", links: [
      ["Medical Tourism", "service/medical", "heart-pulse"],
      ["Business Facilitation", "service/business", "briefcase"],
      ["Employment", "service/employment", "hard-hat"],
      ["Educational tours", "service/tours", "bus-front"]] },
    { key: "partners", label: t("Partners"), icon: "handshake", links: [
      ["Become a Partner", "partners", "handshake"],
      ["Become a Representative", "representative", "globe"],
      ["For universities", "institutions/universities", "landmark"],
      ["For agencies", "institutions/agencies", "users"],
      ["For hospitals", "institutions/hospitals", "stethoscope"],
      ["Partner Login", "portal", "log-in"]] },
    { key: "company", label: t("Company"), icon: "info", links: [
      ["About us", "about", "info"],
      ["Contact", "contact", "phone"]] },
  ];

  const navigate = (r: string) => { setOpen(false); setSection(null); go(r); };

  return (
    <div className="ct-mobile-nav">
      <div className="ct-mobile-bar">
        <a href="#/home" onClick={(e) => { e.preventDefault(); navigate("home"); }} style={{ display: "inline-flex", alignItems: "center" }}>
          <Logo variant="lockup" theme="onLight" height={34} assetBase={ASSETS} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginInlineStart: "auto" }}>
          <LanguageSwitcher value={lang} onChange={onLangChange} theme="onLight" compact />
          <button type="button" className="ct-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className={open ? "on" : ""} />
            <span className={open ? "on" : ""} />
          </button>
        </div>
      </div>

      <div
        className="ct-mobile-panel" aria-hidden={!open}
        style={{
          transform: open ? "translateY(0)" : "translateY(-8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
        }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={() => navigate("apply")}>{t("Apply Now")}</Button>
        <Button variant="secondary" size="lg" fullWidth icon="calendar-check" onClick={() => navigate("contact")}>{t("Book a Consultation")}</Button>

        <nav>
          {groups.map((g) => {
            const on = section === g.key;
            return (
              <div key={g.key} className="ct-mobile-group">
                <button type="button" aria-expanded={on} onClick={() => setSection(on ? null : g.key)}>
                  <Icon name={g.icon} size={18} color="var(--green-600)" />
                  <span>{g.label}</span>
                  <Icon
                    name="chevron-down" size={16} strokeWidth={2.5}
                    style={{ marginInlineStart: "auto", transform: on ? "rotate(180deg)" : "none", transition: "transform var(--dur-base) var(--ease-out)" }}
                  />
                </button>
                <div className="ct-mobile-sub" style={{ maxHeight: on ? 60 * g.links.length : 0 }}>
                  {g.links.map(([label, r, icon]) => (
                    <a key={label + r} href={`#/${r}`} onClick={(e) => { e.preventDefault(); navigate(r); }}>
                      <Icon name={icon} size={16} color="var(--neutral-500)" />{label}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {open ? <button type="button" className="ct-mobile-scrim" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
    </div>
  );
}
