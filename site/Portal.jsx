const DSD = window.CampusTurkeyDesignSystem_4d33e7;
const { Button, Icon, IconButton, Card, Badge, Tag, Input, Select, Checkbox, BrandDivider, Logo, SectionHeading, LanguageSwitcher } = DSD;
const AD = "assets";

const STAGE_TONE = { Registered: "brand", Visa: "brand", Offer: "neutral", Submitted: "neutral", Documents: "warning", Enquiry: "neutral" };

const money = (n) => "$" + n.toLocaleString("en-US");

/** Right-hand panel. The design system has no Modal, and a portal needs one place
 *  to put a short task without losing the page behind it.
 *  Rendered into document.body: the page wrapper keeps a settled transform from its
 *  route-reveal animation, and any transformed ancestor becomes the containing block
 *  for position:fixed, which would size this overlay to the page instead of the screen. */
function PortalSheet({ open, title, lead, onClose, children }) {
  const panel = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () => [...panel.current.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.offsetParent !== null);

    const first = focusables()[1] || focusables()[0];
    if (first) first.focus();

    /* Tab is trapped inside the panel, and focus returns to the opener on close. */
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const edge = e.shiftKey ? list[0] : list[list.length - 1];
      if (document.activeElement === edge || !panel.current.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? list[list.length - 1] : list[0]).focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (opener && opener.focus) opener.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return ReactDOM.createPortal(
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <button type="button" aria-label="Close" onClick={onClose}
        style={{ position: "absolute", inset: 0, border: "none", cursor: "pointer", background: "rgba(10,44,30,.42)", backdropFilter: "blur(4px)" }}></button>
      <div className="ct-sheet" ref={panel} style={{
        position: "relative", width: "min(560px,100%)", height: "100%", overflowY: "auto", boxSizing: "border-box",
        background: "var(--surface-page)", boxShadow: "var(--shadow-float)",
        padding: "var(--space-10)", display: "flex", flexDirection: "column", gap: "var(--space-6)",
      }}>
        <div style={{ display: "flex", gap: "var(--space-5)", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{title}</h2>
            {lead ? <p style={{ color: "var(--text-body)", margin: 0 }}>{lead}</p> : null}
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <BrandDivider />
        {children}
      </div>
    </div>,
    document.body
  );
}

function AddStudentForm({ universities, onAdd, onClose }) {
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", country: "", program: "", university: "", level: "", intake: "", notes: "", consent: true });
  const [error, setError] = React.useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.program.trim() || !form.university) {
      setError("Add the student's name, the program and a university before you submit.");
      return;
    }
    onAdd({
      name: form.name.trim(), program: form.program.trim(), university: form.university,
      stage: "Enquiry", updated: "Just now", commission: "Pending",
    });
    onClose();
    window.CT_TOAST(form.name.trim() + " was added to your pipeline.");
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "var(--space-5)" }}>
      <Input id="s-name" label="Student name" icon="user" placeholder="Amina Yusuf" required value={form.name} onChange={set("name")} style={{ gridColumn: "span 2", minWidth: 0 }} />
      <Input id="s-email" label="Email address" type="email" icon="mail" placeholder="student@example.com" value={form.email} onChange={set("email")} style={{ minWidth: 0 }} />
      <Input id="s-phone" label="WhatsApp number" icon="phone" hint="Include the country code." value={form.phone} onChange={set("phone")} style={{ minWidth: 0 }} />
      <Input id="s-country" label="Country of residence" icon="globe" placeholder="Nigeria" value={form.country} onChange={set("country")} style={{ minWidth: 0 }} />
      <Select id="s-level" label="Study level" options={["Bachelor", "Master", "PhD", "Language year"]} value={form.level} onChange={set("level")} style={{ minWidth: 0 }} />
      <Input id="s-program" label="Program" icon="graduation-cap" placeholder="Computer Engineering" required value={form.program} onChange={set("program")} style={{ minWidth: 0 }} />
      <Select id="s-uni" label="First choice university" required options={universities.map((u) => u.name)} value={form.university} onChange={set("university")} style={{ minWidth: 0 }} />
      <Select id="s-intake" label="Intake" options={["Autumn 2026", "Spring 2027", "Autumn 2027"]} value={form.intake} onChange={set("intake")} style={{ gridColumn: "span 2", minWidth: 0 }} />
      <div style={{ gridColumn: "span 2", minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <label htmlFor="s-notes" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>Notes for the admissions team</label>
        <textarea id="s-notes" rows={3} value={form.notes} onChange={set("notes")} placeholder="Grades, language level, budget, anything that helps us shortlist."
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--white)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)", resize: "vertical" }} />
        <Checkbox id="s-consent" label="The student agreed to be contacted by Campus Turkey"
          description="We contact them on WhatsApp first, and you stay copied on every update." checked={form.consent} onChange={set("consent")} />
        {error ? (
          <span style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
            <Icon name="alert-circle" size={16} />{error}
          </span>
        ) : null}
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Button variant="primary" size="lg" type="submit">Add to my pipeline</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </form>
  );
}

function PortalSidebar({ view, onView, account, onSignOut }) {
  const [lang, setLang] = React.useState(window.CT_I18N.lang);
  const setLanguage = (code) => { window.CT_I18N.set(code); setLang(code); };
  React.useEffect(() => window.CT_I18N.subscribe(setLang), []);
  const items = [
    ["overview", "Overview", "layout-dashboard"],
    ["students", "My students", "users"],
    ["commissions", "Commissions", "wallet"],
    ["materials", "Materials", "folder-open"],
    ["account", "Account", "settings"],
  ];
  return (
    <aside className="ct-portal-aside" style={{ position: "sticky", top: 0, alignSelf: "start", height: "100dvh", display: "flex", flexDirection: "column", gap: "var(--space-8)", padding: "var(--space-8) var(--space-6)", background: "var(--gradient-brand-deep)", boxSizing: "border-box" }}>
      <a href="#/" style={{ display: "block" }}><Logo variant="lockup" theme="reversed" height={44} assetBase={AD} /></a>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map(([key, label, icon]) => {
          const on = view === key;
          return (
            <button key={key} type="button" onClick={() => onView(key)} style={{
              display: "flex", alignItems: "center", gap: "var(--space-3)", height: 46, padding: "0 14px",
              borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", textAlign: "start",
              background: on ? "rgba(255,255,255,.14)" : "transparent",
              color: on ? "var(--white)" : "rgba(255,255,255,.72)",
              fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: on ? "var(--fw-semibold)" : "var(--fw-regular)",
              transition: "background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)",
            }}>
              <Icon name={icon} size={18} />{label}
            </button>
          );
        })}
      </nav>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <BrandDivider theme="dark" />
        <div data-ct-no-translate style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>{T("footer.language")}</span>
          <LanguageSwitcher value={lang} onChange={setLanguage} theme="onDark" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--white)" }}>{account.manager}</span>
          <span style={{ fontSize: "var(--fs-caption)", color: "rgba(255,255,255,.66)" }}>{account.managerRole}</span>
        </div>
        <Button variant="outlineOnDark" icon="log-out" onClick={onSignOut}>Sign out</Button>
      </div>
    </aside>
  );
}

function PortalHeader({ account, title, lead, onAddStudent }) {
  const initials = account.person.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <header style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <span className="ct-eyebrow">{account.org} · {account.territory}</span>
        <h1 style={{ fontSize: "var(--fs-h1)", margin: 0 }}>{title}</h1>
        <p style={{ color: "var(--text-body)", margin: 0, maxWidth: 560 }}>{lead}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <Button variant="secondary" icon="plus" onClick={onAddStudent}>Add a student</Button>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: "var(--radius-circle)", background: "var(--green-050)", color: "var(--green-700)", fontFamily: "var(--font-ui)", fontWeight: "var(--fw-semibold)" }}>{initials}</span>
      </div>
    </header>
  );
}

function KpiRow({ kpis }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "var(--space-5)" }}>
      {kpis.map((k) => (
        <Card key={k.label} padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="ct-eyebrow">{k.label}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h1)", lineHeight: 1, color: "var(--green-700)" }}>{k.value}</span>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{k.description}</span>
        </Card>
      ))}
    </div>
  );
}

function Pipeline({ pipeline }) {
  const max = Math.max(...pipeline.map((p) => p.count));
  return (
    <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>Where your students are</h2>
        <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>Updated this morning</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${pipeline.length},1fr)`, gap: "var(--space-4)", alignItems: "end", minHeight: 168 }}>
        {pipeline.map((p) => (
          <div key={p.stage} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{p.count}</span>
            <span style={{ width: "100%", height: Math.max(8, (p.count / max) * 120), borderRadius: "var(--radius-xs)", background: p.stage === "Registered" ? "var(--action-primary)" : "var(--green-200)" }}></span>
            <span style={{ fontSize: "var(--fs-micro)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--neutral-500)", textAlign: "center" }}>{p.stage}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActionList({ actions }) {
  return (
    <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>Needs you this week</h2>
      {actions.map((a, i) => (
        <div key={a.title} style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start", paddingTop: i ? "var(--space-5)" : 0, borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, flex: "none", borderRadius: "var(--radius-sm)", background: "var(--green-050)" }}>
            <Icon name={a.icon} size={18} color="var(--green-600)" />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{a.title}</span>
            <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{a.body}</span>
          </div>
          <Button variant="ghost" icon="arrow-right" onClick={() => window.CT_TOAST("Prototype: " + a.cta.toLowerCase() + ".")}>{a.cta}</Button>
        </div>
      ))}
    </Card>
  );
}

function StudentTable({ students, compact }) {
  const [stage, setStage] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const stages = [...new Set(students.map((s) => s.stage))];
  const rows = students.filter((s) => (!stage || s.stage === stage) &&
    (!query || s.name.toLowerCase().includes(query.toLowerCase()) || s.university.toLowerCase().includes(query.toLowerCase())));
  return (
    <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>{compact ? "Recent referrals" : "Every student you referred"}</h2>
        {compact ? null : (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", height: 42, padding: "0 16px", background: "var(--surface-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", minWidth: 240 }}>
            <Icon name="search" size={16} color="var(--neutral-500)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students" aria-label="Search students"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)" }} />
          </div>
        )}
      </div>
      {compact ? null : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {stages.map((s) => (
            <Tag key={s} selected={stage === s} onClick={() => setStage(stage === s ? null : s)}
              count={students.filter((x) => x.stage === s).length}>{s}</Tag>
          ))}
        </div>
      )}
      <div className="ct-table-scroll" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)" }}>
          <thead>
            <tr>
              {["Student", "Program", "University", "Stage", "Commission"].map((h) => (
                <th key={h} style={{ textAlign: "start", padding: "0 var(--space-4) var(--space-3) 0", fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--neutral-500)", fontWeight: "var(--fw-medium)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.name}>
                <td style={{ padding: "var(--space-4) var(--space-4) var(--space-4) 0", borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{s.name}</span>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>Updated {s.updated}</span>
                  </span>
                </td>
                <td style={{ padding: "var(--space-4) var(--space-4) var(--space-4) 0", borderTop: "1px solid var(--border-subtle)", color: "var(--text-body)" }}>{s.program}</td>
                <td style={{ padding: "var(--space-4) var(--space-4) var(--space-4) 0", borderTop: "1px solid var(--border-subtle)", color: "var(--text-body)" }}>{s.university}</td>
                <td style={{ padding: "var(--space-4) var(--space-4) var(--space-4) 0", borderTop: "1px solid var(--border-subtle)" }}>
                  <Badge tone={STAGE_TONE[s.stage] || "neutral"}>{s.stage}</Badge>
                </td>
                <td style={{ padding: "var(--space-4) 0", borderTop: "1px solid var(--border-subtle)", fontWeight: "var(--fw-semibold)", color: "var(--green-700)", whiteSpace: "nowrap" }}>{s.commission}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length ? null : <p style={{ color: "var(--text-muted)", margin: 0 }}>No students match that filter.</p>}
    </Card>
  );
}

function WithdrawForm({ wallet, onWithdraw, onClose }) {
  const [method, setMethod] = React.useState(wallet.methods[0].id);
  const [amount, setAmount] = React.useState(String(wallet.available));
  const [error, setError] = React.useState(null);
  const picked = wallet.methods.find((m) => m.id === method);
  const value = parseFloat(amount) || 0;

  const submit = (e) => {
    e.preventDefault();
    if (value < wallet.minimum) { setError(`The minimum withdrawal is ${money(wallet.minimum)}.`); return; }
    if (value > wallet.available) { setError(`You have ${money(wallet.available)} available right now.`); return; }
    onWithdraw(value, picked);
    onClose();
    window.CT_TOAST(money(value) + " is on its way by " + picked.label.toLowerCase() + ".");
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="ct-eyebrow">Available now</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h1)", lineHeight: 1, color: "var(--green-700)" }}>{money(wallet.available)}</span>
        <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{money(wallet.pending)} is still clearing and cannot be withdrawn yet.</span>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <span className="ct-eyebrow">Where it goes</span>
        {wallet.methods.map((m) => {
          const on = method === m.id;
          return (
            <button key={m.id} type="button" onClick={() => setMethod(m.id)} style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)", textAlign: "start", cursor: "pointer",
              padding: "var(--space-5) var(--space-6)", borderRadius: "var(--radius-md)", background: on ? "var(--green-050)" : "var(--white)",
              border: on ? "1px solid var(--border-brand)" : "1px solid var(--border-subtle)",
              transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
            }}>
              <Icon name={m.icon} size={20} color={on ? "var(--green-600)" : "var(--neutral-500)"} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{m.label}</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.detail}</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.eta} · {m.fee}</span>
              </span>
              {on ? <Icon name="check" size={18} strokeWidth={2.5} color="var(--green-500)" /> : null}
            </button>
          );
        })}
      </div>

      <Input id="w-amount" label="Amount to withdraw" type="number" icon="banknote" value={amount} required
        min={wallet.minimum} max={wallet.available} step="0.01" inputMode="decimal"
        onChange={(e) => { setAmount(e.target.value); setError(null); }}
        hint={`Minimum ${money(wallet.minimum)}. ${picked.eta} once approved.`} />
      <Button variant="ghost" icon="arrow-up" onClick={() => setAmount(String(wallet.available))} style={{ alignSelf: "flex-start" }}>Withdraw everything available</Button>

      {error ? (
        <span style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
          <Icon name="alert-circle" size={16} />{error}
        </span>
      ) : null}

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="primary" size="lg" type="submit">Withdraw {money(value)}</Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
        Withdrawals are reviewed the same working day. You get a WhatsApp message when the money leaves our account.
      </p>
    </form>
  );
}

function AddPayoutMethodForm({ wallet, onAdd, onClose }) {
  const [railId, setRailId] = React.useState(null);
  const [values, setValues] = React.useState({});
  const [makeDefault, setMakeDefault] = React.useState(false);
  const [error, setError] = React.useState(null);
  const rail = wallet.methodOptions.find((r) => r.id === railId);

  const submit = (e) => {
    e.preventDefault();
    const missing = rail.fields.filter(([label]) => !(values[label] || "").trim());
    if (missing.length) { setError("Fill in " + missing.map((f) => f[0].toLowerCase()).join(", ") + " before you save."); return; }
    const detail = rail.fields.map(([label]) => values[label].trim()).slice(0, 2).join(" · ");
    onAdd({ id: rail.id + "-" + Date.now(), icon: rail.icon, label: rail.label, detail, eta: rail.eta, fee: rail.fee }, makeDefault);
    onClose();
    window.CT_TOAST(rail.label + " was added to your payout methods.");
  };

  if (!rail) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {wallet.methodOptions.map((r) => (
          <button key={r.id} type="button" className="ct-rail" onClick={() => { setRailId(r.id); setError(null); }} style={{
            display: "flex", alignItems: "flex-start", gap: "var(--space-4)", textAlign: "start", cursor: "pointer",
            padding: "var(--space-5) var(--space-6)", borderRadius: "var(--radius-md)", background: "var(--white)",
            border: "1px solid var(--border-subtle)",
            transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, flex: "none", borderRadius: "var(--radius-sm)", background: "var(--green-050)" }}>
              <Icon name={r.icon} size={19} color="var(--green-600)" />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{r.label}</span>
              <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{r.blurb}</span>
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{r.regions} · {r.eta} · {r.fee}</span>
            </span>
            <Icon name="chevron-right" size={18} color="var(--neutral-400)" />
          </button>
        ))}
        <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
          Every method is verified with a small test payment before your first withdrawal.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <Button variant="ghost" icon="arrow-left" onClick={() => { setRailId(null); setError(null); }} style={{ alignSelf: "flex-start" }}>All methods</Button>
      <Card surface="tinted" padding="var(--space-6)" style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
        <Icon name={rail.icon} size={20} color="var(--green-600)" />
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{rail.label}</span>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{rail.regions} · {rail.eta} · {rail.fee}</span>
        </span>
      </Card>
      {rail.fields.map(([label, icon, placeholder]) => (
        <Input key={label} id={"m-" + label.replace(/\W+/g, "-").toLowerCase()} label={label} icon={icon} placeholder={placeholder}
          value={values[label] || ""} onChange={(e) => { setValues({ ...values, [label]: e.target.value }); setError(null); }}
          style={{ minWidth: 0 }} />
      ))}
      <Checkbox id="m-default" label="Make this my default payout method"
        description="Withdrawals will use it unless you pick another one." checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
      {error ? (
        <span style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--fs-body-sm)", color: "var(--status-danger)" }}>
          <Icon name="alert-circle" size={16} />{error}
        </span>
      ) : null}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="primary" size="lg" type="submit">Save this method</Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
        We send a small test payment first. Your details are held by our payment provider, not on this site.
      </p>
    </form>
  );
}

function Commissions({ portal, wallet, payouts, onWithdraw, onAddMethod }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "var(--space-6)", alignItems: "stretch" }}>
        <Card surface="inverse" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <span className="ct-eyebrow" style={{ color: "var(--green-300)" }}>Available to withdraw</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-display-2)", lineHeight: 1, color: "var(--white)" }}>{money(wallet.available)}</span>
          <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
            {[["Clearing", money(wallet.pending)], ["Lifetime earned", money(wallet.lifetime)]].map(([k, v]) => (
              <span key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.62)" }}>{k}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-lead)", color: "var(--white)" }}>{v}</span>
              </span>
            ))}
          </div>
          <Button variant="onDark" size="lg" icon="banknote" onClick={onWithdraw} style={{ alignSelf: "flex-start" }}>Withdraw funds</Button>
          <p style={{ fontSize: "var(--fs-caption)", color: "rgba(255,255,255,.72)", margin: 0, maxWidth: 420 }}>{wallet.note}</p>
        </Card>

        <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>Your payout methods</h2>
          {wallet.methods.map((m, i) => (
            <div key={m.id} style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start", paddingTop: i ? "var(--space-5)" : 0, borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
              <Icon name={m.icon} size={19} color="var(--green-600)" />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{m.label}</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.detail}</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.eta} · {m.fee}</span>
              </span>
              {i === 0 ? <Badge tone="brand">Default</Badge> : null}
            </div>
          ))}
          <Button variant="secondary" icon="plus" onClick={onAddMethod} style={{ alignSelf: "flex-start" }}>Add a method</Button>
        </Card>
      </div>

      <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>Payment history</h2>
        <div className="ct-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)" }}>
            <thead>
              <tr>
                {["Reference", "Period", "Basis", "Amount", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "start", padding: "0 var(--space-4) var(--space-3) 0", fontSize: "var(--fs-micro)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--neutral-500)", fontWeight: "var(--fw-medium)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i} style={{ padding: "var(--space-4) var(--space-4) var(--space-4) 0", borderTop: "1px solid var(--border-subtle)", color: i === 3 ? "var(--green-700)" : "var(--text-body)", fontWeight: i === 3 ? "var(--fw-semibold)" : "var(--fw-regular)" }}>
                      {i === 4 ? <Badge tone={cell === "Paid" ? "brand" : "neutral"}>{cell}</Badge> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>
          Commission is credited within 30 days of the university confirming registration. Rates are set in your agreement.
        </p>
      </Card>
    </div>
  );
}

function Materials({ materials }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "var(--space-5)" }}>
      {materials.map((m) => (
        <Card key={m.title} interactive padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Icon name={m.icon} size={20} color="var(--green-600)" />
          <h3 style={{ fontSize: "var(--fs-h4)", margin: 0 }}>{m.title}</h3>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{m.meta}</span>
          <Button variant="ghost" icon="download" onClick={() => window.CT_TOAST("Prototype: the download would start here.")}>Download</Button>
        </Card>
      ))}
    </div>
  );
}

function AccountView({ account }) {
  return (
    <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px,340px)", gap: "var(--space-8)", alignItems: "start" }}>
      <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--fs-h3)", margin: 0 }}>Organisation details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <Input id="a-org" label="Organisation name" icon="building-2" defaultValue={account.org} />
          <Input id="a-person" label="Contact person" icon="user" defaultValue={account.person} />
          <Input id="a-email" label="Work email" type="email" icon="mail" defaultValue="samuel@brightfutures.ng" />
          <Input id="a-phone" label="WhatsApp number" icon="phone" defaultValue="+234 800 000 0000" />
          <Select id="a-lang" label="Preferred language" options={["English", "Français", "العربية"]} />
          <Input id="a-territory" label="Territory" icon="globe" defaultValue={account.territory} disabled />
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Checkbox id="a-notify" label="Email me when a student changes stage" checked onChange={() => {}} />
            <Button variant="primary" onClick={() => window.CT_TOAST("Prototype: your details would be saved.")} style={{ alignSelf: "flex-start" }}>Save changes</Button>
          </div>
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span className="ct-eyebrow">Agreement</span>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: "var(--fw-semibold)", color: "var(--green-800)" }}>{account.role}</span>
          <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{account.since}. Exclusive territory: {account.territory}.</span>
          <Button variant="secondary" icon="file-text" onClick={() => window.CT_TOAST("Prototype: the agreement PDF would open.")}>Read agreement</Button>
        </Card>
        <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span className="ct-eyebrow">Need help</span>
          <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)" }}>{account.manager} answers you directly, not a shared inbox.</span>
          <Button variant="secondary" icon="message-circle" onClick={() => window.CT_GO("contact")}>Message your contact</Button>
        </Card>
      </div>
    </div>
  );
}

function PortalDashboard({ data }) {
  const portal = data.portal;
  const [view, setView] = React.useState("overview");
  const [sheet, setSheet] = React.useState(null);
  const [students, setStudents] = React.useState(portal.students);
  const [payouts, setPayouts] = React.useState(portal.payouts);
  const [available, setAvailable] = React.useState(portal.wallet.available);
  const [methods, setMethods] = React.useState(portal.wallet.methods);
  const account = portal.account;
  const wallet = { ...portal.wallet, available, methods };

  const addMethod = (method, makeDefault) =>
    setMethods(makeDefault ? [method].concat(methods) : methods.concat([method]));

  const addStudent = (student) => setStudents([student].concat(students));

  const withdraw = (amount, methodPicked) => {
    setAvailable(available - amount);
    setPayouts([[
      "WD-" + String(1000 + payouts.length + 1),
      "Today",
      "Withdrawal · " + methodPicked.label,
      money(amount),
      "Processing",
    ]].concat(payouts));
  };

  const kpis = portal.kpis.map((k) => k.label === "Students referred"
    ? { ...k, value: String(students.length + 32) } : k);

  const copy = {
    overview: ["Good morning, " + account.person.split(" ")[0], "Everything on your territory at a glance."],
    students: ["My students", "Every referral, its stage and what it will pay."],
    commissions: ["Commissions", "What you have earned, and how to move it to your account."],
    materials: ["Materials", "Brochures, price lists and assets in your languages."],
    account: ["Account", "Your organisation, agreement and notification settings."],
  }[view];

  return (
    <div className="ct-portal" style={{ display: "grid", gridTemplateColumns: "minmax(240px,264px) 1fr", background: "var(--surface-subtle)", minHeight: "100dvh" }}>
      <PortalSidebar view={view} onView={setView} account={account} onSignOut={() => window.CT_GO("portal")} />
      <main style={{ padding: "var(--space-10) var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--space-8)", minWidth: 0 }}>
        <PortalHeader account={account} title={copy[0]} lead={copy[1]} onAddStudent={() => setSheet("student")} />
        {view === "overview" ? (
          <>
            <KpiRow kpis={kpis} />
            <div className="ct-split" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "var(--space-6)", alignItems: "start" }}>
              <Pipeline pipeline={portal.pipeline} />
              <ActionList actions={portal.actions} />
            </div>
            <StudentTable students={students.slice(0, 4)} compact />
          </>
        ) : null}
        {view === "students" ? <StudentTable students={students} /> : null}
        {view === "commissions" ? <Commissions portal={portal} wallet={wallet} payouts={payouts} onWithdraw={() => setSheet("withdraw")} onAddMethod={() => setSheet("method")} /> : null}
        {view === "materials" ? <Materials materials={portal.materials} /> : null}
        {view === "account" ? <AccountView account={account} /> : null}
        <Button variant="ghost" icon="arrow-left" onClick={() => window.CT_GO("home")} style={{ alignSelf: "flex-start" }}>Back to the website</Button>
      </main>

      <PortalSheet open={sheet === "student"} onClose={() => setSheet(null)}
        title="Add a student" lead="One short form. We take it from here and you see every stage in your pipeline.">
        <AddStudentForm universities={data.universities} onAdd={addStudent} onClose={() => setSheet(null)} />
      </PortalSheet>

      <PortalSheet open={sheet === "withdraw"} onClose={() => setSheet(null)}
        title="Withdraw funds" lead="Move cleared commission to your own account.">
        <WithdrawForm wallet={wallet} onWithdraw={withdraw} onClose={() => setSheet(null)} />
      </PortalSheet>

      <PortalSheet open={sheet === "method"} onClose={() => setSheet(null)}
        title="Add a payout method" lead="Pick the rail that reaches you fastest and costs you least.">
        <AddPayoutMethodForm wallet={wallet} onAdd={addMethod} onClose={() => setSheet(null)} />
      </PortalSheet>
    </div>
  );
}

Object.assign(window, { PortalDashboard, PortalSheet, AddStudentForm, WithdrawForm, AddPayoutMethodForm, StudentTable, KpiRow });
