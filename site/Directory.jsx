const DSU = window.CampusTurkeyDesignSystem_4d33e7;
const { Button, Icon, Tag, Card, Badge, SectionHeading, UniversityCard, DirectoryToolbar, CTABanner, ScrollReveal, BrandDivider } = DSU;

const AU = "assets";
const goU = (r) => window.CT_GO(r);

/*
 * The campus photograph for each university, by slug — thirty-seven of the forty.
 *
 * The university's own grounds or nothing: Harran, Van Yüzüncü Yıl and Süleyman Demirel
 * have no freely licensed photograph of their campus that could be verified as theirs,
 * and they keep the reserved frame rather than a stand-in. City photographs were tried
 * and removed — on a recruitment page the picture is evidence.
 *
 * The credit is a licence condition, not a courtesy. CC BY, CC BY-SA and the Free Art
 * Licence grant use only while the author and licence are stated.
 */
const CAMPUS_PHOTOS = {
  "istanbul-technical-university": { src: "/university-campus/istanbul-technical-university.webp", author: "Kurmanbek", licence: "CC BY-SA 4.0" },
  "bilkent-university": { src: "/university-campus/bilkent-university.webp", author: "Bilkent University", licence: "CC BY 2.5" },
  "ko-university": { src: "/university-campus/ko-university.webp", author: "Khutuck", licence: "CC BY-SA 3.0" },
  "akdeniz-university": { src: "/university-campus/akdeniz-university.webp", author: "Enessubasi33", licence: "CC BY-SA 4.0" },
  "sabanc-university": { src: "/university-campus/sabanc-university.webp", author: "Cerian", licence: "CC BY-SA 3.0" },
  "ukurova-university": { src: "/university-campus/ukurova-university.webp", author: "Zeynel Cebeci", licence: "CC BY-SA 4.0" },
  "karadeniz-technical-university": { src: "/university-campus/karadeniz-technical-university.webp", author: "Aleksasfi", licence: "Public domain" },
  "bo-azi-i-university": { src: "/university-campus/bo-azi-i-university.webp", author: "Denizmiş", licence: "CC BY 4.0" },
  "istanbul-university": { src: "/university-campus/istanbul-university.webp", author: "Dosseman", licence: "CC BY-SA 4.0" },
  "marmara-university": { src: "/university-campus/marmara-university.webp", author: "Anilyilmaz", licence: "CC BY 3.0" },
  "y-ld-z-technical-university": { src: "/university-campus/y-ld-z-technical-university.webp", author: "Chapultepec", licence: "Public domain" },
  "bah-e-ehir-university": { src: "/university-campus/bah-e-ehir-university.webp", author: "No machine-readable author provided. とある白い猫 assumed (based on copyright claims).", licence: "CC BY-SA 3.0" },
  "istanbul-bilgi-university": { src: "/university-campus/istanbul-bilgi-university.webp", author: "Kurmanbek", licence: "CC BY-SA 4.0" },
  "zye-in-university": { src: "/university-campus/zye-in-university.webp", author: "Bo yaser", licence: "CC BY-SA 4.0" },
  "ankara-university": { src: "/university-campus/ankara-university.webp", author: "Ankara University", licence: "CC0" },
  "ege-university": { src: "/university-campus/ege-university.webp", author: "Conquers", licence: "Public domain" },
  "hacettepe-university": { src: "/university-campus/hacettepe-university.webp", author: "Gargarapalvin", licence: "CC BY 4.0" },
  "gazi-university": { src: "/university-campus/gazi-university.webp", author: "Mojeartoza", licence: "CC BY-SA 4.0" },
  "dokuz-eyl-l-university": { src: "/university-campus/dokuz-eyl-l-university.webp", author: "Samizambak", licence: "CC BY-SA 4.0" },
  "ya-ar-university": { src: "/university-campus/ya-ar-university.webp", author: "ToprakM", licence: "CC BY-SA 4.0" },
  "uluda-university": { src: "/university-campus/uluda-university.webp", author: "Ollios", licence: "CC BY 3.0" },
  "sel-uk-university": { src: "/university-campus/sel-uk-university.webp", author: "Satirdan kahraman", licence: "CC BY-SA 4.0" },
  "anadolu-university": { src: "/university-campus/anadolu-university.webp", author: "Merhabaviki", licence: "CC0" },
  "ondokuz-may-s-university": { src: "/university-campus/ondokuz-may-s-university.webp", author: "İsmetby", licence: "CC BY-SA 4.0" },
  "mersin-university": { src: "/university-campus/mersin-university.webp", author: "Cobija", licence: "CC BY-SA 3.0" },
  "dicle-university": { src: "/university-campus/dicle-university.webp", author: "Sralp2", licence: "CC BY-SA 4.0" },
  "trakya-university": { src: "/university-campus/trakya-university.webp", author: "Hamdigumus", licence: "CC0" },
  "pamukkale-university": { src: "/university-campus/pamukkale-university.webp", author: "Medelam", licence: "CC BY-SA 4.0" },
  "sakarya-university": { src: "/university-campus/sakarya-university.webp", author: "Kurmanbek", licence: "CC BY-SA 4.0" },
  "adnan-menderes-university": { src: "/university-campus/adnan-menderes-university.webp", author: "Zeynel Cebeci", licence: "CC BY-SA 4.0" },
  "mu-la-s-tk-ko-man-university": { src: "/university-campus/mu-la-s-tk-ko-man-university.webp", author: "Gargarapalvin", licence: "CC BY 4.0" },
  "gaziantep-university": { src: "/university-campus/gaziantep-university.webp", author: "YG01", licence: "CC BY 4.0" },
  "atat-rk-university": { src: "/university-campus/atat-rk-university.webp", author: "Eğitmen Mahmut", licence: "CC BY-SA 3.0" },
  "anakkale-onsekiz-mart-university": { src: "/university-campus/anakkale-onsekiz-mart-university.webp", author: "Zafer", licence: "CC BY-SA 4.0" },
  "bayburt-university": { src: "/university-campus/bayburt-university.webp", author: "BAYBURT ÜNİVERSİTESİ", licence: "CC BY-SA 4.0" },
  "adana-alparslan-t-rke-science-and-technology-university": { src: "/university-campus/adana-alparslan-t-rke-science-and-technology-university.webp", author: "Chaelane", licence: "CC BY-SA 4.0" },
};
/*
 * The card image, or nothing. Campus photographs only: a card is a bare picture behind a
 * name, with no caption and no room for one, so a city view there would read as a claim
 * that it is the campus. The detail hero can show one because the city badge sits on the
 * image and the credit line names it underneath.
 */
const cardImage = (slug) =>
  CAMPUS_PHOTOS[slug]
    ? `${AU}${CAMPUS_PHOTOS[slug].src}`
    : undefined;

/** OpenStreetMap view of Türkiye. Tiles wrap horizontally, so panning east or west
 *  never runs out of map. Pins are university buildings, not city labels. */
function TurkeyMap({ universities, active, onSelect }) {
  const host = React.useRef(null);
  const map = React.useRef(null);
  const layer = React.useRef(null);

  React.useEffect(() => {
    if (!window.L || !host.current || map.current) return;
    const m = window.L.map(host.current, {
      worldCopyJump: true, scrollWheelZoom: false, zoomControl: true,
      minZoom: 4, maxZoom: 14, attributionControl: true,
    });
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, noWrap: false, attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);
    m.fitBounds([[35.8, 25.6], [42.4, 44.8]], { padding: [24, 24] });
    m.on("click", () => onSelect(null));
    layer.current = window.L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(host.current);
    const t = setTimeout(() => m.invalidateSize(), 250);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, []);

  React.useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    universities.forEach((u) => {
      const on = active === u.slug;
      const html = `<span class="ct-pin${on ? " ct-pin-on" : ""}" title="${u.name}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V8l6-4 6 4v13"/><path d="M10 21v-5h4v5"/><path d="M10 11h.01"/><path d="M14 11h.01"/></svg></span>`;
      const marker = window.L.marker([u.lat, u.lng], {
        icon: window.L.divIcon({ html, className: "ct-pin-wrap", iconSize: [34, 34], iconAnchor: [17, 17] }),
        title: u.name, riseOnHover: true,
      });
      marker.bindTooltip(`${u.name}<br><b>${u.city}</b> · ${u.type} · ${u.tuition}`, { direction: "top", offset: [0, -14] });
      marker.on("click", (e) => { window.L.DomEvent.stopPropagation(e); onSelect(u.slug); });
      marker.addTo(layer.current);
    });
  }, [universities, active]);

  return (
    <Card padding="0" style={{ overflow: "hidden", position: "relative" }}>
      <div ref={host} style={{ width: "100%", height: "clamp(320px,46vh,520px)", background: "var(--neutral-100)" }}></div>
      <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 500, display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "8px 14px", borderRadius: "var(--radius-pill)", background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)", color: "var(--green-800)" }}>
        <Icon name="mouse-pointer-click" size={14} color="var(--green-600)" />
        {universities.length} campuses shown. Click a pin to open the university.
      </div>
    </Card>
  );
}

function UniversitiesScreen({ data, initialCity }) {
  const [city, setCity] = React.useState(initialCity || null);
  const [type, setType] = React.useState(null);
  const [scholarship, setScholarship] = React.useState(false);
  const [lang, setLang] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState("grid");
  const [sort, setSort] = React.useState("Most popular");
  const [shown, setShown] = React.useState(9);
  const [pin, setPin] = React.useState(null);

  const cities = [...new Set(data.universities.map((u) => u.city))]
    .map((c) => ({ name: c, count: data.universities.filter((u) => u.city === c).length }))
    .sort((a, b) => b.count - a.count);

  const filtered = data.universities.filter((u) =>
    (!city || u.city === city) && (!type || u.type === type) &&
    (!scholarship || u.scholarship) &&
    (!lang || u.languages.includes(lang)) &&
    (!query || u.name.toLowerCase().includes(query.toLowerCase()) || u.city.toLowerCase().includes(query.toLowerCase())));

  const money = (t) => parseInt(String(t).replace(/[^0-9]/g, ""), 10) || 0;
  const sorted = [...filtered].sort((a, b) =>
    sort === "Name A to Z" ? a.name.localeCompare(b.name)
      : sort === "Lowest tuition" ? money(a.tuition) - money(b.tuition)
        : b.programs - a.programs);
  const list = sorted.slice(0, shown);
  const clear = () => { setCity(null); setType(null); setScholarship(false); setLang(null); setQuery(""); setPin(null); };

  const onPin = (slug) => {
    setPin(slug);
    if (slug) goU(`university/${slug}`);
  };

  return (
    <div style={{ background: "var(--surface-subtle)", paddingTop: 140 }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)", paddingBottom: "var(--section-y)" }}>
        <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span className="ct-eyebrow">University directory</span>
          <h1 style={{ fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", color: "var(--text-heading)", margin: 0, maxWidth: "20ch" }}>Find your university in Türkiye</h1>
          <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0, maxWidth: 620 }}>
            {`${data.universities.length} universities in the directory today, out of 200+ we hold agreements with. Filter by city, type, language of instruction and scholarships.`}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={80}><TurkeyMap universities={filtered} active={pin} onSelect={onPin} /></ScrollReveal>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", height: 44, padding: "0 16px", background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", minWidth: 260 }}>
            <Icon name="search" size={17} color="var(--neutral-500)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by university or city" aria-label="Search universities"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)" }} />
          </div>
          {["Public", "Private"].map((t) => (
            <Tag key={t} selected={type === t} onClick={() => setType(type === t ? null : t)}
              count={data.universities.filter((u) => u.type === t).length}>{t}</Tag>
          ))}
          <Tag selected={scholarship} onClick={() => setScholarship(!scholarship)}
            count={data.universities.filter((u) => u.scholarship).length}>Scholarship</Tag>
          <Tag selected={lang === "English"} onClick={() => setLang(lang === "English" ? null : "English")}
            count={data.universities.filter((u) => u.languages.includes("English")).length}>English-taught</Tag>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <span className="ct-eyebrow" style={{ marginInlineEnd: "var(--space-2)" }}>City</span>
          {cities.slice(0, 10).map((c) => (
            <Tag key={c.name} selected={city === c.name} count={c.count}
              onClick={() => setCity(city === c.name ? null : c.name)}
              onRemove={city === c.name ? () => setCity(null) : undefined}>{c.name}</Tag>
          ))}
        </div>

        <DirectoryToolbar total={data.universities.length} shown={list.length} view={view} onViewChange={setView} onClear={clear}
          sort={sort} sortOptions={["Most popular", "Name A to Z", "Lowest tuition"]} onSortChange={(e) => setSort(e.target.value)} />

        {list.length ? (
          <div style={{ display: view === "grid" ? "grid" : "flex", flexDirection: view === "grid" ? undefined : "column", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--space-6)" }}>
            {list.map((u, i) => (
              <ScrollReveal key={u.slug} delay={(i % 3) * 80} style={{ display: "flex" }}>
                <UniversityCard {...u} image={cardImage(u.slug)} href={`#/university/${u.slug}`} layout={view === "grid" ? "grid" : "row"} style={{ width: "100%" }} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <Card style={{ textAlign: "center", padding: "var(--space-16)" }}>
            <Icon name="search-x" size={26} color="var(--neutral-400)" />
            <h3 style={{ margin: "var(--space-4) 0 var(--space-2)", fontSize: "var(--fs-h3)" }}>No universities match those filters</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>Clear a filter and try again, or message us and we will search for you.</p>
            <Button variant="secondary" icon="rotate-ccw" onClick={clear} style={{ marginInline: "auto" }}>Clear filters</Button>
          </Card>
        )}

        {shown < filtered.length ? (
          <Button variant="secondary" size="lg" icon="chevron-down" onClick={() => setShown(shown + 9)} style={{ marginInline: "auto" }}>
            Load more universities
          </Button>
        ) : null}

        <ScrollReveal><CTABanner eyebrow="Not sure which one" title="Send us your grades and we will shortlist for you"
          body="One short form. We reply with universities you can actually get into." primaryLabel="Apply Now"
          primaryHref="#/apply" secondaryLabel="Book a Consultation" secondaryHref="#/contact" assetBase={AU} /></ScrollReveal>
      </div>
    </div>
  );
}

function Facts({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "var(--space-6)" }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="ct-eyebrow">{k}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h3)", color: "var(--text-heading)" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function UniversityDetailScreen({ data, slug }) {
  const u = data.universities.find((x) => x.slug === slug) || data.universities[0];
  const similar = data.universities.filter((x) => x.slug !== u.slug && (x.city === u.city || x.type === u.type)).slice(0, 3);
  return (
    <div style={{ background: "var(--surface-subtle)" }}>
      {/* The university behind its own title. Darkened at the source rather than veiled
          by a green wash — the same call the homepage hero makes, so the photograph still
          reads as a place. Decorative: the framed copy below carries the alt and credit. */}
      <section style={{ position: "relative", overflow: "hidden", background: "var(--gradient-brand-deep)", paddingTop: 150, paddingBottom: "calc(var(--section-y) + 40px)", marginBottom: "calc(var(--overlap) * -1)" }}>
        {CAMPUS_PHOTOS[u.slug] ? (
          <>
            <img src={`${AU}${CAMPUS_PHOTOS[u.slug].src}`} alt="" aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45)" }} />
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--gradient-protect-bottom)" }} />
          </>
        ) : null}
        <div className="ct-container" style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <button type="button" onClick={() => goU("universities")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,.78)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", cursor: "pointer", width: "fit-content", padding: 0 }}>
            <Icon name="arrow-left" size={16} /> All universities
          </button>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Badge tone="onDark" icon="map-pin">{u.city}</Badge>
            <Badge tone="onDark">{u.type}</Badge>
            {u.scholarship ? <Badge tone="onDark" icon="award">Scholarships available</Badge> : null}
          </div>
          <h1 style={{ color: "var(--white)", fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", maxWidth: "18ch", margin: 0 }}>{u.name}</h1>
          <p style={{ color: "rgba(255,255,255,.86)", fontSize: "var(--fs-lead)", maxWidth: 620, margin: 0 }}>{u.ranking}. Taught in {u.languages.join(" and ")}.</p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)", alignItems: "center" }}>
            <Button variant="onDark" size="lg" onClick={() => goU("apply")}>Apply Now</Button>
            <Button variant="outlineOnDark" size="lg" icon="calendar-check" onClick={() => goU("contact")}>Book a Consultation</Button>
          </div>
          {/* The credit sits with the photograph, which is now the hero. It used to sit
              under a framed copy of the same image further down — two prints of one
              photograph, both on screen at once. */}
          {CAMPUS_PHOTOS[u.slug] ? (
            <p style={{ margin: "var(--space-4) 0 0", fontFamily: "var(--font-ui)", fontSize: "var(--fs-micro)", color: "rgba(255,255,255,.72)" }}>
              Photo: {CAMPUS_PHOTOS[u.slug].author} · {CAMPUS_PHOTOS[u.slug].licence} · via Wikimedia Commons
            </p>
          ) : null}
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 10, background: "var(--surface-subtle)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", padding: "var(--section-y) 0" }}>
        <div className="ct-container ct-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px,340px)", gap: "var(--space-12)", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
            <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>About the university</h2>
              <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0 }}>{u.about}</p>
              <BrandDivider />
              <Facts items={[["Founded", u.founded], ["Students", u.students], ["Programs", u.programs], ["Tuition", u.tuition]]} />
            </ScrollReveal>

            <ScrollReveal delay={80} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Popular faculties</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                {u.faculties.map((f) => <Tag key={f}>{f}</Tag>)}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={160} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Dates for the 2026 intake</h2>
              <Card padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {u.deadlines.map(([k, v], i) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-6)", flexWrap: "wrap", paddingTop: i ? "var(--space-4)" : 0, borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontWeight: "var(--fw-medium)", color: "var(--green-800)" }}>{k}</span>
                    <span style={{ color: "var(--text-body)" }}>{v}</span>
                  </div>
                ))}
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={200} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>Similar universities</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "var(--space-5)" }}>
                {similar.map((s) => <UniversityCard key={s.slug} {...s} image={cardImage(s.slug)} href={`#/university/${s.slug}`} style={{ width: "100%" }} />)}
              </div>
            </ScrollReveal>
          </div>

          <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <Card surface="tinted" padding="var(--space-8)" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span className="ct-eyebrow">Yearly tuition</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h1)", lineHeight: 1, color: "var(--green-700)" }}>{u.tuition}</span>
              <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-body)", margin: 0 }}>
                Living costs in {u.city} run about $350 to $550 per month, including housing.
              </p>
              <Button variant="primary" size="lg" fullWidth onClick={() => goU("apply")}>Apply Now</Button>
              <Button variant="secondary" fullWidth icon="calendar-check" onClick={() => goU("contact")}>Book a Consultation</Button>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", margin: 0 }}>We confirm the exact fee with the university before you pay anything.</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { UniversitiesScreen, UniversityDetailScreen, TurkeyMap });
