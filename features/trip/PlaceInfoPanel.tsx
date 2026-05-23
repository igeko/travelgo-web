"use client";

/**
 * PlaceInfoPanel — "Know before you go" country card.
 *
 * Promotes the third widget of the /design/trip-home sketch. A tab strip over
 * up to six sections (currency · visa · weather · power · language · safety);
 * the active section renders below. Fully data-driven: every label/value comes
 * from the `info` prop (resolved by static country tables / rates / AI per the
 * spec), so the component is presentational. Type, color and spacing follow
 * the design system.
 */

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import {
  IconCloud,
  IconCoin,
  IconLanguage,
  IconPlug,
  IconShieldCheck,
  IconSparkles,
  IconWorld,
} from "@/components/ui/icons";

// ── Data shapes ───────────────────────────────────────────────────────

export type StatTone = "ok" | "warn";
export type InfoStat = { k: string; v: string; tone?: StatTone };
export type InfoAside = { title: string; items: string[] };
export type Phrase = { label: string; native: string; roman: string };

export type CurrencyInfo = {
  eyebrow: string;
  /** Units of target currency per 1 unit of base. */
  rate: number;
  rateLabel: string;
  baseSymbol: string;
  targetSymbol: string;
  goTip?: string;
  aside: InfoAside;
};
export type VisaInfo = { eyebrow: string; statusBig: string; statusSub: string; badge?: string; goTip?: string; aside: InfoAside };
export type WeatherInfo = { eyebrow: string; tempBig: string; tempSub: string; stats: InfoStat[]; goTip?: string; aside: InfoAside };
export type PowerInfo = { eyebrow: string; plugBig: string; plugSub: string; stats: InfoStat[]; goTip?: string; aside: InfoAside };
export type LanguageInfo = { eyebrow: string; heroBig: string; heroSub: string; phrases: Phrase[]; aside: InfoAside };
export type SafetyInfo = { eyebrow: string; levelBig: string; levelSub: string; stats: InfoStat[]; goTip?: string; aside: InfoAside };

export type PlaceInfo = {
  currency?: CurrencyInfo;
  visa?: VisaInfo;
  weather?: WeatherInfo;
  power?: PowerInfo;
  language?: LanguageInfo;
  safety?: SafetyInfo;
};

type TabId = keyof PlaceInfo;

const TAB_ORDER: TabId[] = ["currency", "visa", "weather", "power", "language", "safety"];
const TAB_ICON: Record<TabId, React.ReactNode> = {
  currency: <IconCoin size={15} />,
  visa: <IconWorld size={15} />,
  weather: <IconCloud size={15} />,
  power: <IconPlug size={15} />,
  language: <IconLanguage size={15} />,
  safety: <IconShieldCheck size={15} />,
};

// ── Component ─────────────────────────────────────────────────────────

export function PlaceInfoPanel({ info, className }: { info: PlaceInfo; className?: string }) {
  const t = useTranslations("PlaceInfo");
  const tabs = useMemo(() => TAB_ORDER.filter((id) => info[id]), [info]);
  const [active, setActive] = useState<TabId | null>(tabs[0] ?? null);
  const current = active && tabs.includes(active) ? active : tabs[0] ?? null;

  if (!current) {
    return (
      <section className={cn("rounded-md border border-border bg-surface px-7 py-8 text-center", className)}>
        <p className="font-serif text-meta italic text-ink-faint">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className={cn("overflow-hidden rounded-md border border-border bg-surface", className)}>
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-2.5">
        {tabs.map((id) => {
          const isActive = id === current;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-mini transition-colors",
                isActive ? "border-orange font-medium text-ink" : "border-transparent text-ink-faint hover:text-ink",
              )}
            >
              <span className={isActive ? "text-orange-deep" : "text-ink-faint"}>{TAB_ICON[id]}</span>
              {t(`tabs.${id}`)}
            </button>
          );
        })}
      </div>
      <div className="px-7 py-6">
        {current === "currency" && info.currency && <CurrencyPane data={info.currency} />}
        {current === "visa" && info.visa && <VisaPane data={info.visa} />}
        {current === "weather" && info.weather && <WeatherPane data={info.weather} />}
        {current === "power" && info.power && <PowerPane data={info.power} />}
        {current === "language" && info.language && <LanguagePane data={info.language} />}
        {current === "safety" && info.safety && <SafetyPane data={info.safety} />}
      </div>
    </section>
  );
}

// ── Shared pane bits ──────────────────────────────────────────────────

function PaneShell({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_220px]">
      <div>{left}</div>
      <div className="lg:border-l lg:border-dashed lg:border-border lg:pl-[18px]">{right}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-tiny font-medium uppercase tracking-eyebrow text-orange-deep">{children}</p>;
}

function Hero({ big, sub }: { big: React.ReactNode; sub: string }) {
  return (
    <div className="mb-3 mt-1.5 flex items-baseline gap-3">
      <span className="font-serif text-[46px] font-medium italic leading-[0.9] text-ink">{big}</span>
      <span className="font-serif text-meta italic text-ink-soft">{sub}</span>
    </div>
  );
}

function SideList({ data }: { data: InfoAside }) {
  return (
    <>
      <p className="m-0 mb-2.5 text-tiny font-medium uppercase tracking-eyebrow text-ink-faint">{data.title}</p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {data.items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-mini leading-snug text-ink-soft">
            <span className="shrink-0 font-bold text-orange-deep">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function GoTip({ children }: { children: React.ReactNode }) {
  const t = useTranslations("PlaceInfo");
  return (
    <div className="mt-3.5 flex items-start gap-3 rounded-md bg-orange/[0.08] px-3.5 py-3">
      <IconSparkles size={16} className="mt-0.5 shrink-0 text-orange-deep" />
      <p className="m-0 font-serif text-meta italic leading-snug text-ink-soft">
        <b className="font-medium not-italic text-orange-deep">{t("goTip")} · </b>
        {children}
      </p>
    </div>
  );
}

function StatsMini({ stats }: { stats: InfoStat[] }) {
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      {stats.map((s, i) => (
        <div key={i} className="rounded-md bg-bg px-3 py-2.5">
          <p className="m-0 text-micro font-medium uppercase tracking-meta text-ink-faint">{s.k}</p>
          <p className={cn(
            "mt-0.5 text-mini font-medium",
            !s.tone && "text-ink",
            s.tone === "ok" && "text-success-fg",
            s.tone === "warn" && "text-orange-deep",
          )}>
            {s.v}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Panes ─────────────────────────────────────────────────────────────

function CurrencyPane({ data }: { data: CurrencyInfo }) {
  const locale = useLocale();
  const [amount, setAmount] = useState("50");
  const converted = useMemo(() => {
    const n = parseFloat(amount.replace(",", ".")) || 0;
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(n * data.rate));
  }, [amount, data.rate, locale]);

  return (
    <PaneShell
      left={
        <>
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <Hero big={`${data.rate} ${data.targetSymbol}`} sub={data.rateLabel} />
          <div className="flex items-center gap-2.5 rounded-md bg-bg px-3.5 py-3">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-[60px] rounded-md border border-border-strong bg-surface px-2.5 py-1 text-right font-mono text-meta tabular-nums text-ink focus:outline focus:outline-2 focus:outline-orange/30"
            />
            <span className="text-mini text-ink-faint">{data.baseSymbol}</span>
            <span className="text-orange-deep">→</span>
            <span className="font-serif text-[17px] font-medium italic tabular-nums text-ink">{converted} {data.targetSymbol}</span>
          </div>
          {data.goTip && <GoTip>{data.goTip}</GoTip>}
        </>
      }
      right={<SideList data={data.aside} />}
    />
  );
}

function VisaPane({ data }: { data: VisaInfo }) {
  return (
    <PaneShell
      left={
        <>
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <Hero big={data.statusBig} sub={data.statusSub} />
          {data.badge && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-mini font-medium text-ink">
              <span className="size-2 rounded-full bg-success-fg" />
              {data.badge}
            </p>
          )}
          {data.goTip && <GoTip>{data.goTip}</GoTip>}
        </>
      }
      right={<SideList data={data.aside} />}
    />
  );
}

function WeatherPane({ data }: { data: WeatherInfo }) {
  return (
    <PaneShell
      left={
        <>
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <Hero big={data.tempBig} sub={data.tempSub} />
          <StatsMini stats={data.stats} />
          {data.goTip && <GoTip>{data.goTip}</GoTip>}
        </>
      }
      right={<SideList data={data.aside} />}
    />
  );
}

function PowerPane({ data }: { data: PowerInfo }) {
  return (
    <PaneShell
      left={
        <>
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <Hero big={data.plugBig} sub={data.plugSub} />
          <StatsMini stats={data.stats} />
          {data.goTip && <GoTip>{data.goTip}</GoTip>}
        </>
      }
      right={<SideList data={data.aside} />}
    />
  );
}

function LanguagePane({ data }: { data: LanguageInfo }) {
  return (
    <PaneShell
      left={
        <>
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <Hero big={data.heroBig} sub={data.heroSub} />
          <div className="flex flex-col">
            {data.phrases.map((p, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[1fr_auto_1fr] items-baseline gap-3.5 py-2",
                  i < data.phrases.length - 1 && "border-b border-border",
                )}
              >
                <span className="text-mini text-ink-faint">{p.label}</span>
                <span className="font-serif text-[16px] italic text-ink">{p.native}</span>
                <span className="text-right font-serif text-tiny italic text-ink-faint">{p.roman}</span>
              </div>
            ))}
          </div>
        </>
      }
      right={<SideList data={data.aside} />}
    />
  );
}

function SafetyPane({ data }: { data: SafetyInfo }) {
  return (
    <PaneShell
      left={
        <>
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <Hero big={data.levelBig} sub={data.levelSub} />
          <StatsMini stats={data.stats} />
          {data.goTip && <GoTip>{data.goTip}</GoTip>}
        </>
      }
      right={<SideList data={data.aside} />}
    />
  );
}
