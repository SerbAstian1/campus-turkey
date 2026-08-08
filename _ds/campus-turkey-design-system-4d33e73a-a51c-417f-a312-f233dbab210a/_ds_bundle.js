/* @ds-bundle: {"format":4,"namespace":"CampusTurkeyDesignSystem_4d33e7","components":[{"name":"BrandDivider","sourcePath":"components/brand/BrandDivider.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"SectionHeading","sourcePath":"components/content/SectionHeading.jsx"},{"name":"ServiceCard","sourcePath":"components/content/ServiceCard.jsx"},{"name":"StatBlock","sourcePath":"components/content/StatBlock.jsx"},{"name":"TestimonialCard","sourcePath":"components/content/TestimonialCard.jsx"},{"name":"UniversityCard","sourcePath":"components/content/UniversityCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Input.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"StepIndicator","sourcePath":"components/forms/StepIndicator.jsx"},{"name":"ScrollReveal","sourcePath":"components/motion/ScrollReveal.jsx"},{"name":"ScrollProgress","sourcePath":"components/motion/ScrollReveal.jsx"},{"name":"StickyScrollSection","sourcePath":"components/motion/ScrollReveal.jsx"},{"name":"LANGUAGES","sourcePath":"components/navigation/LanguageSwitcher.jsx"},{"name":"LanguageSwitcher","sourcePath":"components/navigation/LanguageSwitcher.jsx"},{"name":"MegaMenuPanel","sourcePath":"components/navigation/MegaMenuPanel.jsx"},{"name":"Navbar","sourcePath":"components/navigation/Navbar.jsx"},{"name":"WhatsAppButton","sourcePath":"components/navigation/WhatsAppButton.jsx"},{"name":"Accordion","sourcePath":"components/sections/Accordion.jsx"},{"name":"CTABanner","sourcePath":"components/sections/CTABanner.jsx"},{"name":"DirectoryToolbar","sourcePath":"components/sections/DirectoryToolbar.jsx"},{"name":"Footer","sourcePath":"components/sections/Footer.jsx"},{"name":"TimelineTrack","sourcePath":"components/sections/TimelineTrack.jsx"}],"sourceHashes":{"components/brand/BrandDivider.jsx":"2aa05e13c8c8","components/brand/Logo.jsx":"696ab54c89fd","components/content/SectionHeading.jsx":"12568a24533c","components/content/ServiceCard.jsx":"9272e29e8f18","components/content/StatBlock.jsx":"431817595c60","components/content/TestimonialCard.jsx":"fb1d60bdaa5c","components/content/UniversityCard.jsx":"204580c38d43","components/core/Badge.jsx":"90073f3fbfee","components/core/Button.jsx":"a41a1d128326","components/core/Card.jsx":"1748a18635ca","components/core/Icon.jsx":"0afcc3a4c260","components/core/IconButton.jsx":"85dde97e1023","components/core/Tag.jsx":"7cc52bb75ec8","components/forms/Checkbox.jsx":"a6baba6373ab","components/forms/Input.jsx":"b96bd742b5af","components/forms/Select.jsx":"6a29524ba8f6","components/forms/StepIndicator.jsx":"7501caac8aa1","components/motion/ScrollReveal.jsx":"e2975bb7e889","components/navigation/LanguageSwitcher.jsx":"c58af665a6d4","components/navigation/MegaMenuPanel.jsx":"6abc53f2d7f8","components/navigation/Navbar.jsx":"44fea8456a6c","components/navigation/WhatsAppButton.jsx":"873b7b8b0a33","components/sections/Accordion.jsx":"b7a0b2f18650","components/sections/CTABanner.jsx":"11887d592e0b","components/sections/DirectoryToolbar.jsx":"1e65a4b79533","components/sections/Footer.jsx":"93e22c0e992c","components/sections/TimelineTrack.jsx":"7f64d0593fc9","ui_kits/website/ApplyScreen.jsx":"50c304da49f3","ui_kits/website/HomeScreen.jsx":"45c4d31f7fa7","ui_kits/website/UniversitiesScreen.jsx":"991dd51a9ac1","ui_kits/website/data.js":"adc94de6360a"},"inlinedExternals":[],"unexposedExports":[{"name":"useSectionProgress","sourcePath":"components/motion/ScrollReveal.jsx"}]} */

(() => {

const __ds_ns = (window.CampusTurkeyDesignSystem_4d33e7 = window.CampusTurkeyDesignSystem_4d33e7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/BrandDivider.jsx
try { (() => {
/** Decorative section divider: a hairline rule interrupted by three small
 *  circles. Used between the two halves of the About / Trust section. */
function BrandDivider({
  theme = "light",
  width = "100%",
  dots = 3,
  className,
  style
}) {
  const line = theme === "dark" ? "var(--separator-inverse)" : "var(--border-subtle)";
  const dot = theme === "dark" ? "var(--white)" : "var(--green-400)";
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    role: "presentation",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      width,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: line
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: "var(--space-2)"
    }
  }, Array.from({
    length: dots
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: i === Math.floor(dots / 2) ? 9 : 5,
      height: i === Math.floor(dots / 2) ? 9 : 5,
      borderRadius: "var(--radius-circle)",
      background: dot,
      opacity: i === Math.floor(dots / 2) ? 1 : 0.5,
      alignSelf: "center"
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: line
    }
  }));
}
Object.assign(__ds_scope, { BrandDivider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/BrandDivider.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
const SRC = {
  reversed: {
    lockup: "logo-lockup-reversed.png",
    mark: "mark-reversed.png"
  },
  onLight: {
    lockup: "logo-lockup-onlight.png",
    mark: "mark-onlight.png"
  }
};

/** The Campus Turkey lockup and standalone mark. Never re-typeset or recolor
 *  the wordmark by hand — always render one of the supplied PNGs. */
function Logo({
  variant = "lockup",
  theme = "reversed",
  height = 56,
  assetBase = "assets",
  href,
  className,
  style
}) {
  const set = SRC[theme] || SRC.reversed;
  const file = variant === "mark" ? set.mark : set.lockup;
  const img = /*#__PURE__*/React.createElement("img", {
    src: `${assetBase}/${file}`,
    alt: "Campus Turkey \u2014 your guide to study in Turkey",
    style: {
      height,
      width: "auto",
      display: "block"
    }
  });
  const wrap = {
    display: "inline-flex",
    alignItems: "center",
    ...style
  };
  return href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    className: className,
    style: wrap
  }, img) : /*#__PURE__*/React.createElement("span", {
    className: className,
    style: wrap
  }, img);
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/content/SectionHeading.jsx
try { (() => {
/** Eyebrow + display heading + optional lead paragraph. Every section starts with one. */
function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "start",
  theme = "light",
  size = "h2",
  actions,
  maxWidth = 720,
  className,
  style
}) {
  const dark = theme === "dark";
  const fs = {
    display: "var(--fs-display-2)",
    h1: "var(--fs-h1)",
    h2: "var(--fs-h2)",
    h3: "var(--fs-h3)"
  }[size] || "var(--fs-h2)";
  return /*#__PURE__*/React.createElement("header", {
    className: className,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      alignItems: align === "center" ? "center" : "flex-start",
      textAlign: align === "center" ? "center" : "start",
      maxWidth,
      marginInline: align === "center" ? "auto" : undefined,
      ...style
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("span", {
    className: "ct-eyebrow",
    style: dark ? {
      color: "var(--green-300)"
    } : undefined
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: fs,
      lineHeight: "var(--lh-heading)",
      letterSpacing: "var(--ls-heading)",
      color: dark ? "var(--white)" : "var(--text-heading)",
      margin: 0
    }
  }, title), lead ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--fs-lead)",
      lineHeight: "var(--lh-body)",
      color: dark ? "var(--text-on-inverse)" : "var(--text-body)"
    }
  }, lead) : null, actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-3)",
      marginTop: "var(--space-2)"
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
const SURFACES = {
  plain: {
    bg: "var(--surface-card)",
    border: "var(--border-subtle)",
    color: "var(--text-body)"
  },
  tinted: {
    bg: "var(--surface-card-tinted)",
    border: "var(--green-100)",
    color: "var(--text-body)"
  },
  inverse: {
    bg: "var(--surface-inverse)",
    border: "var(--border-on-inverse)",
    color: "var(--text-on-inverse)"
  },
  brand: {
    bg: "var(--gradient-brand)",
    border: "transparent",
    color: "var(--white)"
  }
};

/** The system's one container primitive: hairline border, soft shadow, 20px radius. */
function Card({
  children,
  surface = "plain",
  padding = "var(--space-8)",
  radius = "var(--radius-lg)",
  interactive = false,
  elevation = "sm",
  href,
  onClick,
  className,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const s = SURFACES[surface] || SURFACES.plain;
  const shadow = {
    none: "var(--shadow-none)",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)"
  }[elevation] || "var(--shadow-sm)";
  const Tag = href ? "a" : "div";
  return /*#__PURE__*/React.createElement(Tag, {
    className: className,
    href: href,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "block",
      background: s.bg,
      color: s.color,
      padding,
      borderRadius: radius,
      border: `1px solid ${interactive && hover ? "var(--border-brand)" : s.border}`,
      boxShadow: interactive && hover ? "var(--shadow-lg)" : shadow,
      transform: interactive && hover ? "translateY(-3px)" : "none",
      transition: `transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)`,
      cursor: interactive || href ? "pointer" : "default",
      textDecoration: "none",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
const PASCAL = n => n.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());

/**
 * Thin wrapper around the Lucide icon set (the only icon system Campus Turkey uses).
 * In production code, import the icon directly from `lucide-react` instead.
 */
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  color = "currentColor",
  className,
  style,
  title
}) {
  const host = React.useRef(null);
  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = "";
    const lib = typeof window !== "undefined" ? window.lucide : null;
    const node = lib && lib.icons && (lib.icons[PASCAL(name)] || lib.icons[name]);
    if (!lib || !node) return;
    const svg = lib.createElement(node);
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("stroke-width", strokeWidth);
    svg.setAttribute("stroke", color);
    if (title) svg.setAttribute("aria-label", title);
    el.appendChild(svg);
  }, [name, size, strokeWidth, color, title]);
  return /*#__PURE__*/React.createElement("span", {
    ref: host,
    className: className,
    "aria-hidden": title ? undefined : "true",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      flex: "none",
      ...style
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/content/StatBlock.jsx
try { (() => {
/** Single headline number in the stats band. */
function StatBlock({
  value,
  label,
  description,
  icon,
  theme = "dark",
  align = "start",
  className,
  style
}) {
  const dark = theme === "dark";
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      alignItems: align === "center" ? "center" : "flex-start",
      textAlign: align === "center" ? "center" : "start",
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22,
    color: dark ? "var(--green-300)" : "var(--green-400)",
    style: {
      marginBottom: 4
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-display-2)",
      lineHeight: 1,
      letterSpacing: "var(--ls-display)",
      color: dark ? "var(--white)" : "var(--text-heading)"
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-semibold)",
      color: dark ? "var(--green-200)" : "var(--green-600)"
    }
  }, label), description ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-caption)",
      lineHeight: 1.55,
      color: dark ? "rgba(255,255,255,.7)" : "var(--text-muted)",
      maxWidth: 240
    }
  }, description) : null);
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/content/TestimonialCard.jsx
try { (() => {
/** Student or client testimonial. `video` renders the play affordance over a
 *  16:9 poster area for the video-testimonials section. */
function TestimonialCard({
  quote,
  name,
  role,
  country,
  poster,
  video = false,
  duration,
  className,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: "0",
    interactive: video,
    className: className,
    style: {
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, video ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      aspectRatio: "16 / 9",
      background: poster ? `center/cover no-repeat url(${poster})` : "var(--gradient-brand-deep)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--gradient-protect-bottom)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: `translate(-50%,-50%) scale(${hover ? 1.08 : 1})`,
      width: 60,
      height: 60,
      borderRadius: "var(--radius-circle)",
      background: "var(--white)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--green-700)",
      boxShadow: "var(--shadow-float)",
      transition: `transform var(--dur-base) var(--ease-out)`
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "play",
    size: 22
  })), duration ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: 12,
      right: 12,
      padding: "3px 9px",
      borderRadius: "var(--radius-pill)",
      background: "rgba(10,44,30,.7)",
      color: "var(--white)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-micro)",
      letterSpacing: ".04em"
    }
  }, duration) : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)",
      padding: "var(--space-8)",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "quote",
    size: 22,
    color: "var(--green-200)"
  }), /*#__PURE__*/React.createElement("blockquote", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h4)",
      lineHeight: 1.45,
      color: "var(--text-heading)"
    }
  }, quote), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-circle)",
      background: "var(--green-050)",
      border: "1px solid var(--green-100)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontSize: 17,
      color: "var(--green-600)"
    }
  }, (name || "?").charAt(0)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-semibold)",
      color: "var(--green-800)"
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--fs-caption)",
      color: "var(--text-muted)"
    }
  }, [role, country].filter(Boolean).join(" · "))))));
}
Object.assign(__ds_scope, { TestimonialCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/TestimonialCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const TONES = {
  brand: {
    bg: "var(--green-050)",
    fg: "var(--green-700)",
    border: "var(--green-100)"
  },
  neutral: {
    bg: "var(--neutral-050)",
    fg: "var(--neutral-600)",
    border: "var(--border-subtle)"
  },
  solid: {
    bg: "var(--action-primary)",
    fg: "var(--white)",
    border: "transparent"
  },
  onDark: {
    bg: "rgba(255,255,255,.16)",
    fg: "var(--white)",
    border: "var(--border-on-inverse)"
  },
  flag: {
    bg: "rgba(227,10,23,.08)",
    fg: "var(--red-turkish)",
    border: "rgba(227,10,23,.22)"
  }
};

/** Small static label: "Public", "Scholarship available", "Most popular". */
function Badge({
  children,
  tone = "brand",
  icon,
  dot = false,
  className,
  style
}) {
  const t = TONES[tone] || TONES.brand;
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "5px 12px",
      borderRadius: "var(--radius-pill)",
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.border}`,
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-caption)",
      fontWeight: "var(--fw-medium)",
      lineHeight: 1.3,
      whiteSpace: "nowrap",
      ...style
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "var(--radius-circle)",
      background: "currentColor",
      flex: "none"
    }
  }) : null, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/content/ServiceCard.jsx
try { (() => {
/** A Campus Turkey service. `emphasis="primary"` is reserved for Study in Türkiye. */
function ServiceCard({
  icon = "graduation-cap",
  title,
  description,
  points = [],
  badge,
  ctaLabel = "Learn more",
  href = "#",
  emphasis = "default",
  index,
  className,
  style
}) {
  const primary = emphasis === "primary";
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    interactive: true,
    href: href,
    className: className,
    surface: primary ? "brand" : "plain",
    elevation: primary ? "lg" : "sm",
    padding: primary ? "var(--space-10)" : "var(--space-8)",
    radius: primary ? "var(--radius-xl)" : "var(--radius-lg)",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      height: "100%",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: primary ? 56 : 46,
      height: primary ? 56 : 46,
      borderRadius: "var(--radius-md)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: primary ? "rgba(255,255,255,.18)" : "var(--green-050)",
      color: primary ? "var(--white)" : "var(--green-500)",
      border: primary ? "1px solid rgba(255,255,255,.24)" : "1px solid var(--green-100)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: primary ? 26 : 22
  })), typeof index === "number" ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: primary ? 40 : 28,
      lineHeight: 1,
      color: primary ? "rgba(255,255,255,.32)" : "var(--neutral-200)"
    }
  }, String(index).padStart(2, "0")) : null), badge ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: primary ? "onDark" : "brand"
  }, badge) : null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: primary ? "var(--fs-h2)" : "var(--fs-h3)",
      color: primary ? "var(--white)" : "var(--text-heading)",
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: primary ? "var(--fs-lead)" : "var(--fs-body-sm)",
      lineHeight: "var(--lh-body)",
      color: primary ? "rgba(255,255,255,.9)" : "var(--text-body)"
    }
  }, description), points.length ? /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, points.map(p => /*#__PURE__*/React.createElement("li", {
    key: p,
    style: {
      display: "flex",
      gap: "var(--space-2)",
      alignItems: "flex-start",
      fontSize: "var(--fs-body-sm)",
      color: primary ? "rgba(255,255,255,.88)" : "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 16,
    strokeWidth: 2.5,
    color: primary ? "var(--white)" : "var(--green-400)",
    style: {
      marginTop: 3
    }
  }), /*#__PURE__*/React.createElement("span", null, p)))) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      marginTop: "auto",
      paddingTop: "var(--space-4)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-semibold)",
      color: primary ? "var(--white)" : "var(--green-600)"
    }
  }, ctaLabel, " ", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-right",
    size: 16
  })));
}
Object.assign(__ds_scope, { ServiceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ServiceCard.jsx", error: String((e && e.message) || e) }); }

// components/content/UniversityCard.jsx
try { (() => {
/** Directory row / grid card for one university. */
function UniversityCard({
  name,
  city,
  type = "Public",
  languages = [],
  tuition,
  scholarship = false,
  image,
  programs,
  href = "#",
  layout = "grid",
  className,
  style
}) {
  const row = layout === "row";
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    interactive: true,
    href: href,
    padding: "0",
    className: className,
    style: {
      overflow: "hidden",
      display: "flex",
      flexDirection: row ? "row" : "column",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      width: row ? 180 : "100%",
      height: row ? "auto" : 168,
      minHeight: row ? 132 : undefined,
      background: image ? `center/cover no-repeat url(${image})` : "var(--gradient-brand)",
      display: "flex",
      alignItems: "flex-end",
      padding: "var(--space-3)"
    }
  }, !image ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "landmark",
    size: 26,
    color: "rgba(255,255,255,.7)"
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      padding: "var(--space-6)",
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: type === "Public" ? "brand" : "neutral"
  }, type), scholarship ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "solid",
    icon: "badge-check"
  }, "Scholarship") : null), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--fs-h4)",
      margin: 0
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-4)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-caption)",
      color: "var(--text-muted)"
    }
  }, city ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 13
  }), city) : null, languages.length ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "languages",
    size: 13
  }), languages.join(", ")) : null, typeof programs === "number" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "book-open",
    size: 13
  }), programs, " programs") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      marginTop: "auto",
      paddingTop: "var(--space-3)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      color: "var(--green-800)"
    }
  }, tuition ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontSize: "var(--fs-caption)"
    }
  }, "Tuition from "), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: "var(--fw-semibold)"
    }
  }, tuition)) : "Contact for tuition"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-semibold)",
      color: "var(--green-600)"
    }
  }, "View ", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-right",
    size: 15
  })))));
}
Object.assign(__ds_scope, { UniversityCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/UniversityCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
/* Geometry copied verbatim from the supplied `Button Hover.txt` reference:
   h-12 (48px) · p-1 · ps-6 (24px) · pe-14 (56px) · disc w-10 h-10 (40px) at right-1 (4px)
   hover: ps-14 pe-6 · disc travels to left calc(100% - 44px) and rotates 45deg · 500ms */
const SIZES = {
  sm: {
    h: 40,
    disc: 32,
    inset: 4,
    lead: 18,
    trail: 44,
    font: "var(--fs-caption)",
    glyph: 14
  },
  md: {
    h: 48,
    disc: 40,
    inset: 4,
    lead: 24,
    trail: 56,
    font: "var(--fs-body-sm)",
    glyph: 16
  },
  lg: {
    h: 56,
    disc: 46,
    inset: 5,
    lead: 28,
    trail: 64,
    font: "var(--fs-body)",
    glyph: 18
  }
};
const TONES = {
  primary: {
    bg: "var(--action-primary)",
    fg: "var(--text-on-brand)",
    border: "transparent",
    hoverBg: "var(--action-primary-hover)",
    discBg: "var(--white)",
    discFg: "var(--green-800)"
  },
  secondary: {
    bg: "var(--action-secondary-bg)",
    fg: "var(--action-secondary-fg)",
    border: "var(--border-subtle)",
    hoverBg: "var(--neutral-050)",
    discBg: "var(--green-900)",
    discFg: "var(--white)"
  },
  ghost: {
    bg: "transparent",
    fg: "var(--green-700)",
    border: "transparent",
    hoverBg: "var(--action-ghost-hover)",
    discBg: "var(--green-400)",
    discFg: "var(--white)"
  },
  outlineOnDark: {
    bg: "transparent",
    fg: "var(--white)",
    border: "var(--border-on-inverse)",
    hoverBg: "rgba(255,255,255,.12)",
    discBg: "var(--white)",
    discFg: "var(--green-800)"
  },
  onDark: {
    bg: "var(--white)",
    fg: "var(--green-900)",
    border: "transparent",
    hoverBg: "var(--green-050)",
    discBg: "var(--green-900)",
    discFg: "var(--white)"
  }
};

/** Primary action. At `size="lg"` the signature disc-swap hover is on by default:
 *  the trailing icon disc travels to the leading edge and rotates 45deg over 500ms. */
function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconSwap,
  href,
  disabled = false,
  fullWidth = false,
  type = "button",
  onClick,
  className,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const t = TONES[variant] || TONES.primary;
  const swap = iconSwap === undefined ? size === "lg" : iconSwap;
  const active = hover && !disabled;
  const travel = s.disc + s.inset * 2;
  const base = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: swap ? "flex-start" : "center",
    gap: swap ? 0 : "var(--space-2)",
    height: s.h,
    fontFamily: "var(--font-ui)",
    fontSize: s.font,
    fontWeight: "var(--fw-medium)",
    lineHeight: 1,
    borderRadius: "var(--radius-pill)",
    border: `1px solid ${t.border}`,
    background: active ? t.hoverBg : t.bg,
    color: t.fg,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    width: fullWidth ? "100%" : "fit-content",
    whiteSpace: "nowrap",
    overflow: "hidden",
    boxShadow: variant === "primary" && active ? "var(--shadow-brand)" : "none",
    transitionProperty: "padding, background, box-shadow, color",
    transitionDuration: "var(--dur-slow)",
    transitionTimingFunction: "var(--ease-out)",
    padding: swap ? active ? `0 ${s.lead}px 0 ${s.trail}px` : `0 ${s.trail}px 0 ${s.lead}px` : `0 ${s.lead + 4}px`,
    ...style
  };
  const content = swap ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      zIndex: 1
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: s.inset,
      left: active ? s.inset : `calc(100% - ${travel - s.inset}px)`,
      width: s.disc,
      height: s.disc,
      borderRadius: "var(--radius-circle)",
      background: t.discBg,
      color: t.discFg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: active ? "rotate(45deg)" : "rotate(0deg)",
      transition: `left var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out)`
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || "arrow-right",
    size: s.glyph,
    strokeWidth: 2.25
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.glyph - 1
  }) : null, /*#__PURE__*/React.createElement("span", null, children));
  const Tag = href && !disabled ? "a" : "button";
  return /*#__PURE__*/React.createElement(Tag, {
    className: className,
    style: base,
    href: href,
    type: Tag === "button" ? type : undefined,
    disabled: Tag === "button" ? disabled : undefined,
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false)
  }, content);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const TONES = {
  solid: {
    bg: "var(--action-primary)",
    fg: "var(--white)",
    border: "transparent",
    hover: "var(--action-primary-hover)"
  },
  quiet: {
    bg: "var(--white)",
    fg: "var(--green-800)",
    border: "var(--border-subtle)",
    hover: "var(--neutral-050)"
  },
  onDark: {
    bg: "rgba(255,255,255,.14)",
    fg: "var(--white)",
    border: "var(--border-on-inverse)",
    hover: "rgba(255,255,255,.26)"
  }
};

/** Square-ish circular button carrying a single Lucide glyph. */
function IconButton({
  icon,
  label,
  variant = "quiet",
  size = 44,
  onClick,
  href,
  className,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const t = TONES[variant] || TONES.quiet;
  const Tag = href ? "a" : "button";
  return /*#__PURE__*/React.createElement(Tag, {
    className: className,
    href: href,
    "aria-label": label,
    title: label,
    type: Tag === "button" ? "button" : undefined,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "var(--radius-circle)",
      background: hover ? t.hover : t.bg,
      color: t.fg,
      border: `1px solid ${t.border}`,
      cursor: "pointer",
      transition: `background var(--dur-base) var(--ease-out)`,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(size * 0.42)
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
/** Interactive filter chip used across the university directory. */
function Tag({
  children,
  selected = false,
  count,
  onClick,
  onRemove,
  className,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: className,
    onClick: onClick,
    "aria-pressed": selected,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      height: 36,
      padding: "0 14px",
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-medium)",
      cursor: "pointer",
      transition: `all var(--dur-fast) var(--ease-out)`,
      background: selected ? "var(--action-primary)" : hover ? "var(--green-050)" : "var(--white)",
      color: selected ? "var(--white)" : "var(--green-800)",
      border: `1px solid ${selected ? "transparent" : "var(--border-subtle)"}`,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", null, children), typeof count === "number" ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-caption)",
      opacity: selected ? 0.8 : 0.55
    }
  }, count) : null, selected && onRemove ? /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      display: "inline-flex",
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })) : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/** Checkbox / radio in one component; `type="radio"` renders the circular form. */
function Checkbox({
  id,
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  type = "checkbox",
  name,
  disabled,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    className: className,
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "flex-start",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? .55 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      flex: "none",
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: id,
    type: type,
    name: name,
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 22,
      height: 22,
      margin: 0,
      cursor: "inherit"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: type === "radio" ? "var(--radius-circle)" : "var(--radius-xs)",
      background: checked ? "var(--action-primary)" : "var(--white)",
      border: `1px solid ${checked ? "transparent" : "var(--border-strong)"}`,
      color: "var(--white)",
      transition: `all var(--dur-fast) var(--ease-out)`
    }
  }, checked ? type === "radio" ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "var(--radius-circle)",
      background: "var(--white)"
    }
  }) : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    strokeWidth: 3
  }) : null)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      color: "var(--green-800)",
      fontWeight: "var(--fw-medium)"
    }
  }, label), description ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--fs-caption)",
      color: "var(--text-muted)",
      lineHeight: 1.5
    }
  }, description) : null));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
const fieldBox = (focus, invalid) => ({
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  height: 52,
  padding: "0 16px",
  borderRadius: "var(--radius-sm)",
  background: "var(--white)",
  transition: `border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)`,
  border: `1px solid ${invalid ? "var(--status-danger)" : focus ? "var(--border-brand)" : "var(--border-subtle)"}`,
  boxShadow: focus ? "0 0 0 3px var(--focus-ring)" : "none"
});
function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-medium)",
      color: "var(--green-800)"
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--status-danger)"
    }
  }, " *") : null) : null, children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: "var(--fs-caption)",
      color: "var(--status-danger)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "alert-circle",
    size: 13
  }), error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-caption)",
      color: "var(--text-muted)"
    }
  }, hint) : null);
}

/** Single-line text input wrapped in a Field. */
function Input({
  id,
  label,
  hint,
  error,
  required,
  icon,
  type = "text",
  placeholder,
  value,
  defaultValue,
  onChange,
  disabled,
  className,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement(Field, {
    label: label,
    hint: hint,
    error: error,
    required: required,
    htmlFor: id,
    className: className,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...fieldBox(focus, !!error),
      opacity: disabled ? .55 : 1
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 17,
    color: "var(--neutral-500)"
  }) : null, /*#__PURE__*/React.createElement("input", {
    id: id,
    type: type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body)",
      color: "var(--green-900)"
    }
  })));
}
Object.assign(__ds_scope, { Field, Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
/** Native select styled to match Input, with a Lucide chevron. */
function Select({
  id,
  label,
  hint,
  error,
  required,
  options = [],
  value,
  defaultValue,
  placeholder = "Please choose",
  onChange,
  disabled,
  className,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement(__ds_scope.Field, {
    label: label,
    hint: hint,
    error: error,
    required: required,
    htmlFor: id,
    className: className,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      height: 52,
      borderRadius: "var(--radius-sm)",
      background: "var(--white)",
      opacity: disabled ? .55 : 1,
      border: `1px solid ${error ? "var(--status-danger)" : focus ? "var(--border-brand)" : "var(--border-subtle)"}`,
      boxShadow: focus ? "0 0 0 3px var(--focus-ring)" : "none",
      transition: `border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)`
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: id,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      flex: 1,
      height: "100%",
      padding: "0 44px 0 16px",
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body)",
      color: "var(--green-900)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options.map(o => {
    const val = typeof o === "string" ? o : o.value;
    const lab = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lab);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 16,
      pointerEvents: "none",
      color: "var(--neutral-500)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 17
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/StepIndicator.jsx
try { (() => {
/** Horizontal progress rail for the multi-step application form. */
function StepIndicator({
  steps = [],
  current = 0,
  theme = "light",
  className,
  style
}) {
  const dark = theme === "dark";
  return /*#__PURE__*/React.createElement("ol", {
    className: className,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 0,
      listStyle: "none",
      margin: 0,
      padding: 0,
      ...style
    }
  }, steps.map((s, i) => {
    const label = typeof s === "string" ? s : s.label;
    const done = i < current;
    const active = i === current;
    const fg = done || active ? "var(--action-primary)" : dark ? "rgba(255,255,255,.4)" : "var(--neutral-300)";
    return /*#__PURE__*/React.createElement("li", {
      key: label,
      style: {
        flex: i === steps.length - 1 ? "none" : 1,
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-2)",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "var(--radius-circle)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-caption)",
        fontWeight: "var(--fw-semibold)",
        background: done ? "var(--action-primary)" : active ? "var(--white)" : dark ? "rgba(255,255,255,.12)" : "var(--neutral-100)",
        color: done ? "var(--white)" : active ? "var(--green-700)" : dark ? "rgba(255,255,255,.6)" : "var(--neutral-500)",
        border: active ? "2px solid var(--action-primary)" : "2px solid transparent",
        transition: `all var(--dur-base) var(--ease-out)`
      }
    }, done ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 15,
      strokeWidth: 3
    }) : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-caption)",
        whiteSpace: "nowrap",
        fontWeight: active ? "var(--fw-semibold)" : "var(--fw-regular)",
        color: active ? dark ? "var(--white)" : "var(--green-800)" : dark ? "rgba(255,255,255,.62)" : "var(--text-muted)"
      }
    }, label)), i < steps.length - 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 2,
        marginTop: 15,
        borderRadius: 2,
        background: done ? "var(--action-primary)" : dark ? "rgba(255,255,255,.16)" : "var(--neutral-200)",
        transition: `background var(--dur-base) var(--ease-out)`
      }
    }) : null);
  }));
}
Object.assign(__ds_scope, { StepIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/StepIndicator.jsx", error: String((e && e.message) || e) }); }

// components/motion/ScrollReveal.jsx
try { (() => {
/** Scroll progress of a target element, 0 → 1, mapped over the
 *  "start 10% / end 50%" window used by the brand's scroll reference. */
function useSectionProgress(ref) {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const start = vh * 0.9;
      const end = -r.height + vh * 0.5;
      const v = (start - r.top) / Math.max(start - end, 1);
      setP(Math.min(1, Math.max(0, v)));
    };
    read();
    window.addEventListener("scroll", read, {
      passive: true
    });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [ref]);
  return p;
}

/** Fade-and-rise reveal, fired once by IntersectionObserver. The site-wide
 *  default entrance: opacity 0 → 1 with a 16px rise over --dur-reveal. */
function ScrollReveal({
  children,
  delay = 0,
  distance = 16,
  threshold = 0.15,
  once = true,
  as = "div",
  className,
  style
}) {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) setShown(false);
      });
    }, {
      threshold,
      rootMargin: "0px 0px -8% 0px"
    });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, {
    ref: ref,
    className: className,
    style: {
      opacity: shown ? 1 : 0,
      transform: shown ? "translateY(0)" : `translateY(${distance}px)`,
      transition: `opacity var(--dur-reveal) var(--ease-out) ${delay}ms, transform var(--dur-reveal) var(--ease-out) ${delay}ms`,
      willChange: "opacity, transform",
      ...style
    }
  }, children);
}

/** Page-top scroll progress hairline in the brand gradient. One per page. */
function ScrollProgress({
  height = 3,
  className,
  style
}) {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const read = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    read();
    window.addEventListener("scroll", read, {
      passive: true
    });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    "aria-hidden": "true",
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height,
      zIndex: 60,
      pointerEvents: "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${p * 100}%`,
      background: "var(--gradient-brand)",
      transition: "width 90ms linear"
    }
  }));
}

/** Sticky aside + scroll-tracked rail. The rail is a masked hairline that fills
 *  with the brand gradient as the section scrolls, and each child rises into
 *  place as it is reached — the composition of the brand's scroll reference. */
function StickyScrollSection({
  aside,
  items = [],
  stickyTop = 132,
  className,
  style
}) {
  const wrap = React.useRef(null);
  const p = useSectionProgress(wrap);
  return /*#__PURE__*/React.createElement("div", {
    ref: wrap,
    className: className,
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(260px,360px) 1fr",
      gap: "var(--space-16)",
      alignItems: "start",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      top: stickyTop
    }
  }, aside), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      paddingInlineStart: 48
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 15,
      top: 0,
      bottom: 0,
      width: 2,
      overflow: "hidden",
      background: "var(--neutral-200)",
      maskImage: "linear-gradient(to bottom,transparent 0%,black 10%,black 90%,transparent 100%)",
      WebkitMaskImage: "linear-gradient(to bottom,transparent 0%,black 10%,black 90%,transparent 100%)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      height: `${p * 100}%`,
      background: "var(--gradient-brand)",
      opacity: Math.min(1, p * 10),
      transition: "height 120ms linear"
    }
  })), /*#__PURE__*/React.createElement("ol", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-12)",
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, items.map((it, i) => {
    const reached = p >= (i + 0.35) / Math.max(items.length, 1);
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        position: "relative",
        opacity: reached ? 1 : 0.45,
        transform: reached ? "none" : "translateY(12px)",
        transition: `opacity var(--dur-reveal) var(--ease-out), transform var(--dur-reveal) var(--ease-out)`
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: -48,
        top: 2,
        width: 32,
        height: 32,
        borderRadius: "var(--radius-circle)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: reached ? "var(--action-primary)" : "var(--white)",
        border: `2px solid ${reached ? "var(--action-primary)" : "var(--neutral-200)"}`,
        color: reached ? "var(--white)" : "var(--neutral-400)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-caption)",
        fontWeight: "var(--fw-semibold)",
        transition: `all var(--dur-base) var(--ease-out)`
      }
    }, i + 1), it.content);
  }))));
}
Object.assign(__ds_scope, { useSectionProgress, ScrollReveal, ScrollProgress, StickyScrollSection });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/motion/ScrollReveal.jsx", error: String((e && e.message) || e) }); }

// components/navigation/LanguageSwitcher.jsx
try { (() => {
const LANGUAGES = [{
  code: "EN",
  label: "English",
  flag: "🇬🇧",
  dir: "ltr"
}, {
  code: "AR",
  label: "العربية",
  flag: "🇸🇦",
  dir: "rtl"
}, {
  code: "FR",
  label: "Français",
  flag: "🇫🇷",
  dir: "ltr"
}, {
  code: "TR",
  label: "Türkçe",
  flag: "🇹🇷",
  dir: "ltr"
}, {
  code: "RU",
  label: "Русский",
  flag: "🇷🇺",
  dir: "ltr"
}, {
  code: "SW",
  label: "Kiswahili",
  flag: "🇰🇪",
  dir: "ltr"
}];

/** Language preference control. Deliberately loud: flag + language code are
 *  always visible, never hidden behind a globe icon alone. */
function LanguageSwitcher({
  value = "EN",
  languages = LANGUAGES,
  theme = "onDark",
  display = "dropdown",
  onChange,
  className,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const current = languages.find(l => l.code === value) || languages[0];
  const onDark = theme === "onDark";
  const pill = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    height: 40,
    padding: "0 14px",
    borderRadius: "var(--radius-pill)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    fontSize: "var(--fs-body-sm)",
    fontWeight: "var(--fw-semibold)",
    letterSpacing: ".04em",
    transition: `all var(--dur-fast) var(--ease-out)`,
    background: onDark ? "rgba(255,255,255,.16)" : "var(--white)",
    color: onDark ? "var(--white)" : "var(--green-800)",
    border: `1px solid ${onDark ? "var(--border-on-inverse)" : "var(--border-subtle)"}`
  };
  if (display === "pills") {
    return /*#__PURE__*/React.createElement("div", {
      className: className,
      style: {
        display: "flex",
        gap: "var(--space-2)",
        flexWrap: "wrap",
        ...style
      }
    }, languages.map(l => {
      const on = l.code === value;
      return /*#__PURE__*/React.createElement("button", {
        key: l.code,
        type: "button",
        onClick: () => onChange && onChange(l.code),
        "aria-pressed": on,
        style: {
          ...pill,
          background: on ? "var(--action-primary)" : pill.background,
          color: on ? "var(--white)" : pill.color,
          border: `1px solid ${on ? "transparent" : pill.border.split(" ").slice(2).join(" ")}`
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 16,
          lineHeight: 1
        }
      }, l.flag), l.code);
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      position: "relative",
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(!open),
    "aria-expanded": open,
    "aria-label": "Change language",
    style: pill
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      lineHeight: 1
    }
  }, current.flag), /*#__PURE__*/React.createElement("span", null, current.code), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15,
    style: {
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform var(--dur-base) var(--ease-out)"
    }
  })), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 8px)",
      right: 0,
      zIndex: 60,
      minWidth: 208,
      background: "var(--white)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-lg)",
      padding: "var(--space-2)",
      animation: "var(--anim-fade-in-down)"
    }
  }, languages.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.code,
    type: "button",
    onClick: () => {
      onChange && onChange(l.code);
      setOpen(false);
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      width: "100%",
      padding: "10px 12px",
      border: "none",
      borderRadius: "var(--radius-xs)",
      cursor: "pointer",
      background: l.code === value ? "var(--green-050)" : "transparent",
      color: "var(--green-800)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      lineHeight: 1
    }
  }, l.flag), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, l.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--fw-semibold)",
      opacity: .5,
      letterSpacing: ".05em"
    }
  }, l.code)))) : null);
}
Object.assign(__ds_scope, { LANGUAGES, LanguageSwitcher });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/LanguageSwitcher.jsx", error: String((e && e.message) || e) }); }

// components/navigation/MegaMenuPanel.jsx
try { (() => {
const linkRow = {
  display: "flex",
  gap: "var(--space-3)",
  padding: "9px 10px",
  borderRadius: "var(--radius-xs)",
  color: "var(--green-900)",
  transition: "background var(--dur-fast) var(--ease-out)"
};
function Row({
  l,
  tile
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: l.href || "#",
    style: linkRow,
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--green-050)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
    }
  }, tile && l.icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      width: 36,
      height: 36,
      borderRadius: "var(--radius-xs)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--green-050)",
      border: "1px solid var(--green-100)",
      color: "var(--green-500)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: l.icon,
    size: 18
  })) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-medium)",
      whiteSpace: "nowrap"
    }
  }, l.label), l.description ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--fs-caption)",
      color: "var(--text-muted)",
      lineHeight: 1.45
    }
  }, l.description) : null));
}

/** Mega-menu contents: icon-tile link groups, optional plain link columns, and an
 *  optional featured panel on the trailing edge. */
function MegaMenuPanel({
  groups = [],
  columns = [],
  feature,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: "flex",
      gap: "var(--space-8)",
      padding: "var(--space-6)",
      alignItems: "flex-start",
      ...style
    }
  }, groups.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-8)"
    }
  }, groups.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.title,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 220
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-eyebrow",
    style: {
      padding: "0 10px",
      marginBottom: "var(--space-2)"
    }
  }, g.title), g.links.map(l => /*#__PURE__*/React.createElement(Row, {
    key: l.label,
    l: l,
    tile: true
  }))))) : null, feature ? /*#__PURE__*/React.createElement("a", {
    href: feature.href || "#",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      width: 260,
      alignSelf: "stretch",
      padding: "var(--space-5)",
      borderRadius: "var(--radius-md)",
      background: "var(--gradient-brand)",
      color: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: feature.icon || "graduation-cap",
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h4)",
      lineHeight: 1.25,
      marginBottom: 6
    }
  }, feature.title), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--fs-caption)",
      opacity: .88,
      lineHeight: 1.5
    }
  }, feature.description)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: "var(--fs-caption)",
      fontWeight: "var(--fw-semibold)"
    }
  }, feature.cta || "Learn more", " ", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-right",
    size: 14
  }))) : null, columns.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-8)",
      paddingInlineStart: "var(--space-2)",
      borderInlineStart: "1px solid var(--border-subtle)"
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.title,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 0,
      minWidth: 150
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-eyebrow",
    style: {
      padding: "0 10px",
      marginBottom: "var(--space-2)"
    }
  }, c.title), c.links.map(l => /*#__PURE__*/React.createElement(Row, {
    key: l.label,
    l: l
  }))))) : null);
}
Object.assign(__ds_scope, { MegaMenuPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/MegaMenuPanel.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Navbar.jsx
try { (() => {
/* Spring 350 stiffness / 32 damping / 0 bounce from `nav bar animation.txt`,
   approximated as a critically-damped CSS curve so no motion library is needed. */
const SPRING = "cubic-bezier(.22,1,.28,1)";
const SPRING_MS = 380;

/** Static floating pill navigation. It does not change surface, size or theme on
 *  scroll — it stays exactly as it lands. Hover slides a single highlight pill
 *  between links; mega menus share one morphing viewport that travels to sit
 *  under the active trigger and slides its content in from the travel direction. */
function Navbar({
  items = [],
  activeItem,
  lang = "EN",
  onLangChange,
  ctaLabel = "Apply Now",
  ctaHref = "#apply",
  secondaryLabel = "Book a Consultation",
  logoHeight = 34,
  assetBase = "assets",
  onSelect,
  className,
  style
}) {
  const navRef = React.useRef(null);
  const listRef = React.useRef(null);
  const measureRef = React.useRef(null);
  const triggers = React.useRef({});
  const lastOpen = React.useRef("");
  const [highlight, setHighlight] = React.useState(null);
  const [open, setOpen] = React.useState("");
  const [dir, setDir] = React.useState(1);
  const [vp, setVp] = React.useState({
    x: 0,
    w: 0,
    h: 0
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [entering, setEntering] = React.useState(false);
  const openPanel = label => {
    if (label === lastOpen.current) return;
    const order = items.map(i => i.label);
    const from = order.indexOf(lastOpen.current);
    const to = order.indexOf(label);
    if (from !== -1 && to !== -1) setDir(to > from ? 1 : -1);
    lastOpen.current = label;
    setOpen(label);
    setEntering(true);
  };
  const closeAll = () => {
    lastOpen.current = "";
    setOpen("");
    setHighlight(null);
  };
  const moveHighlight = el => {
    if (!el || !listRef.current) return;
    const a = el.getBoundingClientRect();
    const b = listRef.current.getBoundingClientRect();
    setHighlight({
      x: a.left - b.left,
      w: a.width
    });
  };
  const panel = items.find(i => i.label === open && i.children);
  React.useLayoutEffect(() => {
    if (!panel) {
      setVp(v => ({
        ...v,
        w: 0,
        h: 0
      }));
      return;
    }
    const measure = () => {
      const m = measureRef.current,
        n = navRef.current,
        t = triggers.current[open];
      if (!m || !n) return;
      const w = m.offsetWidth,
        h = m.offsetHeight;
      const nr = n.getBoundingClientRect();
      let x = nr.width / 2;
      if (t) {
        const tr = t.getBoundingClientRect();
        x = tr.left - nr.left + tr.width / 2;
      }
      const half = w / 2,
        margin = 8;
      if (x - half < margin) x = margin + half;
      if (x + half > nr.width - margin) x = nr.width - margin - half;
      setVp({
        x,
        w,
        h
      });
    };
    measure();
    const id = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && measureRef.current) ro.observe(measureRef.current);
    window.addEventListener("resize", measure);
    const t = setTimeout(() => setEntering(false), 20);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, panel]);
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    onMouseLeave: closeAll,
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      padding: "var(--space-5) var(--gutter)",
      pointerEvents: "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("nav", {
    ref: navRef,
    onKeyDown: e => {
      if (e.key === "Escape") closeAll();
    },
    style: {
      position: "relative",
      pointerEvents: "auto",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "8px 8px 8px 14px",
      borderRadius: "var(--radius-pill)",
      background: "rgba(255,255,255,.94)",
      backdropFilter: "var(--blur-nav)",
      WebkitBackdropFilter: "var(--blur-nav)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-float)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#home",
    "aria-label": "Campus Turkey home",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
      width: 44,
      height: 44,
      borderRadius: "var(--radius-circle)",
      background: "var(--gradient-brand)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "mark",
    theme: "reversed",
    height: logoHeight - 8,
    assetBase: assetBase
  })), /*#__PURE__*/React.createElement("ul", {
    ref: listRef,
    onMouseLeave: () => setHighlight(null),
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 2,
      listStyle: "none",
      margin: 0,
      padding: 0,
      marginInlineStart: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      borderRadius: "var(--radius-pill)",
      background: "var(--green-050)",
      pointerEvents: "none",
      transform: `translateX(${highlight ? highlight.x : 0}px)`,
      width: highlight ? highlight.w : 0,
      opacity: highlight ? 1 : 0,
      transition: `transform ${SPRING_MS}ms ${SPRING}, width ${SPRING_MS}ms ${SPRING}, opacity var(--dur-fast) var(--ease-out)`
    }
  }), items.map(item => {
    const isOpen = open === item.label;
    const isActive = activeItem === item.label;
    return /*#__PURE__*/React.createElement("li", {
      key: item.label,
      style: {
        position: "relative",
        zIndex: 1
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: item.href || "#",
      ref: el => {
        triggers.current[item.label] = el;
      },
      onMouseEnter: e => {
        moveHighlight(e.currentTarget);
        item.children ? openPanel(item.label) : closeAll();
      },
      onFocus: e => {
        moveHighlight(e.currentTarget);
        if (item.children) openPanel(item.label);
      },
      onClick: e => {
        if (onSelect) onSelect(item, e);
      },
      "aria-expanded": item.children ? isOpen : undefined,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 40,
        padding: "0 14px",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-body-sm)",
        fontWeight: "var(--fw-medium)",
        whiteSpace: "nowrap",
        color: isActive || isOpen ? "var(--green-700)" : "var(--green-900)",
        transition: `color var(--dur-fast) var(--ease-out)`
      }
    }, item.label, item.children ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "chevron-down",
      size: 14,
      strokeWidth: 2.5,
      style: {
        transform: isOpen ? "rotate(180deg) translateY(-1px)" : "none",
        transition: `transform ${SPRING_MS}ms ${SPRING}`
      }
    }) : null));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      marginInlineStart: "auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.LanguageSwitcher, {
    value: lang,
    onChange: onLangChange,
    theme: "onLight"
  }), secondaryLabel ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "sm",
    href: "#consultation"
  }, secondaryLabel) : null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    href: ctaHref
  }, ctaLabel), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Menu",
    "aria-expanded": mobileOpen,
    onClick: () => setMobileOpen(!mobileOpen),
    "data-ct-hamburger": true,
    style: {
      display: "none",
      flexDirection: "column",
      gap: 4,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      background: "transparent",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      width: 20,
      height: 2,
      background: "var(--green-900)",
      transition: `transform var(--dur-base) var(--ease-hamburger)`,
      transform: mobileOpen ? "translateY(3px) rotate(45deg)" : "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      width: 20,
      height: 2,
      background: "var(--green-900)",
      transition: `transform var(--dur-base) var(--ease-hamburger)`,
      transform: mobileOpen ? "translateY(-3px) rotate(-45deg)" : "none"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": !panel,
    style: {
      position: "absolute",
      top: "100%",
      left: vp.x,
      transform: "translateX(-50%)",
      display: "flex",
      justifyContent: "center",
      pointerEvents: panel ? "auto" : "none",
      transition: `left ${SPRING_MS}ms ${SPRING}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginTop: 10,
      overflow: "hidden",
      width: panel ? vp.w : 0,
      height: panel ? vp.h : 0,
      opacity: panel ? 1 : 0,
      transform: panel ? "scale(1)" : "scale(.96)",
      borderRadius: "var(--radius-lg)",
      background: "var(--white)",
      border: panel ? "1px solid var(--border-subtle)" : "1px solid transparent",
      boxShadow: panel ? "var(--shadow-lg)" : "none",
      transition: `width ${SPRING_MS}ms ${SPRING}, height ${SPRING_MS}ms ${SPRING}, opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: open,
    style: {
      transform: entering ? `translateX(${100 * dir}%)` : "translateX(0)",
      opacity: entering ? 0 : 1,
      transition: `transform ${SPRING_MS}ms ${SPRING}, opacity ${SPRING_MS}ms ${SPRING}`
    }
  }, panel ? panel.children : null))), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    ref: measureRef,
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      width: "max-content",
      visibility: "hidden",
      pointerEvents: "none"
    }
  }, panel ? panel.children : null)));
}
Object.assign(__ds_scope, { Navbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Navbar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/WhatsAppButton.jsx
try { (() => {
/** Persistent WhatsApp entry point, pinned bottom-end on every page. */
function WhatsAppButton({
  phone = "+90 000 000 0000",
  message = "Hello Campus Turkey, I would like to ask about studying in Türkiye.",
  label = "Chat on WhatsApp",
  expanded = true,
  position = "fixed",
  className,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const href = `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
  return /*#__PURE__*/React.createElement("a", {
    className: className,
    href: href,
    target: "_blank",
    rel: "noreferrer",
    "aria-label": label,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position,
      bottom: position === "fixed" ? 24 : undefined,
      right: position === "fixed" ? 24 : undefined,
      zIndex: 80,
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-3)",
      height: 56,
      padding: expanded ? "0 22px 0 18px" : 0,
      width: expanded ? "auto" : 56,
      justifyContent: "center",
      borderRadius: "var(--radius-pill)",
      background: hover ? "var(--green-600)" : "var(--green-400)",
      color: "var(--white)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-semibold)",
      boxShadow: "var(--shadow-float)",
      transition: `background var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)`,
      transform: hover ? "translateY(-2px)" : "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "message-circle",
    size: 22
  }), expanded ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { WhatsAppButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/WhatsAppButton.jsx", error: String((e && e.message) || e) }); }

// components/sections/Accordion.jsx
try { (() => {
/** FAQ accordion. One panel open at a time by default. */
function Accordion({
  items = [],
  defaultOpen = 0,
  allowMultiple = false,
  className,
  style
}) {
  const [open, setOpen] = React.useState(defaultOpen === null ? [] : [defaultOpen]);
  const toggle = i => setOpen(cur => cur.includes(i) ? cur.filter(x => x !== i) : allowMultiple ? [...cur, i] : [i]);
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      ...style
    }
  }, items.map((item, i) => {
    const isOpen = open.includes(i);
    return /*#__PURE__*/React.createElement("div", {
      key: item.question,
      style: {
        borderRadius: "var(--radius-md)",
        background: "var(--white)",
        border: `1px solid ${isOpen ? "var(--green-200)" : "var(--border-subtle)"}`,
        boxShadow: isOpen ? "var(--shadow-md)" : "var(--shadow-none)",
        transition: `border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)`,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => toggle(i),
      "aria-expanded": isOpen,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        width: "100%",
        padding: "var(--space-5) var(--space-6)",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "start"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontFamily: "var(--font-display)",
        fontSize: "var(--fs-h4)",
        color: "var(--text-heading)"
      }
    }, item.question), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "none",
        width: 32,
        height: 32,
        borderRadius: "var(--radius-circle)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: isOpen ? "var(--action-primary)" : "var(--green-050)",
        color: isOpen ? "var(--white)" : "var(--green-600)",
        transform: isOpen ? "rotate(180deg)" : "none",
        transition: `all var(--dur-base) var(--ease-out)`
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "chevron-down",
      size: 17
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateRows: isOpen ? "1fr" : "0fr",
        transition: `grid-template-rows var(--dur-base) var(--ease-out)`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 var(--space-6) var(--space-6)",
        maxWidth: 720,
        fontSize: "var(--fs-body)",
        lineHeight: "var(--lh-body)",
        color: "var(--text-body)"
      }
    }, item.answer))));
  }));
}
Object.assign(__ds_scope, { Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/sections/CTABanner.jsx
try { (() => {
/** Full-width conversion banner. Green gradient, hero-family composition. */
function CTABanner({
  eyebrow,
  title,
  body,
  primaryLabel = "Apply Now",
  primaryHref = "#apply",
  secondaryLabel = "Book a Consultation",
  secondaryHref = "#consultation",
  showMark = true,
  assetBase = "assets",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: className,
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: "var(--radius-xl)",
      background: "var(--gradient-brand)",
      color: "var(--white)",
      padding: "clamp(40px,6vw,80px) var(--gutter)",
      textAlign: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-5)",
      maxWidth: 720,
      margin: "0 auto",
      position: "relative",
      zIndex: 1
    }
  }, showMark ? /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "mark",
    theme: "reversed",
    height: 56,
    assetBase: assetBase
  }) : null, eyebrow ? /*#__PURE__*/React.createElement("span", {
    className: "ct-eyebrow",
    style: {
      color: "rgba(255,255,255,.78)"
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--fs-h1)",
      color: "var(--white)",
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.BrandDivider, {
    theme: "dark",
    style: {
      maxWidth: 200
    }
  }), body ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--fs-lead)",
      lineHeight: "var(--lh-body)",
      color: "rgba(255,255,255,.9)"
    }
  }, body) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-3)",
      justifyContent: "center",
      marginTop: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "onDark",
    size: "lg",
    href: primaryHref
  }, primaryLabel), secondaryLabel ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outlineOnDark",
    size: "lg",
    href: secondaryHref
  }, secondaryLabel) : null)));
}
Object.assign(__ds_scope, { CTABanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/CTABanner.jsx", error: String((e && e.message) || e) }); }

// components/sections/DirectoryToolbar.jsx
try { (() => {
/** Result-count / sort / clear-filters bar plus load-more control for the
 *  university directory. Pagination is a "load more" button by design: it is
 *  the simplest possible path on a phone. */
function DirectoryToolbar({
  total = 0,
  shown = 0,
  sort = "Most popular",
  sortOptions = ["Most popular", "Name A to Z", "Lowest tuition"],
  onSortChange,
  onClear,
  view = "grid",
  onViewChange,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "var(--space-4)",
      padding: "var(--space-4) var(--space-5)",
      borderRadius: "var(--radius-md)",
      background: "var(--surface-subtle)",
      border: "1px solid var(--border-subtle)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      color: "var(--green-800)"
    }
  }, "Showing ", /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: "var(--fw-semibold)"
    }
  }, shown), " of ", total, " universities"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClear,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      color: "var(--green-600)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "rotate-ccw",
    size: 14
  }), "Clear filters"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      marginInlineStart: "auto"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-caption)",
      color: "var(--text-muted)"
    }
  }, "Sort"), /*#__PURE__*/React.createElement("select", {
    value: sort,
    onChange: onSortChange,
    style: {
      height: 38,
      padding: "0 12px",
      borderRadius: "var(--radius-xs)",
      border: "1px solid var(--border-subtle)",
      background: "var(--white)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      color: "var(--green-800)",
      cursor: "pointer"
    }
  }, sortOptions.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2,
      padding: 3,
      borderRadius: "var(--radius-pill)",
      background: "var(--white)",
      border: "1px solid var(--border-subtle)"
    }
  }, [["grid", "layout-grid"], ["list", "list"]].map(([v, ic]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => onViewChange && onViewChange(v),
    "aria-label": `${v} view`,
    style: {
      width: 32,
      height: 30,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      background: view === v ? "var(--green-050)" : "transparent",
      color: view === v ? "var(--green-600)" : "var(--neutral-400)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ic,
    size: 16
  }))))));
}
Object.assign(__ds_scope, { DirectoryToolbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/DirectoryToolbar.jsx", error: String((e && e.message) || e) }); }

// components/sections/Footer.jsx
try { (() => {
/** Site footer. Deliberately in the same compositional family as the hero:
 *  deep green field, centred brand presence, dots-and-rule divider. */
function Footer({
  columns = [],
  contact,
  lang = "EN",
  onLangChange,
  socials = [],
  legal = "© 2026 Campus Turkey. All rights reserved.",
  assetBase = "assets",
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: className,
    style: {
      background: "var(--gradient-brand-deep)",
      color: "var(--text-on-inverse)",
      borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
      padding: "var(--section-y) 0 var(--space-8)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-12)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-12)",
      alignItems: "flex-start",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)",
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "lockup",
    theme: "reversed",
    height: 72,
    assetBase: assetBase,
    href: "#home"
  }), contact ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      fontSize: "var(--fs-body-sm)"
    }
  }, contact.address ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 16,
    color: "var(--green-300)"
  }), contact.address) : null, contact.phone ? /*#__PURE__*/React.createElement("a", {
    href: `tel:${contact.phone.replace(/\s/g, "")}`,
    style: {
      display: "flex",
      gap: "var(--space-2)",
      color: "inherit"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "phone",
    size: 16,
    color: "var(--green-300)"
  }), contact.phone) : null, contact.email ? /*#__PURE__*/React.createElement("a", {
    href: `mailto:${contact.email}`,
    style: {
      display: "flex",
      gap: "var(--space-2)",
      color: "inherit"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "mail",
    size: 16,
    color: "var(--green-300)"
  }), contact.email) : null, contact.whatsapp ? /*#__PURE__*/React.createElement("a", {
    href: "#whatsapp",
    style: {
      display: "flex",
      gap: "var(--space-2)",
      color: "inherit"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "message-circle",
    size: 16,
    color: "var(--green-300)"
  }), contact.whatsapp) : null) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${Math.min(Math.max(columns.length, 1), 4)},minmax(140px,auto))`,
      gap: "var(--space-10)"
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("nav", {
    key: c.title,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ct-eyebrow",
    style: {
      color: "var(--green-300)"
    }
  }, c.title), c.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.label,
    href: l.href || "#",
    style: {
      color: "rgba(255,255,255,.82)",
      fontSize: "var(--fs-body-sm)"
    }
  }, l.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ct-eyebrow",
    style: {
      color: "var(--green-300)"
    }
  }, "Language"), /*#__PURE__*/React.createElement(__ds_scope.LanguageSwitcher, {
    value: lang,
    onChange: onLangChange,
    theme: "onDark",
    display: "pills"
  }))), /*#__PURE__*/React.createElement(__ds_scope.BrandDivider, {
    theme: "dark"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-5)",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-caption)",
      color: "rgba(255,255,255,.62)"
    }
  }, legal), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)"
    }
  }, socials.map(s => /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    key: s.icon,
    icon: s.icon,
    label: s.label,
    href: s.href,
    variant: "onDark",
    size: 40
  }))))));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/Footer.jsx", error: String((e && e.message) || e) }); }

// components/sections/TimelineTrack.jsx
try { (() => {
/** Vertical scroll-tracked process timeline. The progress rail fills as the
 *  section scrolls, matching the brand's scroll-driven reveal pattern. */
function TimelineTrack({
  steps = [],
  className,
  style
}) {
  const wrap = React.useRef(null);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const p = (vh * 0.9 - r.top) / Math.max(r.height, 1);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, {
      passive: true
    });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: wrap,
    className: className,
    style: {
      position: "relative",
      paddingInlineStart: 44,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 15,
      top: 8,
      bottom: 8,
      width: 2,
      background: "var(--neutral-200)",
      borderRadius: 2,
      maskImage: "linear-gradient(to bottom,transparent 0%,black 10%,black 90%,transparent 100%)",
      WebkitMaskImage: "linear-gradient(to bottom,transparent 0%,black 10%,black 90%,transparent 100%)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 15,
      top: 8,
      width: 2,
      height: `calc((100% - 16px) * ${progress})`,
      background: "var(--gradient-brand)",
      borderRadius: 2,
      opacity: Math.min(1, progress * 10),
      maskImage: "linear-gradient(to bottom,transparent 0%,black 10%,black 100%)",
      WebkitMaskImage: "linear-gradient(to bottom,transparent 0%,black 10%,black 100%)",
      transition: "height 120ms linear"
    }
  }), /*#__PURE__*/React.createElement("ol", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-10)",
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, steps.map((s, i) => {
    const reached = progress >= (i + 0.5) / Math.max(steps.length, 1);
    return /*#__PURE__*/React.createElement("li", {
      key: s.title,
      style: {
        position: "relative",
        opacity: reached ? 1 : 0.55,
        transform: reached ? "none" : "translateY(8px)",
        transition: `all var(--dur-base) var(--ease-out)`
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: -44,
        top: 0,
        width: 32,
        height: 32,
        marginLeft: 0,
        borderRadius: "var(--radius-circle)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: reached ? "var(--action-primary)" : "var(--white)",
        border: `2px solid ${reached ? "var(--action-primary)" : "var(--neutral-200)"}`,
        color: reached ? "var(--white)" : "var(--neutral-400)",
        transition: `all var(--dur-base) var(--ease-out)`
      }
    }, s.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: s.icon,
      size: 15
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-caption)",
        fontWeight: "var(--fw-semibold)"
      }
    }, i + 1)), s.meta ? /*#__PURE__*/React.createElement("span", {
      className: "ct-eyebrow",
      style: {
        display: "block",
        marginBottom: 6
      }
    }, s.meta) : null, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: "var(--fs-h3)",
        margin: "0 0 var(--space-2)"
      }
    }, s.title), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: "var(--fs-body)",
        lineHeight: "var(--lh-body)",
        color: "var(--text-body)",
        maxWidth: 560
      }
    }, s.description));
  })));
}
Object.assign(__ds_scope, { TimelineTrack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/TimelineTrack.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ApplyScreen.jsx
try { (() => {
const DSA = window.CampusTurkeyDesignSystem_4d33e7;
const {
  Button,
  Icon,
  Card,
  Input,
  Select,
  Checkbox,
  StepIndicator,
  SectionHeading,
  Badge,
  BrandDivider,
  Logo,
  ScrollReveal
} = DSA;
const AA = "../../assets";
const STEPS = ["You", "Study plan", "Documents", "Done"];
function ApplyScreen({
  onHome
}) {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    level: "",
    field: "",
    city: "",
    intake: "",
    consent: true
  });
  const set = k => e => setForm({
    ...form,
    [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-subtle)",
      paddingTop: 140,
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      maxWidth: 900,
      paddingBottom: "var(--section-y)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Student application",
    title: "Apply in four short steps",
    lead: "Nothing to upload yet. Tell us who you are and what you want to study."
  })), /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-10)",
    elevation: "md",
    radius: "var(--radius-xl)"
  }, /*#__PURE__*/React.createElement(StepIndicator, {
    steps: STEPS,
    current: step,
    style: {
      marginBottom: "var(--space-10)"
    }
  }), step === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "a-name",
    label: "Full name",
    icon: "user",
    placeholder: "Amina Yusuf",
    required: true,
    value: form.name,
    onChange: set("name")
  }), /*#__PURE__*/React.createElement(Input, {
    id: "a-email",
    label: "Email address",
    type: "email",
    icon: "mail",
    placeholder: "you@example.com",
    required: true,
    value: form.email,
    onChange: set("email")
  }), /*#__PURE__*/React.createElement(Input, {
    id: "a-phone",
    label: "WhatsApp number",
    icon: "phone",
    hint: "Include your country code.",
    value: form.phone,
    onChange: set("phone")
  }), /*#__PURE__*/React.createElement(Select, {
    id: "a-country",
    label: "Country of residence",
    options: ["Nigeria", "Morocco", "Kenya", "Egypt", "Pakistan", "Indonesia", "Other"],
    value: form.country,
    onChange: set("country"),
    required: true
  })) : null, step === 1 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Select, {
    id: "a-level",
    label: "Study level",
    options: ["Bachelor", "Master", "PhD", "Language course"],
    value: form.level,
    onChange: set("level"),
    required: true
  }), /*#__PURE__*/React.createElement(Input, {
    id: "a-field",
    label: "Field of study",
    icon: "book-open",
    placeholder: "Medicine, engineering, business\u2026",
    value: form.field,
    onChange: set("field")
  }), /*#__PURE__*/React.createElement(Select, {
    id: "a-city",
    label: "Preferred city",
    options: ["Any city", "Istanbul", "Ankara", "Izmir", "Antalya"],
    value: form.city,
    onChange: set("city")
  }), /*#__PURE__*/React.createElement(Select, {
    id: "a-intake",
    label: "Intake",
    options: ["Autumn 2026", "Spring 2027", "Not sure yet"],
    value: form.intake,
    onChange: set("intake")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "span 2",
      display: "flex",
      gap: "var(--space-3)",
      padding: "var(--space-4)",
      borderRadius: "var(--radius-sm)",
      background: "var(--green-050)",
      border: "1px solid var(--green-100)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 18,
    color: "var(--green-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-body-sm)",
      color: "var(--green-800)"
    }
  }, "Public universities are highly subsidised. Private universities offer scholarships. We will show you both."))) : null, step === 2 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)"
    }
  }, ["Passport copy", "High school or degree certificate", "Transcript of grades"].map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      padding: "var(--space-5)",
      borderRadius: "var(--radius-sm)",
      border: "1px dashed var(--border-strong)",
      background: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload",
    size: 20,
    color: "var(--green-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-medium)",
      color: "var(--green-800)"
    }
  }, d), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--fs-caption)",
      color: "var(--text-muted)"
    }
  }, "PDF or photo. You can send these later on WhatsApp.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Choose file"))), /*#__PURE__*/React.createElement(Checkbox, {
    id: "a-consent",
    label: "Contact me on WhatsApp about my application",
    description: "We reply within one working day. No marketing messages.",
    checked: form.consent,
    onChange: set("consent")
  })) : null, step === 3 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-5)",
      textAlign: "center",
      padding: "var(--space-6) 0"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark",
    theme: "onLight",
    height: 64,
    assetBase: AA
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "brand",
    icon: "check"
  }, "Application received"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--fs-h2)"
    }
  }, "Thank you", form.name ? `, ${form.name.split(" ")[0]}` : "", "."), /*#__PURE__*/React.createElement(BrandDivider, {
    style: {
      maxWidth: 220
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 460,
      color: "var(--text-body)"
    }
  }, "We are matching you with universities now. You will get a shortlist with real tuition and deadlines within one working day."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      flexWrap: "wrap",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "message-circle"
  }, "Message us on WhatsApp"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: onHome
  }, "Back to home"))) : null, step < 3 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      marginTop: "var(--space-10)",
      paddingTop: "var(--space-6)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "arrow-left",
    onClick: () => setStep(Math.max(0, step - 1)),
    disabled: step === 0
  }, "Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => setStep(step + 1)
  }, step === 2 ? "Submit application" : "Continue")) : null)));
}
function PartnerLoginScreen({
  onHome
}) {
  const [tab, setTab] = React.useState("login");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1.05fr 1fr"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gradient-brand-deep)",
      padding: "var(--section-y) var(--gutter)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-8)",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "lockup",
    theme: "reversed",
    height: 96,
    assetBase: AA
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      color: "var(--white)",
      fontSize: "var(--fs-h1)",
      maxWidth: 460
    }
  }, "Partner and representative portal"), /*#__PURE__*/React.createElement(BrandDivider, {
    theme: "dark",
    style: {
      maxWidth: 280
    }
  }), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      maxWidth: 420
    }
  }, ["Track every student you refer", "See commission and payment status", "Download university brochures and price lists", "Register new applicants in one form"].map(t => /*#__PURE__*/React.createElement("li", {
    key: t,
    style: {
      display: "flex",
      gap: "var(--space-3)",
      color: "rgba(255,255,255,.88)",
      fontSize: "var(--fs-body)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "var(--green-300)",
    strokeWidth: 2.5
  }), t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-page)",
      padding: "var(--section-y) var(--gutter)",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 420,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      padding: 4,
      borderRadius: "var(--radius-pill)",
      background: "var(--surface-subtle)",
      border: "1px solid var(--border-subtle)"
    }
  }, [["login", "Partner login"], ["register", "Register"]].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    type: "button",
    onClick: () => setTab(k),
    style: {
      flex: 1,
      height: 40,
      border: "none",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      fontWeight: "var(--fw-medium)",
      background: tab === k ? "var(--white)" : "transparent",
      color: tab === k ? "var(--green-800)" : "var(--text-muted)",
      boxShadow: tab === k ? "var(--shadow-sm)" : "none"
    }
  }, label))), tab === "login" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--fs-h2)"
    }
  }, "Welcome back"), /*#__PURE__*/React.createElement(Input, {
    id: "p-email",
    label: "Email address",
    type: "email",
    icon: "mail",
    placeholder: "agency@example.com"
  }), /*#__PURE__*/React.createElement(Input, {
    id: "p-pass",
    label: "Password",
    type: "password",
    icon: "lock",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    id: "p-remember",
    label: "Keep me signed in",
    checked: true,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement("a", {
    href: "#reset",
    style: {
      fontSize: "var(--fs-body-sm)"
    }
  }, "Forgot password")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true
  }, "Sign in")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--fs-h2)"
    }
  }, "Become a partner"), /*#__PURE__*/React.createElement(Input, {
    id: "r-org",
    label: "Organisation name",
    icon: "building-2",
    placeholder: "Bright Futures Education",
    required: true
  }), /*#__PURE__*/React.createElement(Select, {
    id: "r-kind",
    label: "You are a",
    options: ["Education agency", "Consultant", "University", "Country representative"],
    required: true
  }), /*#__PURE__*/React.createElement(Input, {
    id: "r-email",
    label: "Work email",
    type: "email",
    icon: "mail",
    placeholder: "you@agency.com",
    required: true
  }), /*#__PURE__*/React.createElement(Checkbox, {
    id: "r-terms",
    label: "I agree to the partner terms",
    checked: true,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true
  }, "Create partner account")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "arrow-left",
    onClick: onHome
  }, "Back to the website"))));
}
Object.assign(window, {
  ApplyScreen,
  PartnerLoginScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ApplyScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DS = window.CampusTurkeyDesignSystem_4d33e7;
const {
  Logo,
  BrandDivider,
  Button,
  Icon,
  Badge,
  Card,
  SectionHeading,
  ServiceCard,
  UniversityCard,
  StatBlock,
  TestimonialCard,
  Accordion,
  CTABanner,
  ScrollReveal,
  StickyScrollSection
} = DS;
const A = "../../assets";
function Hero({
  onApply,
  onExplore
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      minHeight: "min(94vh,880px)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      marginBottom: "calc(var(--overlap) * -1)",
      background: "var(--gradient-brand-deep)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${A}/map-of-turkey.jpg`,
    alt: "",
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      mixBlendMode: "soft-light",
      opacity: .5,
      filter: "invert(1)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--surface-overlay-brand)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--gradient-protect-bottom)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 108,
      right: 28,
      zIndex: 3,
      padding: "4px 10px",
      borderRadius: "var(--radius-pill)",
      border: "1px dashed rgba(255,255,255,.4)",
      color: "rgba(255,255,255,.72)",
      fontSize: "var(--fs-micro)",
      letterSpacing: ".08em",
      textTransform: "uppercase"
    }
  }, "Background video placeholder"), /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      position: "relative",
      zIndex: 2,
      marginTop: "auto",
      paddingBottom: "clamp(56px,8vw,110px)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(Badge, {
    tone: "onDark",
    dot: true
  }, "Applications open for the 2026 intake")), /*#__PURE__*/React.createElement(ScrollReveal, {
    delay: 80
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      color: "var(--white)",
      fontSize: "var(--fs-display-1)",
      lineHeight: "var(--lh-display)",
      letterSpacing: "var(--ls-display)",
      maxWidth: "15ch",
      margin: 0
    }
  }, "Study in T\xFCrkiye")), /*#__PURE__*/React.createElement(ScrollReveal, {
    delay: 160
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: "rgba(255,255,255,.9)",
      fontSize: "var(--fs-lead)",
      lineHeight: "var(--lh-body)",
      maxWidth: 560
    }
  }, "Campus Turkey is your gateway to T\xFCrkiye. We help students, patients, businesses, workers and partners reach education, healthcare, business and employment opportunities here.")), /*#__PURE__*/React.createElement(ScrollReveal, {
    delay: 240,
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-3)",
      marginTop: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "onDark",
    size: "lg",
    onClick: onApply
  }, "Apply Now"), /*#__PURE__*/React.createElement(Button, {
    variant: "outlineOnDark",
    size: "lg",
    icon: "calendar-check"
  }, "Book a Consultation"), /*#__PURE__*/React.createElement(Button, {
    variant: "outlineOnDark",
    size: "lg",
    icon: "message-circle"
  }, "WhatsApp")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onExplore,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      marginTop: "var(--space-4)",
      background: "transparent",
      border: "none",
      color: "rgba(255,255,255,.8)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      cursor: "pointer",
      width: "fit-content"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 16
  }), " See how it works")));
}
function AboutSection() {
  return /*#__PURE__*/React.createElement("section", {
    id: "about",
    style: {
      position: "relative",
      zIndex: 10,
      background: "var(--surface-subtle)",
      borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
      padding: "var(--section-y) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-10)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-10)",
      alignItems: "flex-end",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--fs-h2)",
      lineHeight: 1.25,
      color: "var(--text-heading)",
      maxWidth: 680
    }
  }, "Campus Turkey helps students, patients, businesses, workers and partners worldwide reach opportunities in T\xFCrkiye."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Apply Now"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Become a Partner"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "message-circle"
  }, "Contact us"))), /*#__PURE__*/React.createElement(ScrollReveal, {
    delay: 80
  }, /*#__PURE__*/React.createElement(BrandDivider, null)), /*#__PURE__*/React.createElement(ScrollReveal, {
    delay: 160,
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-12)",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark",
    theme: "onLight",
    height: 64,
    assetBase: A
  }), /*#__PURE__*/React.createElement("span", {
    className: "ct-tagline",
    style: {
      fontSize: "var(--fs-caption)",
      color: "var(--green-600)"
    }
  }, "Your guide to study in Turkey")), /*#__PURE__*/React.createElement("p", {
    style: {
      flex: 1,
      minWidth: 320,
      fontSize: "var(--fs-lead)",
      lineHeight: "var(--lh-body)",
      color: "var(--text-body)",
      maxWidth: 720
    }
  }, "Higher education is our core. We also support medical tourism, business visits and trade fairs, seasonal employment, educational tours, agency and university partnerships, and international representatives. Everything is designed to be clear, trustworthy and easy."))));
}
function ServicesSection({
  services
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: "study",
    style: {
      background: "var(--surface-page)",
      padding: "var(--section-y) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-12)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "What we do",
    title: "Education first, and everything around it",
    lead: "Study in T\xFCrkiye is our main service. The rest are here when you need them."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
      gap: "var(--space-6)",
      alignItems: "stretch"
    }
  }, services.map((s, i) => /*#__PURE__*/React.createElement(ScrollReveal, {
    key: s.title,
    delay: i * 80,
    style: s.emphasis === "primary" ? {
      gridColumn: "span 2",
      minWidth: 0,
      display: "flex"
    } : {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(ServiceCard, _extends({}, s, {
    index: i + 1,
    style: {
      width: "100%"
    }
  })))))));
}
function StatsBand({
  stats
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--gradient-brand-deep)",
      padding: "var(--section-y) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
      gap: "var(--space-10)"
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement(ScrollReveal, {
    key: s.label,
    delay: i * 80
  }, /*#__PURE__*/React.createElement(StatBlock, s)))));
}
function FeaturedUniversities({
  universities,
  onBrowse
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: "universities",
    style: {
      background: "var(--surface-subtle)",
      padding: "var(--section-y) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-10)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-6)",
      alignItems: "flex-end",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Featured universities",
    title: "200+ universities, one directory",
    lead: "Filter by city, type, language and scholarships. Every listing shows what it really costs."
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "arrow-right",
    onClick: onBrowse
  }, "Browse the directory")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
      gap: "var(--space-6)"
    }
  }, universities.slice(0, 3).map((u, i) => /*#__PURE__*/React.createElement(ScrollReveal, {
    key: u.name,
    delay: i * 80,
    style: {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(UniversityCard, _extends({}, u, {
    style: {
      width: "100%"
    }
  })))))));
}
function JourneySection({
  journey
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)",
      padding: "var(--section-y) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container"
  }, /*#__PURE__*/React.createElement(StickyScrollSection, {
    aside: /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "How it works",
      title: "Five steps from question to campus",
      lead: "No jargon, no hidden stages. You always know what happens next."
    }),
    items: journey.map(s => ({
      content: /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        className: "ct-eyebrow",
        style: {
          display: "block",
          marginBottom: 6
        }
      }, s.meta), /*#__PURE__*/React.createElement("h3", {
        style: {
          fontSize: "var(--fs-h3)",
          margin: "0 0 var(--space-2)"
        }
      }, s.title), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: "var(--fs-body)",
          lineHeight: "var(--lh-body)",
          color: "var(--text-body)",
          maxWidth: 560
        }
      }, s.description))
    }))
  })));
}
function TestimonialsSection({
  testimonials
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-subtle)",
      padding: "var(--section-y) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-10)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "In their words",
    title: "Students, patients and partners",
    align: "center"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
      gap: "var(--space-6)"
    }
  }, testimonials.map((t, i) => /*#__PURE__*/React.createElement(ScrollReveal, {
    key: t.name,
    delay: i * 80,
    style: {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(TestimonialCard, _extends({}, t, {
    style: {
      width: "100%"
    }
  })))))));
}
function FaqSection({
  faq
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)",
      padding: "var(--section-y) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(280px,360px) 1fr",
      gap: "var(--space-16)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      top: 132
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "Questions",
    title: "Answers before you ask",
    lead: "Still unsure? Message us on WhatsApp and a person replies."
  }))), /*#__PURE__*/React.createElement(ScrollReveal, {
    delay: 80
  }, /*#__PURE__*/React.createElement(Accordion, {
    items: faq
  }))));
}
function HomeScreen({
  data,
  onApply,
  onBrowse
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Hero, {
    onApply: onApply,
    onExplore: () => {
      const el = document.getElementById("about");
      if (el) window.scrollTo({
        top: el.offsetTop - 100,
        behavior: "smooth"
      });
    }
  }), /*#__PURE__*/React.createElement(AboutSection, null), /*#__PURE__*/React.createElement(ServicesSection, {
    services: data.services
  }), /*#__PURE__*/React.createElement(StatsBand, {
    stats: data.stats
  }), /*#__PURE__*/React.createElement(FeaturedUniversities, {
    universities: data.universities,
    onBrowse: onBrowse
  }), /*#__PURE__*/React.createElement(JourneySection, {
    journey: data.journey
  }), /*#__PURE__*/React.createElement(TestimonialsSection, {
    testimonials: data.testimonials
  }), /*#__PURE__*/React.createElement(FaqSection, {
    faq: data.faq
  }), /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      paddingBottom: "var(--section-y)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(CTABanner, {
    eyebrow: "Ready when you are",
    title: "Start your application for the next intake",
    body: "Tell us what you want to study. We come back with real options, real costs and real deadlines.",
    assetBase: A
  }))));
}
Object.assign(window, {
  HomeScreen,
  Hero,
  AboutSection,
  ServicesSection,
  StatsBand,
  FeaturedUniversities,
  JourneySection,
  TestimonialsSection,
  FaqSection
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/UniversitiesScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DSU = window.CampusTurkeyDesignSystem_4d33e7;
const {
  Button,
  Icon,
  Tag,
  Card,
  SectionHeading,
  UniversityCard,
  DirectoryToolbar,
  CTABanner,
  ScrollReveal
} = DSU;
const AU = "../../assets";
function TurkeyMap({
  cities,
  active,
  onSelect
}) {
  return /*#__PURE__*/React.createElement(Card, {
    padding: "0",
    style: {
      overflow: "hidden",
      background: "var(--gradient-brand-deep)",
      border: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      aspectRatio: "16 / 9",
      minHeight: 300
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${AU}/map-of-turkey.jpg`,
    alt: "Map of T\xFCrkiye",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "contain",
      filter: "invert(1)",
      opacity: .28
    }
  }), cities.map(c => {
    const on = active === c.name;
    return /*#__PURE__*/React.createElement("button", {
      key: c.name,
      type: "button",
      onClick: () => onSelect(on ? null : c.name),
      style: {
        position: "absolute",
        left: `${c.x}%`,
        top: `${c.y}%`,
        transform: "translate(-50%,-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 12px",
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        background: on ? "var(--white)" : "var(--action-primary)",
        color: on ? "var(--green-800)" : "var(--white)",
        border: on ? "2px solid var(--white)" : "1px solid rgba(255,255,255,.35)",
        boxShadow: "var(--shadow-float)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--fs-caption)",
        fontWeight: "var(--fw-semibold)",
        whiteSpace: "nowrap",
        transition: "all var(--dur-base) var(--ease-out)",
        zIndex: on ? 3 : 2
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "map-pin",
      size: 13
    }), c.name, /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: .7
      }
    }, c.count));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 20,
      bottom: 18,
      color: "rgba(255,255,255,.78)",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-caption)",
      maxWidth: 260,
      lineHeight: 1.5
    }
  }, "Tap a city to filter the directory. Tap it again to clear.")));
}
function UniversitiesScreen({
  data,
  onApply
}) {
  const [city, setCity] = React.useState(null);
  const [type, setType] = React.useState(null);
  const [scholarship, setScholarship] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState("grid");
  const [shown, setShown] = React.useState(6);
  const filtered = data.universities.filter(u => (!city || u.city === city) && (!type || u.type === type) && (!scholarship || u.scholarship) && (!query || u.name.toLowerCase().includes(query.toLowerCase())));
  const list = filtered.slice(0, shown);
  const clear = () => {
    setCity(null);
    setType(null);
    setScholarship(false);
    setQuery("");
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-subtle)",
      paddingTop: 140
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ct-container",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-10)",
      paddingBottom: "var(--section-y)"
    }
  }, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(SectionHeading, {
    eyebrow: "University directory",
    title: "Find your university in T\xFCrkiye",
    lead: "200+ public and private universities. Filter by city, type, language of instruction and scholarships."
  })), /*#__PURE__*/React.createElement(ScrollReveal, {
    delay: 80
  }, /*#__PURE__*/React.createElement(TurkeyMap, {
    cities: data.cities,
    active: city,
    onSelect: setCity
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-3)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      height: 44,
      padding: "0 16px",
      background: "var(--white)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-pill)",
      minWidth: 260
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 17,
    color: "var(--neutral-500)"
  }), /*#__PURE__*/React.createElement("input", {
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "Search universities",
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-ui)",
      fontSize: "var(--fs-body-sm)",
      color: "var(--green-900)"
    }
  })), ["Public", "Private"].map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t,
    selected: type === t,
    onClick: () => setType(type === t ? null : t),
    count: data.universities.filter(u => u.type === t).length
  }, t)), /*#__PURE__*/React.createElement(Tag, {
    selected: scholarship,
    onClick: () => setScholarship(!scholarship),
    count: data.universities.filter(u => u.scholarship).length
  }, "Scholarship"), city ? /*#__PURE__*/React.createElement(Tag, {
    selected: true,
    onRemove: () => setCity(null)
  }, city) : null), /*#__PURE__*/React.createElement(DirectoryToolbar, {
    total: data.universities.length,
    shown: list.length,
    view: view,
    onViewChange: setView,
    onClear: clear
  }), list.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: view === "grid" ? "grid" : "flex",
      flexDirection: view === "grid" ? undefined : "column",
      gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
      gap: "var(--space-6)"
    }
  }, list.map((u, i) => /*#__PURE__*/React.createElement(ScrollReveal, {
    key: u.name,
    delay: i % 3 * 80,
    style: {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(UniversityCard, _extends({}, u, {
    layout: view === "grid" ? "grid" : "row",
    style: {
      width: "100%"
    }
  }))))) : /*#__PURE__*/React.createElement(Card, {
    style: {
      textAlign: "center",
      padding: "var(--space-16)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search-x",
    size: 26,
    color: "var(--neutral-400)"
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "var(--space-4) 0 var(--space-2)",
      fontSize: "var(--fs-h3)"
    }
  }, "No universities match those filters"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-muted)",
      marginBottom: "var(--space-5)"
    }
  }, "Clear a filter and try again, or message us and we will search for you."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "rotate-ccw",
    onClick: clear,
    style: {
      marginInline: "auto"
    }
  }, "Clear filters")), shown < filtered.length ? /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    icon: "chevron-down",
    onClick: () => setShown(shown + 6),
    style: {
      marginInline: "auto"
    }
  }, "Load more universities") : null, /*#__PURE__*/React.createElement(ScrollReveal, null, /*#__PURE__*/React.createElement(CTABanner, {
    eyebrow: "Not sure which one",
    title: "Send us your grades and we will shortlist for you",
    body: "One short form. We reply with universities you can actually get into.",
    primaryLabel: "Apply Now",
    primaryHref: "#apply",
    secondaryLabel: "Book a Consultation",
    assetBase: AU
  }))));
}
Object.assign(window, {
  UniversitiesScreen,
  TurkeyMap
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/UniversitiesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.js
try { (() => {
window.CT_DATA = {
  nav: [{
    label: "Study in Türkiye",
    href: "#study"
  }, {
    label: "Services",
    mega: "services"
  }, {
    label: "Universities",
    href: "#universities",
    screen: "universities"
  }, {
    label: "Partners",
    mega: "partners"
  }, {
    label: "About",
    href: "#about"
  }],
  services: [{
    icon: "graduation-cap",
    title: "Study in Türkiye",
    badge: "Our core service",
    emphasis: "primary",
    description: "We help international students gain admission to public and private universities, then handle everything that follows.",
    points: ["Public universities are highly subsidised", "Private universities offer scholarships", "Visa, residence, housing and airport pickup"],
    ctaLabel: "Start your application"
  }, {
    icon: "heart-pulse",
    title: "Medical Tourism",
    description: "Consultations, hospital and doctor matching, treatment arrangements, invitation letters, visa, accommodation and translation.",
    ctaLabel: "Book a consultation"
  }, {
    icon: "briefcase",
    title: "Business Facilitation",
    description: "Invitation letters, company and factory visits, B2B meetings, trade fairs, delegations and translation.",
    ctaLabel: "Talk to our team"
  }, {
    icon: "hard-hat",
    title: "Employment Services",
    description: "Legal and seasonal employment support for workers coming to Türkiye.",
    ctaLabel: "Ask about work"
  }, {
    icon: "bus-front",
    title: "Educational & Business Tours",
    description: "University visits, study tours, professional visits, trade missions and group delegations.",
    ctaLabel: "Plan a tour"
  }, {
    icon: "handshake",
    title: "Partnerships & Representatives",
    description: "Agencies, consultants, universities and country representatives. Registration takes one short form.",
    ctaLabel: "Become a partner"
  }],
  stats: [{
    value: "200+",
    label: "Partner universities",
    description: "Public and private, across 40 cities."
  }, {
    value: "6",
    label: "Languages supported",
    description: "English, Arabic, French, Turkish, Russian and Swahili."
  }, {
    value: "48h",
    label: "Typical reply time",
    description: "On WhatsApp, every working day."
  }, {
    value: "12",
    label: "Years in Türkiye",
    description: "Working with universities and hospitals."
  }],
  universities: [{
    name: "Istanbul Technical University",
    city: "Istanbul",
    type: "Public",
    languages: ["English", "Turkish"],
    tuition: "$1,100 / year",
    programs: 142,
    scholarship: true
  }, {
    name: "Middle East Technical University",
    city: "Ankara",
    type: "Public",
    languages: ["English"],
    tuition: "$1,400 / year",
    programs: 118,
    scholarship: true
  }, {
    name: "Bilkent University",
    city: "Ankara",
    type: "Private",
    languages: ["English"],
    tuition: "$9,400 / year",
    programs: 78
  }, {
    name: "Ege University",
    city: "Izmir",
    type: "Public",
    languages: ["Turkish"],
    tuition: "$800 / year",
    programs: 96
  }, {
    name: "Koç University",
    city: "Istanbul",
    type: "Private",
    languages: ["English"],
    tuition: "$21,000 / year",
    programs: 64,
    scholarship: true
  }, {
    name: "Akdeniz University",
    city: "Antalya",
    type: "Public",
    languages: ["Turkish", "English"],
    tuition: "$750 / year",
    programs: 88
  }, {
    name: "Sabancı University",
    city: "Istanbul",
    type: "Private",
    languages: ["English"],
    tuition: "$18,500 / year",
    programs: 42,
    scholarship: true
  }, {
    name: "Çukurova University",
    city: "Adana",
    type: "Public",
    languages: ["Turkish"],
    tuition: "$620 / year",
    programs: 74
  }, {
    name: "Karadeniz Technical University",
    city: "Trabzon",
    type: "Public",
    languages: ["Turkish"],
    tuition: "$700 / year",
    programs: 81
  }],
  cities: [{
    name: "Istanbul",
    x: 17,
    y: 30,
    count: 62
  }, {
    name: "Ankara",
    x: 44,
    y: 41,
    count: 28
  }, {
    name: "Izmir",
    x: 13,
    y: 56,
    count: 19
  }, {
    name: "Antalya",
    x: 33,
    y: 76,
    count: 11
  }, {
    name: "Adana",
    x: 56,
    y: 70,
    count: 9
  }, {
    name: "Trabzon",
    x: 74,
    y: 26,
    count: 7
  }, {
    name: "Gaziantep",
    x: 66,
    y: 66,
    count: 8
  }, {
    name: "Erzurum",
    x: 82,
    y: 40,
    count: 6
  }],
  journey: [{
    meta: "Step 1",
    title: "Tell us your plan",
    description: "Send your details and the program you want. One short form, no documents needed yet.",
    icon: "message-square"
  }, {
    meta: "Step 2",
    title: "We match universities",
    description: "You get a shortlist with real tuition, real deadlines and the scholarships you qualify for.",
    icon: "list-checks"
  }, {
    meta: "Step 3",
    title: "We submit your application",
    description: "We prepare and file everything with the universities you choose.",
    icon: "file-check"
  }, {
    meta: "Step 4",
    title: "Visa and travel",
    description: "Acceptance letter, visa appointment, housing and airport pickup are all arranged for you.",
    icon: "plane-landing"
  }, {
    meta: "Step 5",
    title: "Settle in",
    description: "Residence permit, bank account, phone line and your first week on campus.",
    icon: "home"
  }],
  testimonials: [{
    quote: "Campus Turkey handled my admission, my visa and my first week in Istanbul.",
    name: "Amina Yusuf",
    role: "Dentistry, 1st year",
    country: "Nigeria",
    video: true,
    duration: "2:14"
  }, {
    quote: "I compared six universities in one afternoon and knew exactly what each one would cost.",
    name: "Karim Haddad",
    role: "Computer Engineering",
    country: "Morocco",
    video: true,
    duration: "1:48"
  }, {
    quote: "We sent a delegation of nine people. Every meeting and every transfer was arranged.",
    name: "Grace Mwangi",
    role: "Trade delegation lead",
    country: "Kenya",
    video: true,
    duration: "3:02"
  }],
  faq: [{
    question: "How much does a public university cost?",
    answer: "Public universities are heavily subsidised. Most programs run between $600 and $2,000 per year, and we confirm the exact figure before you apply."
  }, {
    question: "Can I get a scholarship?",
    answer: "Private universities offer scholarships from 25 to 75 percent. We tell you what you qualify for before you spend anything."
  }, {
    question: "Do you help with the student visa?",
    answer: "Yes. We prepare your documents, book the appointment and walk you through the interview."
  }, {
    question: "Do I need to speak Turkish?",
    answer: "No. Many programs are taught fully in English. If you want a Turkish-taught program we arrange a language year first."
  }, {
    question: "What happens when I land?",
    answer: "Airport pickup, accommodation, residence permit and your first week are arranged before you travel."
  }, {
    question: "Do you work with agencies?",
    answer: "Yes. Agencies, consultants and country representatives can register in one short form and get a partner account."
  }],
  footerColumns: [{
    title: "Education",
    links: [{
      label: "Study in Türkiye"
    }, {
      label: "University directory"
    }, {
      label: "Scholarships"
    }, {
      label: "Language courses"
    }]
  }, {
    title: "Services",
    links: [{
      label: "Medical Tourism"
    }, {
      label: "Business Facilitation"
    }, {
      label: "Employment"
    }, {
      label: "Tours & delegations"
    }]
  }, {
    title: "Partners",
    links: [{
      label: "Become a Partner"
    }, {
      label: "Become a Representative"
    }, {
      label: "Partner Login"
    }]
  }, {
    title: "Company",
    links: [{
      label: "About us"
    }, {
      label: "Contact"
    }, {
      label: "Privacy"
    }, {
      label: "Terms"
    }]
  }],
  socials: [{
    icon: "instagram",
    label: "Instagram"
  }, {
    icon: "facebook",
    label: "Facebook"
  }, {
    icon: "linkedin",
    label: "LinkedIn"
  }, {
    icon: "youtube",
    label: "YouTube"
  }],
  contact: {
    address: "Şişli, Istanbul, Türkiye",
    phone: "+90 555 000 0000",
    email: "hello@campusturkey.com",
    whatsapp: "WhatsApp us"
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.js", error: String((e && e.message) || e) }); }

__ds_ns.BrandDivider = __ds_scope.BrandDivider;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.ServiceCard = __ds_scope.ServiceCard;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.TestimonialCard = __ds_scope.TestimonialCard;

__ds_ns.UniversityCard = __ds_scope.UniversityCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.StepIndicator = __ds_scope.StepIndicator;

__ds_ns.ScrollReveal = __ds_scope.ScrollReveal;

__ds_ns.ScrollProgress = __ds_scope.ScrollProgress;

__ds_ns.StickyScrollSection = __ds_scope.StickyScrollSection;

__ds_ns.LANGUAGES = __ds_scope.LANGUAGES;

__ds_ns.LanguageSwitcher = __ds_scope.LanguageSwitcher;

__ds_ns.MegaMenuPanel = __ds_scope.MegaMenuPanel;

__ds_ns.Navbar = __ds_scope.Navbar;

__ds_ns.WhatsAppButton = __ds_scope.WhatsAppButton;

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.CTABanner = __ds_scope.CTABanner;

__ds_ns.DirectoryToolbar = __ds_scope.DirectoryToolbar;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.TimelineTrack = __ds_scope.TimelineTrack;

})();
