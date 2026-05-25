"use client";

/**
 * Trip Home · design sketch (v2)
 *
 * Pagina unica post-create, definitiva dopo le iterazioni in chat:
 *   - Boarding pass come hero (destination + countdown timer)
 *   - AI/roadmap (proposta B): boarding stages a sx + pannello Go ink a dx
 *   - X2 informazioni pratiche: una sola finestra ricca con tab a 6
 *   - Ticket details: settings orizzontali (luogo locked, date, viaggiatori, temi)
 *   - "Lo sapevi" outro strip
 *
 * Sostituisce la versione precedente (sei stati stackati con countdown centrato).
 * Riferimento HTML standalone: outputs/trip-home.html
 *
 * Tutto inline per agilità. Non monta dati reali — struttura/visual.
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  IconAmbulance,
  IconArrowRight,
  IconBuildingBank,
  IconBulb,
  IconCalendar,
  IconCash,
  IconCloud,
  IconCoin,
  IconEye,
  IconHandStop,
  IconLanguage,
  IconLock,
  IconMapPin,
  IconPencil,
  IconPlane,
  IconPlaneDeparture,
  IconPlug,
  IconShieldCheck,
  IconSparkles,
  IconUsers,
  IconWorld,
} from "@/components/ui/icons";

/* ─────────────────────────────────────────────────────────────────
   Mock AppHeader (proxy visivo di Row 1 + Row 2 in trip context)
───────────────────────────────────────────────────────────────── */

function MockAppHeader() {
  return (
    <>
      <header className="bg-surface border-b border-border px-6 py-3.5 flex items-center gap-7">
        <a href="#" className="font-serif italic text-lg text-ink flex items-center gap-1.5 no-underline">
          <span className="font-serif">五</span> Travel<b className="font-medium">Go</b>
        </a>
        <nav className="flex gap-[22px] text-meta text-ink-faint">
          <a href="#" className="text-ink font-medium border-b-2 border-orange pb-0.5">My trips</a>
          <a href="#" className="hover:text-ink">Explore</a>
          <a href="#" className="hover:text-ink">Yumeji</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-meta text-ink-faint">🇮🇹</span>
          <span className="w-[30px] h-[30px] rounded-full bg-ink text-white text-tiny font-semibold inline-flex items-center justify-center">ED</span>
        </div>
      </header>
      <div className="bg-bg border-b border-border px-6 py-2.5 flex items-center gap-3">
        <span className="text-micro font-medium tracking-eyebrow uppercase text-orange-deep">Tokyo 2026</span>
        <span className="text-ink-muted text-mini">·</span>
        <span className="text-mini text-ink-faint">9 notti · 27 lug → 5 ago</span>
        <nav className="ml-auto flex gap-1 items-center">
          <a href="#" className="px-3 py-1 rounded-pill text-mini bg-ink text-white">Trip</a>
          <a href="#" className="px-3 py-1 rounded-pill text-mini text-ink-faint hover:bg-surface-soft">Day by day</a>
          <a href="#" className="px-3 py-1 rounded-pill text-mini text-ink-faint hover:bg-surface-soft">Explore</a>
          <span className="w-px h-[18px] bg-border-strong mx-1" />
          <span className="px-2.5 py-1 border border-border-strong rounded-pill text-mini text-ink-faint inline-flex items-center gap-1">
            <IconEye size={12} /> View mode
          </span>
          <span className="font-serif text-orange-deep px-2.5 py-1 text-[16px]" title="Yumeji">夢</span>
        </nav>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Boarding pass
───────────────────────────────────────────────────────────────── */

function BoardingPass() {
  return (
    <section className="bg-surface border border-border rounded-md overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_30%] relative">
      <span
        className="hidden lg:block absolute left-[70%] top-0 bottom-0 w-px pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(13,44,61,0.20) 0, rgba(13,44,61,0.20) 5px, transparent 5px, transparent 10px)",
          backgroundSize: "100% 10px",
        }}
        aria-hidden="true"
      />
      <span className="hidden lg:block absolute left-[calc(70%-8px)] -top-2 w-4 h-4 rounded-full bg-bg" aria-hidden="true" />
      <span className="hidden lg:block absolute left-[calc(70%-8px)] -bottom-2 w-4 h-4 rounded-full bg-bg" aria-hidden="true" />

      <div className="px-7 py-6">
        <div className="flex items-center justify-between mb-5">
          <span className="text-tiny tracking-[0.15em] uppercase text-ink-muted font-medium">Boarding pass · TG-2026-TOK</span>
          <span className="inline-flex items-center gap-1.5 text-tiny tracking-eyebrow uppercase text-orange-deep font-medium">
            <span className="w-4 h-4 rounded-full bg-[#d83b3b] inline-block" /> Japan
          </span>
        </div>

        <div className="flex items-end gap-6 mb-5">
          <div>
            <p className="text-tiny tracking-eyebrow uppercase text-ink-muted m-0">From</p>
            <p className="font-serif italic text-[28px] leading-none text-ink font-medium mt-1 mb-1">Rome</p>
            <p className="text-tiny text-ink-faint m-0">FCO · 13:25</p>
          </div>
          <span className="text-[26px] text-orange-deep mb-1.5">
            <IconPlane size={26} />
          </span>
          <div>
            <p className="text-tiny tracking-eyebrow uppercase text-ink-muted m-0">To</p>
            <p className="font-serif italic text-[50px] leading-[0.95] text-ink font-medium mt-0.5 mb-1">Tokyo</p>
            <p className="text-tiny text-ink-faint m-0">HND · 08:50 +1 · Japan</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3.5 pt-4 border-t border-dashed border-border">
          <div>
            <p className="text-[9px] tracking-meta uppercase text-ink-muted m-0 font-medium">Passenger</p>
            <p className="text-mini text-ink font-medium mt-0.5">Enrico + 1</p>
          </div>
          <div>
            <p className="text-[9px] tracking-meta uppercase text-ink-muted m-0 font-medium">Date</p>
            <p className="text-mini text-ink font-medium mt-0.5">27 LUG 26</p>
          </div>
          <div>
            <p className="text-[9px] tracking-meta uppercase text-ink-muted m-0 font-medium">Stay</p>
            <p className="text-mini text-ink font-medium mt-0.5">9 nights</p>
          </div>
          <div>
            <p className="text-[9px] tracking-meta uppercase text-ink-muted m-0 font-medium">Mood</p>
            <p className="text-mini text-ink font-medium mt-0.5">Cultura · cibo</p>
          </div>
        </div>
      </div>

      <div className="bg-ink text-white px-5 py-5 lg:pl-8 text-center flex flex-col items-center justify-center">
        <p className="text-tiny tracking-[0.18em] uppercase text-orange-light m-0">Departure in</p>
        <div className="flex items-baseline gap-1.5 my-1.5">
          <span className="font-serif italic text-[78px] leading-[0.85] text-white font-medium">63</span>
          <span className="font-serif italic text-meta text-white/75">days</span>
        </div>
        <p className="font-serif italic text-mini text-white/75 leading-snug mt-1.5">
          «Iniziamo dal piano,<br />Enrico?» — Go
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AI + Roadmap (proposta B): stages a sx + Go panel a dx
───────────────────────────────────────────────────────────────── */

type StageStatus = "done" | "now" | "todo" | "takeoff";
type Stage = { id: string; label: string; sub: string; status: StageStatus };

const STAGES: Stage[] = [
  { id: "plan",     label: "Plan",     sub: "fatto",   status: "done" },
  { id: "build",    label: "Build",    sub: "ora",     status: "now" },
  { id: "book",     label: "Book",     sub: "presto",  status: "todo" },
  { id: "pack",     label: "Pack",     sub: "—",       status: "todo" },
  { id: "takeoff",  label: "Takeoff",  sub: "27 lug",  status: "takeoff" },
];

function AiAndRoadmap() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3.5">
      <div className="bg-surface border border-border rounded-md px-7 py-6 flex flex-col justify-center">
        <SectionHeader title="Boarding stages" meta="2 di 5" />
        <div className="grid grid-cols-5 gap-2 relative px-2 mt-2">
          <span className="absolute top-[9px] left-[10%] right-[10%] h-0.5 bg-ink/10" />
          <span className="absolute top-[9px] left-[10%] w-[30%] h-0.5 bg-orange" />
          {STAGES.map((s) => (
            <div key={s.id} className="relative text-center z-10">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full",
                  s.status === "done" && "w-[18px] h-[18px] bg-orange border-[3px] border-white",
                  s.status === "now" && "w-[18px] h-[18px] bg-orange border-[3px] border-white shadow-[0_0_0_4px_rgba(244,123,58,0.30)]",
                  s.status === "todo" && "w-[18px] h-[18px] bg-white border-2 border-ink/25",
                  s.status === "takeoff" && "w-[18px] h-[18px] bg-white border-2 border-ink/25",
                )}
              >
                {s.status === "takeoff" && <IconPlaneDeparture size={10} className="text-ink-faint" />}
              </span>
              <p
                className={cn(
                  "mt-2 text-mini",
                  s.status === "done" && "text-ink font-medium",
                  s.status === "now" && "text-orange-deep font-medium",
                  (s.status === "todo" || s.status === "takeoff") && "text-ink-faint",
                )}
              >
                {s.label}
              </p>
              <p className={cn("text-tiny", s.status === "now" ? "text-orange-deep" : "text-ink-muted")}>{s.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 px-3.5 py-3 bg-orange/[0.06] rounded-md border-l-[3px] border-orange">
          <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium m-0">Stage corrente</p>
          <p className="font-serif italic text-meta text-ink mt-1">Build · nove giorni di Tokyo da disegnare</p>
        </div>
      </div>

      <div className="bg-ink rounded-md px-5 py-5 text-white relative overflow-hidden">
        <span className="absolute -top-[30px] -right-[30px] w-[100px] h-[100px] rounded-full bg-orange/[0.18]" aria-hidden="true" />
        <span className="absolute -bottom-[35px] left-[20%] w-[60px] h-[60px] rounded-full bg-orange/[0.10]" aria-hidden="true" />
        <div className="relative">
          <span className="w-14 h-14 rounded-full bg-orange/30 inline-flex items-center justify-center mb-3.5 animate-pulse-halo">
            <IconSparkles size={26} className="text-[#ffd1a8]" />
          </span>
          <p className="text-tiny tracking-[0.14em] uppercase text-orange-light font-medium m-0">Express lane</p>
          <p className="font-serif italic text-[17px] text-white leading-snug mt-1 mb-4">
            «Cinque domande e ti porgo Tokyo già pronta, Enrico.»
          </p>
          <button
            type="button"
            className="w-full bg-orange hover:bg-orange-deep text-white border-0 px-4 py-2.5 rounded-pill text-meta font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            Inizia con Go <IconArrowRight size={14} />
          </button>
          <p className="mt-3 font-serif italic text-tiny text-white/55 text-center">
            o <a href="#" className="text-white/85 underline decoration-white/30">costruisci a mano →</a>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Section header helper
───────────────────────────────────────────────────────────────── */

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline gap-2.5 mb-5">
      <span className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium">{title}</span>
      <span className="flex-1 h-px bg-border" />
      {meta && <span className="font-serif italic text-tiny text-ink-muted">{meta}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   X2 · Informazioni pratiche (one big panel + 6 tabs + rich pane)
───────────────────────────────────────────────────────────────── */

type TabId = "currency" | "visa" | "weather" | "power" | "language" | "safety";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "currency", label: "Valuta",     icon: <IconCoin size={15} /> },
  { id: "visa",     label: "Visto",      icon: <IconWorld size={15} /> },
  { id: "weather",  label: "Clima",      icon: <IconCloud size={15} /> },
  { id: "power",    label: "Corrente",   icon: <IconPlug size={15} /> },
  { id: "language", label: "Lingua",     icon: <IconLanguage size={15} /> },
  { id: "safety",   label: "Sicurezza",  icon: <IconShieldCheck size={15} /> },
];

function InfoPanel() {
  const [tab, setTab] = useState<TabId>("currency");
  return (
    <section className="bg-surface border border-border rounded-md overflow-hidden">
      <div className="flex gap-1 px-3 pt-2.5 border-b border-border overflow-x-auto">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-mini border-b-2 -mb-px transition-colors whitespace-nowrap font-sans",
                active
                  ? "border-orange text-ink font-medium"
                  : "border-transparent text-ink-faint hover:text-ink",
              )}
            >
              <span className={active ? "text-orange-deep" : "text-ink-muted"}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="px-7 py-6">{renderPane(tab)}</div>
    </section>
  );
}

function renderPane(tab: TabId): React.ReactNode {
  switch (tab) {
    case "currency": return <CurrencyPane />;
    case "visa":     return <VisaPane />;
    case "weather":  return <WeatherPane />;
    case "power":    return <PowerPane />;
    case "language": return <LanguagePane />;
    case "safety":   return <SafetyPane />;
  }
}

function PaneEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block mb-3.5 text-mini tracking-[0.10em] uppercase text-orange-deep font-medium">
      {children}
    </span>
  );
}

function PaneHero({ big, sub }: { big: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3.5 mb-4 flex-wrap">
      <span className="font-serif italic text-[42px] leading-none text-ink font-medium">{big}</span>
      <span className="font-serif italic text-meta text-ink-soft">{sub}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-3 border-b border-border/60 last:border-0 gap-4">
      <span className="text-meta text-ink-soft">{k}</span>
      <span className="text-meta text-ink font-medium text-right">{v}</span>
    </div>
  );
}

function Take({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2 text-meta text-ink-soft leading-snug">
      <span className="text-orange-deep mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function GreenDot() {
  return <span aria-hidden className="inline-block w-2 h-2 rounded-full bg-emerald-600 align-middle mr-2" />;
}

function EmergencyRow({
  icon,
  label,
  desc,
  num,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  num: string;
}) {
  return (
    <div className="grid grid-cols-[32px_1fr_auto] gap-3.5 items-center py-3 border-b border-border/60 last:border-0">
      <span className="w-8 h-8 rounded-full bg-orange-soft text-orange-deep inline-flex items-center justify-center">
        {icon}
      </span>
      <div>
        <p className="m-0 text-meta text-ink font-medium">{label}</p>
        <p className="m-0 text-mini text-ink-soft mt-0.5">{desc}</p>
      </div>
      <span className="font-mono text-[16px] text-ink font-medium">{num}</span>
    </div>
  );
}

/* ── 6 panes (simplified, readable) ─────────────────────────── */

function CurrencyPane() {
  const [eur, setEur] = useState("50");
  const jpy = Math.round((parseFloat(eur) || 0) * 168)
    .toLocaleString("it-IT")
    .replace(/\./g, " ");
  return (
    <>
      <PaneEyebrow>Valuta · ¥ JPY</PaneEyebrow>
      <PaneHero big="168 ¥" sub="per 1 € · oggi" />
      <div className="flex items-center gap-3 px-3.5 py-3 bg-bg rounded-md mb-4">
        <input
          type="text"
          value={eur}
          onChange={(e) => setEur(e.target.value)}
          className="w-[70px] bg-surface border border-border-strong rounded-md px-2.5 py-1.5 text-meta text-right text-ink tabular-nums font-mono focus:outline focus:outline-2 focus:outline-orange-light"
        />
        <span className="text-meta text-ink-soft">€</span>
        <span className="text-orange-deep">→</span>
        <span className="font-serif italic text-[22px] text-ink font-medium tabular-nums">{jpy} ¥</span>
      </div>
      <Take icon={<IconCash size={16} />}>
        <b className="font-medium text-ink">Cash king</b> — konbini, templi e izakaya piccoli accettano solo contanti.
      </Take>
      <Take icon={<IconHandStop size={16} />}>
        <b className="font-medium text-ink">Niente mancia</b> — può perfino offendere.
      </Take>
    </>
  );
}

function VisaPane() {
  return (
    <>
      <PaneEyebrow>Visto · passaporto italiano</PaneEyebrow>
      <PaneHero
        big="Non serve"
        sub={
          <>
            <GreenDot />
            fino a 90 giorni · turismo
          </>
        }
      />
      <Row k="Validità passaporto" v="Tutta la durata del soggiorno" />
      <Row k="Biglietto di ritorno" v="Richiesto allo sbarco" />
      <Row k="Indirizzo prima notte" v="Richiesto allo sbarco" />
    </>
  );
}

function WeatherPane() {
  return (
    <>
      <PaneEyebrow>Clima · fine luglio</PaneEyebrow>
      <PaneHero big="26° / 22°" sub="media max / min · estate piena" />
      <Row k="Pioggia" v="11 giorni su 30" />
      <Row k="Umidità" v="78% · soffocante" />
      <Row k="UV index" v="9 · molto alto" />
      <Row k="Tifoni" v="Possibili da metà agosto" />
    </>
  );
}

function PowerPane() {
  return (
    <>
      <PaneEyebrow>Corrente</PaneEyebrow>
      <PaneHero big="Tipo A" sub="100 V · adattatore necessario" />
      <Row k="Voltaggio" v="100 V · USB-C OK senza trasformatore" />
      <Row k="Frequenza" v="50 Hz est · 60 Hz ovest" />
      <Row k="Powerbank" v="In cabina, mai in stiva" />
    </>
  );
}

function LanguagePane() {
  const phrases = [
    { it: "Ciao", jp: "こんにちは", ro: "kon-nichi-wa" },
    { it: "Grazie", jp: "ありがとうございます", ro: "arigatō gozaimasu" },
    { it: "Scusi", jp: "すみません", ro: "sumimasen" },
    { it: "Quanto costa?", jp: "いくらですか", ro: "ikura desu ka" },
    { it: "Dov'è il bagno?", jp: "トイレはどこですか", ro: "toire wa doko desu ka" },
  ];
  return (
    <>
      <PaneEyebrow>Lingua · 日本語</PaneEyebrow>
      <div className="flex flex-col">
        {phrases.map((p, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[1fr_auto_1fr] gap-4 py-3 items-baseline",
              i < phrases.length - 1 && "border-b border-border/60",
            )}
          >
            <span className="text-meta text-ink-soft">{p.it}</span>
            <span className="font-serif italic text-[19px] text-ink text-center">{p.jp}</span>
            <span className="font-serif italic text-mini text-ink-muted text-right">{p.ro}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function SafetyPane() {
  return (
    <>
      <PaneEyebrow>Sicurezza · Farnesina</PaneEyebrow>
      <PaneHero
        big="Molto sicura"
        sub={
          <>
            <GreenDot />
            precauzione ordinaria
          </>
        }
      />
      <EmergencyRow
        icon={<IconShieldCheck size={16} />}
        label="Polizia"
        desc="Emergenza generale"
        num="110"
      />
      <EmergencyRow
        icon={<IconAmbulance size={16} />}
        label="Ambulanza · Vigili del fuoco"
        desc="Soccorso medico"
        num="119"
      />
      <EmergencyRow
        icon={<IconBuildingBank size={16} />}
        label="Ambasciata d'Italia"
        desc="Tokyo · 24h"
        num="03-3453-5291"
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Ticket details (settings: luogo locked, date, viaggiatori, temi)
───────────────────────────────────────────────────────────────── */

function TicketDetails() {
  return (
    <section className="bg-surface border border-border rounded-md px-6 py-4">
      <div className="flex items-baseline gap-2.5 mb-3.5">
        <span className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium">Il tuo viaggio</span>
        <span className="flex-1 h-px bg-border" />
        <span className="text-mini text-orange-deep bg-orange/[0.10] px-2.5 py-0.5 rounded-pill">tocca per modificare</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr] gap-5">
        <SettingRow icon={<IconMapPin size={14} />} k="Luogo" v="Tokyo, Giappone" locked />
        <SettingRow icon={<IconCalendar size={14} />} k="Date" v="27 lug → 5 ago" desc="9 notti · alta stagione estiva" />
        <SettingRow icon={<IconUsers size={14} />} k="Viaggiatori" v="2 adulti" desc="Enrico + 1" />
        <SettingRow icon={<IconSparkles size={14} />} k="Temi" desc="«Lento, niente sveglie all'alba. Solo cose belle.»">
          <div className="flex flex-wrap gap-1 mt-1">
            <Tag>Cultura</Tag>
            <Tag>Cibo</Tag>
            <Tag off>Natura</Tag>
            <Tag off>Spirituale</Tag>
            <Tag off>+5</Tag>
          </div>
        </SettingRow>
      </div>
    </section>
  );
}

function SettingRow({
  icon,
  k,
  v,
  desc,
  locked,
  children,
}: {
  icon: React.ReactNode;
  k: string;
  v?: string;
  desc?: string;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("group flex items-start gap-3 py-1 rounded-md", !locked && "cursor-pointer hover:bg-ink/[0.03] hover:px-2 hover:-mx-2 transition-all")}>
      <span className="w-8 h-8 rounded-full bg-orange-soft text-orange-deep inline-flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] tracking-meta uppercase text-ink-muted font-medium m-0">{k}</p>
        {v && <p className="text-meta text-ink font-medium mt-0.5">{v}</p>}
        {desc && <p className="font-serif italic text-mini text-ink-soft mt-1 leading-snug">{desc}</p>}
        {children}
      </div>
      {locked ? (
        <IconLock size={11} className="text-ink-muted shrink-0 mt-2" />
      ) : (
        <IconPencil size={12} className="text-ink-muted shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

function Tag({ children, off }: { children: React.ReactNode; off?: boolean }) {
  return (
    <span
      className={cn(
        "text-tiny px-2.5 py-0.5 rounded-pill",
        off ? "bg-surface border border-border-strong text-ink-faint" : "bg-ink text-white",
      )}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Did you know · outro
───────────────────────────────────────────────────────────────── */

function DidYouKnow() {
  return (
    <section className="bg-orange/[0.06] border border-dashed border-orange/35 rounded-md px-5 py-3.5 flex items-center gap-3.5">
      <IconBulb size={20} className="text-orange-deep" />
      <p className="m-0 flex-1 font-serif italic text-meta text-[#6d4923] leading-snug">
        <b className="not-italic font-medium text-orange-deep">Lo sapevi · </b>
        a Tokyo i taxi hanno le porte automatiche. Non aprirle tu — il guidatore se la prende.
      </p>
      <a href="#" className="text-mini text-orange-deep no-underline hover:underline whitespace-nowrap inline-flex items-center gap-1">
        altri 14 <IconArrowRight size={11} />
      </a>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page · puts it all together
───────────────────────────────────────────────────────────────── */

export default function TripHomeSketch() {
  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <style jsx global>{`
        @keyframes pulseHalo {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244, 123, 58, 0.45); }
          50% { box-shadow: 0 0 0 8px rgba(244, 123, 58, 0); }
        }
        .animate-pulse-halo { animation: pulseHalo 2.4s ease-in-out infinite; }
      `}</style>

      <MockAppHeader />

      <main className="max-w-[1100px] mx-auto w-full px-6 py-6 flex flex-col gap-[18px]">
        <BoardingPass />
        <AiAndRoadmap />
        <InfoPanel />
        <TicketDetails />
        <DidYouKnow />
      </main>
    </div>
  );
}
