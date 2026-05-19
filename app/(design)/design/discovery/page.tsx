/**
 * Discovery zone · design sketch
 *
 * Landing post-creazione trip in stile editoriale Wanderlust-inspired.
 * Composta come **sequenza di DiscoveryWidget** pescati da una libreria.
 * Il manifest (qui sotto: TOKYO_DISCOVERY) è editabile e personalizzabile
 * (CMS, Go, preferenze utente) — la home può cambiare ordine, mostrare
 * widget diversi per trip diversi, riusare lo stesso widget più volte.
 *
 * Library v1 (12): HeroDestination · WhyHere · RegionTileGrid · PhotoMosaic ·
 *                  GoBanner · EditorsChoice · LocalVoices · StarterPacks ·
 *                  ReadBeforeYouGo · BeforeYouGo · TrendingCards · GoPanelHint
 *
 * Tutto inline per agilità di iterazione.
 */

import "./discovery.css";

/* ─────────────────────────────────────────────────────────────────
   Widget library · types + components
───────────────────────────────────────────────────────────────── */

type HeroProps = {
  destination: string;
  eyebrow?: string;
  deck: string;
  ctaLabel: string;
  photoGradient: string;
};

function HeroDestination({ destination, eyebrow = "Go suggests", deck, ctaLabel, photoGradient }: HeroProps) {
  return (
    <div className="w-hero">
      <div className="left">
        <div className="eb"><span className="go-mark">五</span>{eyebrow}</div>
        <h1>{destination}.</h1>
        <p className="deck">{deck}</p>
        <span className="btn">
          {ctaLabel} <i className="ti ti-arrow-right" style={{ fontSize: "11px", color: "#fff" }} />
        </span>
      </div>
      <div className="photo" style={{ backgroundImage: photoGradient }} />
    </div>
  );
}

type WhyReason = { icon: string; title: string; body: string };
type WhyHereProps = { title: string; reasons: WhyReason[]; rightAction?: string };

function WhyHere({ title, reasons, rightAction = "More on the destination" }: WhyHereProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-why">
        {reasons.map((r, i) => (
          <div key={i} className="w-why-card">
            <div className="ic"><i className={`ti ${r.icon}`} /></div>
            <h4>{r.title}</h4>
            <p>{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type RegionTile = { name: string; gradient: string };
type RegionGridProps = { title: string; tiles: RegionTile[]; rightAction?: string };

function RegionTileGrid({ title, tiles, rightAction = "All districts" }: RegionGridProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-regions">
        {tiles.map((t) => (
          <div key={t.name} className="tile">
            <div className="img" style={{ background: t.gradient }} />
            <div className="label">{t.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type MosaicTile = { gradient: string; caption?: string; size?: "big" };
type PhotoMosaicProps = { title: string; tiles: MosaicTile[]; rightAction?: string };

function PhotoMosaic({ title, tiles, rightAction = "Open lightbox" }: PhotoMosaicProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-mosaic">
        {tiles.map((t, i) => (
          <div key={i} className={`tile ${t.size ?? ""}`}>
            <div className="img" style={{ background: t.gradient }} />
            <span className="save"><i className="ti ti-heart" /></span>
            {t.caption && <span className="cap">{t.caption}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

type GoBannerProps = {
  eyebrow?: string;
  question: string;
  deck: string;
  ctaLabel: string;
};

function GoBanner({ eyebrow = "Go listens", question, deck, ctaLabel }: GoBannerProps) {
  return (
    <div className="w-go-banner">
      <div className="orb">五</div>
      <div className="body">
        <div className="eb">{eyebrow}</div>
        <h3>{question}</h3>
        <p>{deck}</p>
      </div>
      <button className="cta">
        <i className="ti ti-sparkles" />
        {ctaLabel}
      </button>
    </div>
  );
}

type EditorItem = { gradient: string; eyebrow: string; title: string; deck?: string; size?: "lg" | "sm" };
type EditorsChoiceProps = { title: string; items: EditorItem[]; rightAction?: string };

function EditorsChoice({ title, items, rightAction = "More inspiration" }: EditorsChoiceProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-editors">
        {items.map((it, i) => (
          <div key={i} className={`ed-tile ${it.size ?? "sm"}`}>
            <div className="img" style={{ background: it.gradient }} />
            <div className="eb">{it.eyebrow}</div>
            <h3>{it.title}</h3>
            {it.deck && <p className="deck">{it.deck}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

type Voice = { quote: string; name: string; when: string; avatarGradient: string; initials: string };
type LocalVoicesProps = { title: string; voices: Voice[]; rightAction?: string };

function LocalVoices({ title, voices, rightAction = "All voices" }: LocalVoicesProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-voices">
        {voices.map((v, i) => (
          <div key={i} className="voice">
            <div className="quote">{v.quote}</div>
            <div className="author">
              <div className="avatar" style={{ backgroundImage: v.avatarGradient }}>{v.initials}</div>
              <div className="meta">
                <div className="nm">{v.name}</div>
                <div className="when">{v.when}</div>
              </div>
              <span className="read">Trip <i className="ti ti-arrow-up-right" /></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type StarterPack = { gradient: string; eyebrow: string; title: string };
type StarterPacksProps = { title: string; packs: StarterPack[]; rightAction?: string };

function StarterPacks({ title, packs, rightAction = "All starter packs" }: StarterPacksProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-packs">
        {packs.map((p, i) => (
          <div key={i} className="card">
            <div className="img" style={{ background: p.gradient }} />
            <div>
              <div className="eb">{p.eyebrow}</div>
              <h3>{p.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ReadingArticle = { gradient: string; eyebrow: string; title: string; author: string; readTime: string };
type ReadBeforeYouGoProps = { title: string; articles: ReadingArticle[]; rightAction?: string };

function ReadBeforeYouGo({ title, articles, rightAction = "All readings" }: ReadBeforeYouGoProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-read">
        {articles.map((a, i) => (
          <div key={i} className="read-card">
            <div className="ph" style={{ background: a.gradient }} />
            <div className="eb">{a.eyebrow}</div>
            <h4>{a.title}</h4>
            <div className="meta"><span><b>{a.author}</b></span><span>·</span><span>{a.readTime}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

type FaqItem = { icon: string; question: string; answer?: string; open?: boolean };
type BeforeYouGoProps = { title: string; items: FaqItem[]; rightAction?: string };

function BeforeYouGo({ title, items, rightAction = "All Q&A" }: BeforeYouGoProps) {
  return (
    <div className="dz-sec">
      <div className="dz-sec-h">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="w-faq">
        {items.map((q, i) => (
          <details key={i} className="faq-item" open={q.open}>
            <summary className="faq-q">
              <span className="icon"><i className={`ti ${q.icon}`} /></span>
              <span className="text">{q.question}</span>
              <span className="chev"><i className="ti ti-chevron-right" /></span>
            </summary>
            {q.answer && <div className="faq-a">{q.answer}</div>}
          </details>
        ))}
      </div>
    </div>
  );
}

type TrendingItem = { gradient: string; eyebrow: string; title: string };
type TrendingProps = { title: string; items: TrendingItem[]; rightAction?: string };

function TrendingCards({ title, items, rightAction = "All trending" }: TrendingProps) {
  return (
    <div className="w-trending">
      <div className="head">
        <h2>{title}</h2>
        <button className="dz-pill-out">{rightAction}</button>
      </div>
      <div className="grid">
        {items.map((it, i) => (
          <div key={i} className="item">
            <div className="ph" style={{ background: it.gradient }} />
            <div className="body">
              <div className="eb">{it.eyebrow}</div>
              <h4>{it.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type GoPanelHintProps = { message: string; action: string };

function GoPanelHint({ message, action }: GoPanelHintProps) {
  return (
    <div className="w-go-hint">
      <i className="ti ti-sparkles" />
      <span dangerouslySetInnerHTML={{ __html: message }} />
      <span className="right">
        {action} <i className="ti ti-arrow-up-right" style={{ fontSize: "11px" }} />
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget dispatcher · discriminated union
───────────────────────────────────────────────────────────────── */

type WidgetSpec =
  | { type: "HeroDestination";   props: HeroProps }
  | { type: "WhyHere";            props: WhyHereProps }
  | { type: "RegionTileGrid";    props: RegionGridProps }
  | { type: "PhotoMosaic";       props: PhotoMosaicProps }
  | { type: "GoBanner";          props: GoBannerProps }
  | { type: "EditorsChoice";     props: EditorsChoiceProps }
  | { type: "LocalVoices";       props: LocalVoicesProps }
  | { type: "StarterPacks";      props: StarterPacksProps }
  | { type: "ReadBeforeYouGo";   props: ReadBeforeYouGoProps }
  | { type: "BeforeYouGo";       props: BeforeYouGoProps }
  | { type: "TrendingCards";     props: TrendingProps }
  | { type: "GoPanelHint";       props: GoPanelHintProps };

function DiscoveryRow({ spec }: { spec: WidgetSpec }) {
  switch (spec.type) {
    case "HeroDestination":  return <HeroDestination  {...spec.props} />;
    case "WhyHere":          return <WhyHere          {...spec.props} />;
    case "RegionTileGrid":   return <RegionTileGrid   {...spec.props} />;
    case "PhotoMosaic":      return <PhotoMosaic      {...spec.props} />;
    case "GoBanner":         return <GoBanner         {...spec.props} />;
    case "EditorsChoice":    return <EditorsChoice    {...spec.props} />;
    case "LocalVoices":      return <LocalVoices      {...spec.props} />;
    case "StarterPacks":     return <StarterPacks     {...spec.props} />;
    case "ReadBeforeYouGo":  return <ReadBeforeYouGo  {...spec.props} />;
    case "BeforeYouGo":      return <BeforeYouGo      {...spec.props} />;
    case "TrendingCards":    return <TrendingCards    {...spec.props} />;
    case "GoPanelHint":      return <GoPanelHint      {...spec.props} />;
  }
}

/* ─────────────────────────────────────────────────────────────────
   Tokyo manifest · come si compone la Discovery per questo viaggio
───────────────────────────────────────────────────────────────── */

const TOKYO_DISCOVERY: WidgetSpec[] = [
  {
    type: "HeroDestination",
    props: {
      destination: "Tokyo",
      eyebrow: "Go suggests",
      deck: "Mille volti, un solo nome. Inizia a scegliere cosa vedere — Go costruirà i tuoi giorni.",
      ctaLabel: "Explore Tokyo",
      photoGradient: "linear-gradient(160deg,#dfa97e 0%,#c88b65 22%,#9a7d80 45%,#566677 70%,#3d4a64 100%)",
    },
  },
  {
    type: "WhyHere",
    props: {
      title: "Why Tokyo",
      reasons: [
        { icon: "ti-soup",           title: "Slow food, fast city",  body: "Una città che corre ma mangia piano. Banchi del pesce all'alba, omakase di dieci portate. Mai una scorciatoia sul gusto." },
        { icon: "ti-building-temple", title: "Tradizione viva",       body: "Senso-ji aperto dal settimo secolo. Ryokan dove si dorme su tatami. Cerimonia del tè come si fa da 400 anni." },
        { icon: "ti-bulb",           title: "Futuro presente",       body: "teamLab, Skytree, vending machine ovunque. La città inventa cose che il resto del mondo userà tra cinque anni." },
        { icon: "ti-heart-handshake", title: "Ospitalità silenziosa", body: "Omotenashi. Cura senza chiedere niente in cambio. Te ne accorgi tardi, e ti manca subito quando torni a casa." },
      ],
    },
  },
  {
    type: "RegionTileGrid",
    props: {
      title: "Where to start",
      tiles: [
        { name: "Asakusa",   gradient: "linear-gradient(160deg,#c4744a,#8a3c1c 60%,#4c1f0a)" },
        { name: "Shibuya",   gradient: "linear-gradient(160deg,#7a8aa3,#3d4a64 60%,#1a2840)" },
        { name: "Shinjuku",  gradient: "linear-gradient(160deg,#e8b889,#a07560 60%,#3d4a64)" },
        { name: "Yanesen",   gradient: "linear-gradient(160deg,#b89260,#7a5430 60%,#3d2618)" },
        { name: "Ginza",     gradient: "linear-gradient(160deg,#a8b5c4,#7b8395 60%,#3d4a64)" },
        { name: "Harajuku",  gradient: "linear-gradient(160deg,#d6b8a8,#896a55 60%,#4d3525)" },
        { name: "Akihabara", gradient: "linear-gradient(160deg,#a86a8a,#583058 60%,#2a1a30)" },
        { name: "Odaiba",    gradient: "linear-gradient(160deg,#4a7a9a,#1a3a5a 60%,#0a1a2a)" },
      ],
    },
  },
  {
    type: "PhotoMosaic",
    props: {
      title: "Tokyo in 6 fotografie",
      tiles: [
        { gradient: "linear-gradient(160deg,#d6a87f,#6b7a8b 60%,#475565)", size: "big", caption: "Skyline al tramonto · Roppongi" },
        { gradient: "linear-gradient(160deg,#c4744a,#4c1f0a)" },
        { gradient: "linear-gradient(160deg,#7a8aa3,#1a2840)" },
        { gradient: "linear-gradient(160deg,#b89260,#3d2618)" },
        { gradient: "linear-gradient(160deg,#9bbf9a,#557a45)" },
      ],
    },
  },
  {
    type: "GoBanner",
    props: {
      eyebrow: "Go listens",
      question: "Cosa cerchi da Tokyo?",
      deck: "Tre domande veloci sui tuoi gusti e ti costruisco uno starter pack personale. Foto incluse.",
      ctaLabel: "Talk to Go",
    },
  },
  {
    type: "EditorsChoice",
    props: {
      title: "Editors' choice",
      items: [
        {
          size: "lg",
          gradient: "linear-gradient(160deg,#dfa97e 0%,#9a7d80 50%,#3d4a64)",
          eyebrow: "Most popular · Starter pack",
          title: "Classic Tokyo in 5 days",
          deck: "\"I 12 luoghi che non puoi mancare. Da Asakusa a Shibuya, dal Senso-ji alla Skytree.\"",
        },
        {
          gradient: "linear-gradient(160deg,#c4744a,#4c1f0a)",
          eyebrow: "Eater · Food",
          title: "The 20 restaurants that define Tokyo today",
        },
        {
          gradient: "linear-gradient(160deg,#b8a8c9,#5d4a7a 60%,#2a1f3a)",
          eyebrow: "Atlas Obscura · Hidden",
          title: "Tokyo's strangest places",
        },
      ],
    },
  },
  {
    type: "LocalVoices",
    props: {
      title: "Recently from Tokyo",
      voices: [
        {
          quote: "Iniziate dall'alba al mercato del pesce — il resto del giorno è bonus. La luce di quelle prime ore è l'unica cosa che non potete davvero pianificare.",
          name: "Marco A.",
          when: "Agosto 2025 · 8 giorni",
          avatarGradient: "linear-gradient(135deg,#f47b3a,#a84818)",
          initials: "MA",
        },
        {
          quote: "Yanesen al tramonto vince su qualsiasi roof bar. Camminate piano. I gatti del quartiere se ne accorgono.",
          name: "Chiara S.",
          when: "Aprile 2025 · 5 giorni",
          avatarGradient: "linear-gradient(135deg,#3d6e0e,#1a3a05)",
          initials: "CS",
        },
      ],
    },
  },
  {
    type: "StarterPacks",
    props: {
      title: "What kind of traveler?",
      packs: [
        {
          gradient: "linear-gradient(160deg,#9bbf9a,#557a45)",
          eyebrow: "Starter pack · 4 days",
          title: "Tokyo for the foodie pilgrimage",
        },
        {
          gradient: "linear-gradient(160deg,#c4744a,#4c1f0a)",
          eyebrow: "Starter pack · 3 days",
          title: "Tokyo off the beaten path",
        },
      ],
    },
  },
  {
    type: "ReadBeforeYouGo",
    props: {
      title: "Read before you go",
      articles: [
        { gradient: "linear-gradient(160deg,#dfa97e,#3d4a64)", eyebrow: "Wanderlust · Long read", title: "Walking Tokyo: 12 km from Asakusa to Shibuya", author: "Sara K.",         readTime: "14 min" },
        { gradient: "linear-gradient(160deg,#c4744a,#4c1f0a)", eyebrow: "Eater · Food",          title: "The ramen guide for first-timers in Tokyo",     author: "Eater editors", readTime: "8 min"  },
        { gradient: "linear-gradient(160deg,#9bbf9a,#557a45)", eyebrow: "Atlas Obscura · Hidden", title: "Five Tokyo shrines no guidebook mentions",      author: "Atlas team",    readTime: "6 min"  },
      ],
    },
  },
  {
    type: "BeforeYouGo",
    props: {
      title: "Before you go · Tokyo",
      items: [
        { icon: "ti-credit-card", question: "Cash o carta?", open: true,
          answer: "Tokyo accetta carta più di quanto pensi, ma i posti più memorabili (tachigui, mercati, templi) sono ancora cash-only. Tieni almeno 10.000 yen al giorno e ricarica la IC card per metro e konbini." },
        { icon: "ti-train",       question: "IC card · Suica o Pasmo?" },
        { icon: "ti-wifi",        question: "SIM, eSIM o pocket wifi?" },
        { icon: "ti-shoe",        question: "Etiquette · cosa NON fare" },
        { icon: "ti-calendar",    question: "Quando andare · stagioni" },
      ],
    },
  },
  {
    type: "TrendingCards",
    props: {
      title: "Trending this week",
      items: [
        { gradient: "linear-gradient(160deg,#dfa97e,#3d4a64)",  eyebrow: "Tokyo · Art",           title: "teamLab Planets reopens with new pieces" },
        { gradient: "linear-gradient(160deg,#a8d6d2,#5f9e9a)",  eyebrow: "Tokyo · Culture",       title: "Sumida Hokusai exhibit · summer 2026" },
        { gradient: "linear-gradient(160deg,#c4b8a0,#7a6a55)",  eyebrow: "Tokyo · Neighborhoods", title: "Kichijoji: the place travelers can't stop saving" },
      ],
    },
  },
  {
    type: "GoPanelHint",
    props: {
      message: "<b>Hai trovato qualcosa che ti piace?</b> Salvalo nella wishlist · poi Go ti aiuterà a metterlo nei giorni giusti.",
      action: "Open Go panel",
    },
  },
];

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function DiscoverySketch() {
  return (
    <div className="dz-page">
      <div className="dz-tb">
        <span className="back"><i className="ti ti-arrow-left" />My trips</span>
        <div className="nav">
          <span className="on">Discover</span>
          <span>Wishlist</span>
          <span>Days</span>
          <span>Map</span>
        </div>
        <span className="right">Build trip →</span>
      </div>

      {TOKYO_DISCOVERY.map((spec, i) => (
        <DiscoveryRow key={i} spec={spec} />
      ))}

      <div style={{ padding: "32px 24px 48px", borderTop: "0.5px solid var(--color-border)", marginTop: 24 }}>
        <div style={{ fontSize: 11, color: "var(--color-orange)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>
          Library · 12 widget
        </div>
        <p style={{ fontSize: 13, color: "var(--color-ink-soft)", lineHeight: 1.6, maxWidth: 720 }}>
          La Discovery è una sequenza di <code style={{ background: "var(--color-surface-soft)", padding: "1px 5px", borderRadius: 3, fontSize: 12 }}>DiscoveryWidget</code> letti da un manifest <code style={{ background: "var(--color-surface-soft)", padding: "1px 5px", borderRadius: 3, fontSize: 12 }}>WidgetSpec[]</code>. Cambiando il manifest (per destinazione, stagione, profilo utente, A/B test) cambiano ordine, sezioni, riuso. Spec viva in <a className="text-orange-deep hover:underline" href="/dev/docs/safari" style={{ color: "var(--color-orange-deep)" }}>docs/design/safari.md</a>.
        </p>
      </div>
    </div>
  );
}
