"use client";

/**
 * Sandbox · YumeList
 * URL: /dev/yume-list
 *
 * Corpo del pannello Yume (tutto tranne l'header): ricerca + filtri (abilitabili
 * via parametro) e lista degli yume (propri o condivisi al viaggio da altri).
 * Righe senza immagine → placeholder come ActivityList; owner con avatar.
 *
 * Sorgente dati:
 *   - Mock  · dataset locali (features/yumeji/mockData.ts)
 *   - Reale · GET /api/yumes (api.yumes.list) → collezione dell'utente loggato.
 *
 * ⚠️ L'API ritorna solo gli yume dell'utente autenticato: non accetta ancora un
 * trip o un utente come filtro (per RLS gli yume altrui non sono leggibili).
 * I campi Trip/Utente qui sono predisposti per quando il backend offrirà la query.
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { YumeList } from "@/features/yumeji/YumeList";
import { MOCK_YUMES, type YumeChip, type YumeListItem } from "@/features/yumeji/mockData";
import { api, type Yume } from "@/lib/client";
import { SandboxRightPanel } from "../_components/SandboxShell";

const CHIPS: YumeChip[] = [
  { id: "geo", label: "Per Tokyo", count: 6, active: true },
  { id: "unscheduled", label: "Da schedulare", count: 6, active: true },
  { id: "shared", label: "Condivisi", count: 3 },
];

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", JPY: "¥" };

function formatBudget(amount: number | null, currency: string | null): string | null {
  if (amount == null) return null;
  if (amount === 0) return "Gratis";
  const sym = currency ? (CURRENCY_SYMBOL[currency] ?? `${currency} `) : "";
  return `${sym}${amount}`;
}

/** Map del modello reale (Yume = DbActivity + shared_trip_ids) → view-model lista. */
function toListItem(y: Yume): YumeListItem {
  return {
    id: y.id,
    title: y.title,
    location: y.location,
    price: formatBudget(y.budget_amount, y.budget_currency),
    imageUrl: y.hero_image,
    // L'API non restituisce il profilo dell'owner (solo created_by): niente avatar.
    owner: null,
  };
}

type Source = "mock" | "real";
type MockDataset = "all" | "shared" | "empty";

const MOCK_DATASETS: Record<MockDataset, YumeListItem[]> = {
  all: MOCK_YUMES,
  shared: MOCK_YUMES.filter((y) => y.owner),
  empty: [],
};

export default function YumeListSandbox() {
  const [searchable, setSearchable] = useState(true);
  const [filterable, setFilterable] = useState(true);
  const [showOwner, setShowOwner] = useState(true);

  const [source, setSource] = useState<Source>("mock");
  const [mockDataset, setMockDataset] = useState<MockDataset>("all");

  const [tripInput, setTripInput] = useState("Japan 2026!");
  const [userInput, setUserInput] = useState("enrico del greco");
  const [realItems, setRealItems] = useState<YumeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function loadReal() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.yumes.list();
      setRealItems(list.map(toListItem));
      setLoaded(true);
      setSource("real");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  }

  const items = source === "real" ? realItems : MOCK_DATASETS[mockDataset];

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">YumeList</h1>
        <p className="mb-8 max-w-2xl text-sm text-ink-soft">
          Corpo del pannello Yume — <b className="text-ink font-medium">ricerca</b> e{" "}
          <b className="text-ink font-medium">filtri</b> abilitabili via parametro, più la lista
          (propri o condivisi da altri). Sorgente dati Mock o Reale (API).
        </p>

        {/* Montato in un contenitore card come fa YumejiPanel */}
        <div className="h-[540px] max-w-[360px] bg-surface rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="px-[18px] py-3 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-micro uppercase tracking-eyebrow-wide text-ink-soft">
              {source === "real" ? "Yume reali" : "Yume (mock)"}
            </span>
            <span className="text-micro text-ink-faint tabular-nums">{items.length}</span>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-mini text-ink-faint">
              Caricamento…
            </div>
          ) : (
            <YumeList
              items={items}
              chips={CHIPS}
              searchable={searchable}
              filterable={filterable}
              showOwner={showOwner}
              className="flex-1"
            />
          )}
        </div>
        {error && <p className="mt-2 text-mini text-danger-fg">⚠️ {error}</p>}
      </main>

      <SandboxRightPanel>
        <div className="p-4 flex flex-col gap-5">
          {/* Fetch reale */}
          <div>
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-2">
              Dati reali (API)
            </div>
            <label className="block text-mini text-ink-soft mb-1">Trip</label>
            <input
              value={tripInput}
              onChange={(e) => setTripInput(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink mb-2 outline-none focus:border-orange"
            />
            <label className="block text-mini text-ink-soft mb-1">Utente</label>
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink mb-2 outline-none focus:border-orange"
            />
            <button
              type="button"
              onClick={loadReal}
              disabled={loading}
              className="w-full rounded-md bg-ink text-white text-sm font-medium px-3 py-2 cursor-pointer hover:bg-ink-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Carico…" : "Recupera yume"}
            </button>
            <p className="mt-2 text-micro text-ink-faint leading-relaxed">
              L&apos;API ritorna solo la collezione dell&apos;utente <b>loggato</b>; trip/utente non
              filtrano ancora server-side (vedi nota in cima al file).
            </p>
          </div>

          {/* Sorgente */}
          <div className="border-t border-border pt-4">
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-2">
              Sorgente
            </div>
            <div className="flex gap-1">
              {([
                { v: "mock", l: "Mock" },
                { v: "real", l: "Reale" },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setSource(o.v)}
                  disabled={o.v === "real" && !loaded}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                    source === o.v
                      ? "bg-ink border-ink text-white font-medium"
                      : "bg-surface border-border text-ink-soft hover:border-border-strong hover:text-ink",
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
            {source === "mock" && (
              <div className="mt-2 flex flex-col gap-1">
                {([
                  { v: "all", l: "Tutti" },
                  { v: "shared", l: "Solo condivisi" },
                  { v: "empty", l: "Vuoto" },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setMockDataset(o.v)}
                    className={cn(
                      "text-left rounded-md px-3 py-1.5 text-sm border transition-colors cursor-pointer",
                      mockDataset === o.v
                        ? "bg-surface-soft border-border text-ink font-medium"
                        : "bg-surface border-border text-ink-soft hover:border-border-strong hover:text-ink",
                    )}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parametri componente */}
          <div className="border-t border-border pt-4">
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-2">
              Parametri
            </div>
            <Toggle label="searchable" value={searchable} onChange={setSearchable} />
            <Toggle label="filterable" value={filterable} onChange={setFilterable} />
            <Toggle label="showOwner" value={showOwner} onChange={setShowOwner} />
          </div>
        </div>
      </SandboxRightPanel>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 py-0.5 text-sm text-ink-soft cursor-pointer font-mono">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
