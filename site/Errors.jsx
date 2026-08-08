const DSE = window.CampusTurkeyDesignSystem_4d33e7;
const { Button, Icon, Card } = DSE;
const AE = "assets";

/* One error surface, five states. Every variant answers the same three questions in
   the same order: what happened, whether it is the visitor's fault, and what to do
   next. The recovery routes differ per state because "go home" is useless advice to
   someone whose connection dropped. */
const ERROR_STATES = {
  notFound: {
    code: "404",
    eyebrow: "Page not found",
    title: "That page does not exist",
    body: "The link may be out of date, or the address may have a typo. Nothing is wrong with your account or your application.",
    icon: "compass",
    actions: [
      { label: "Back to home", variant: "onDark", route: "home" },
      { label: "Browse universities", variant: "outlineOnDark", route: "universities" },
    ],
    help: [
      ["Looking for a university?", "The directory lists every partner university with real tuition.", "universities", "landmark"],
      ["Ready to apply?", "The application takes four short steps and no documents up front.", "apply", "file-text"],
      ["Need a person?", "Message us and someone replies, usually the same day.", "contact", "message-circle"],
    ],
  },
  failed: {
    code: "500",
    eyebrow: "Something went wrong",
    title: "This page did not load",
    body: "The fault is on our side, not yours. Nothing you submitted has been lost, and the rest of the site is working normally.",
    icon: "triangle-alert",
    actions: [
      { label: "Try again", variant: "onDark", reload: true },
      { label: "Back to home", variant: "outlineOnDark", route: "home" },
    ],
    help: [
      ["Was this mid-application?", "Your progress is saved. Reopen the form and carry on where you stopped.", "apply", "rotate-ccw"],
      ["Still stuck?", "Tell us what you were doing and we will fix it.", "contact", "life-buoy"],
    ],
  },
  offline: {
    code: "",
    eyebrow: "No connection",
    title: "You are offline",
    body: "Your device has lost its internet connection. This page will recover on its own once the connection returns.",
    icon: "wifi-off",
    actions: [{ label: "Try again", variant: "onDark", reload: true }],
    help: [
      ["Check your connection", "Turn airplane mode off, or switch between wifi and mobile data.", null, "signal"],
      ["Nothing is lost", "Anything you had already sent us is safe on our side.", null, "shield-check"],
    ],
  },
  maintenance: {
    code: "",
    eyebrow: "Scheduled maintenance",
    title: "We are back shortly",
    body: "We are updating the site. Applications already submitted are unaffected, and this usually takes under an hour.",
    icon: "wrench",
    actions: [
      { label: "Try again", variant: "onDark", reload: true },
      { label: "Message us on WhatsApp", variant: "outlineOnDark", whatsapp: true },
    ],
    help: [
      ["Urgent deadline?", "Message us. We can accept your details by WhatsApp in the meantime.", null, "clock"],
    ],
  },
  sessionExpired: {
    code: "",
    eyebrow: "Signed out",
    title: "Your session has expired",
    body: "For your security we sign partners out after a period of inactivity. Sign in again to pick up where you left off.",
    icon: "lock",
    actions: [
      { label: "Sign in again", variant: "onDark", route: "portal" },
      { label: "Back to the website", variant: "outlineOnDark", route: "home" },
    ],
    help: [
      ["Forgotten your details?", "Your named contact can reset them for you.", "contact", "key-round"],
    ],
  },
};

/**
 * Full error surface. The green panel carries the brand and the ghosted status code;
 * the white card below carries recovery, because an error page that only apologises
 * leaves the visitor exactly where they were stuck.
 */
function ErrorScreen({ state = "notFound", detail }) {
  const s = ERROR_STATES[state] || ERROR_STATES.notFound;
  const T = window.T || ((k) => k);

  const act = (a) => {
    if (a.reload) return window.location.reload();
    if (a.whatsapp) return window.CT_WHATSAPP();
    return window.CT_GO(a.route);
  };

  return (
    <div style={{ background: "var(--surface-subtle)", minHeight: 560 }}>
      <section style={{ position: "relative", overflow: "hidden", background: "var(--gradient-brand-deep)", paddingTop: 168, paddingBottom: "calc(var(--section-y) + 48px)", marginBottom: "calc(var(--overlap) * -1)" }}>
        <img src={`${AE}/map-of-turkey.jpg`} alt="" aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .13, filter: "invert(1)" }} />
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--gradient-protect-bottom)" }}></span>
        <div className="ct-container" style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "var(--space-5)", alignItems: "flex-start" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "var(--radius-circle)", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.28)", color: "var(--white)" }}>
            <Icon name={s.icon} size={24} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span className="ct-eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>{s.eyebrow}</span>
            {s.code ? (
              <span style={{ padding: "3px 10px", borderRadius: "var(--radius-pill)", border: "1px solid rgba(255,255,255,.3)", color: "rgba(255,255,255,.8)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-micro)", letterSpacing: ".08em" }}>
                {s.code}
              </span>
            ) : null}
          </span>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", margin: 0, maxWidth: "18ch" }}>
            {s.title}
          </h1>
          <p style={{ color: "rgba(255,255,255,.88)", fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", margin: 0, maxWidth: 560 }}>
            {s.body}
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
            {s.actions.map((a) => (
              <Button key={a.label} variant={a.variant} size="lg" onClick={() => act(a)}>{a.label}</Button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
        <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Where to go from here</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "var(--space-5)" }}>
            {s.help.map(([title, body, route, icon]) => {
              const clickable = !!route;
              return (
                <Card key={title} padding="var(--space-8)"
                  onClick={clickable ? () => window.CT_GO(route) : undefined}
                  style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", cursor: clickable ? "pointer" : "default" }}>
                  <Icon name={icon} size={20} color="var(--green-600)" />
                  <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{title}</h3>
                  <p style={{ color: "var(--text-body)", fontSize: "var(--fs-body-sm)", lineHeight: "var(--lh-body)", margin: 0 }}>{body}</p>
                  {clickable ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "auto", paddingTop: "var(--space-3)", color: "var(--green-700)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)" }}>
                      Go there <Icon name="arrow-right" size={15} />
                    </span>
                  ) : null}
                </Card>
              );
            })}
          </div>
          {detail ? (
            <details style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
              <summary style={{ cursor: "pointer" }}>Technical detail</summary>
              <code style={{ display: "block", marginTop: "var(--space-3)", padding: "var(--space-4)", background: "var(--neutral-100)", borderRadius: "var(--radius-md)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{detail}</code>
            </details>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/**
 * Watches the connection and shows the offline surface the moment it drops, then
 * clears itself when the connection returns. Wrapping rather than routing keeps the
 * visitor's place: they land back on the page they were reading.
 */
function OfflineGuard({ children }) {
  const [offline, setOffline] = React.useState(() => navigator.onLine === false);
  React.useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => { window.removeEventListener("offline", down); window.removeEventListener("online", up); };
  }, []);
  if (offline) return <ErrorScreen state="offline" />;
  return children;
}

Object.assign(window, { ErrorScreen, OfflineGuard, ERROR_STATES });
