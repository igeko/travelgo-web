"use client";

/**
 * app/(app)/admin/catalog/page.tsx
 *
 * Pannello di import del catalogo posti da OpenStreetMap (Overpass API).
 * Permette di filtrare, vedere un'anteprima e lanciare l'import
 * con monitoring real-time via SSE.
 *
 * Dati: © OpenStreetMap contributors, licenza ODbL
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { AppHeader }  from "@/features/app/AppHeader";
import { useUser }    from "@/features/app/UserContext";
import { useRouter }  from "next/navigation";
import {
  IconWorld, IconCategory, IconDownload,
  IconEye, IconCircleCheck, IconAlertCircle, IconLoader2,
  IconDatabase, IconList,
} from "@/components/ui/icons";
import { OSM_PRESETS } from "@/lib/overpass";

// ── Tipi ────────────────────────────────────────────────────

interface PreviewPlace {
  osmId:     number;
  osmType:   string;
  name:      string;
  lat:       number;
  lng:       number;
  category:  string;
  mainTag:   string;
  wikidata?: string;
  wikipedia?: string;
}

interface PreviewResult {
  location:    string;
  total_found: number;
  attribution: string;
  places:      PreviewPlace[];
}

interface ProgressState {
  saved:    number;
  embedded: number;
  total:    number;
  message:  string;
}

type ImportStatus = 'idle' | 'previewing' | 'ready' | 'importing' | 'done' | 'error';

// ── Helpers ──────────────────────────────────────────────────

function WikiBadge({ place }: { place: PreviewPlace }) {
  const hasWiki = place.wikidata || place.wikipedia;
  if (!hasWiki) return null;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
      W
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-ink/5 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-ink rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function CatalogPage() {
  const { isAdmin, isDev, isLoggedIn, loading, user } = useUser();
  const router = useRouter();

  // Filters
  const [location,        setLocation]        = useState("Japan");
  const [selectedPresets, setSelectedPresets] = useState<string[]>(["attractions", "historic", "religion"]);
  const [limit,           setLimit]           = useState(500);
  const [enrichWiki,      setEnrichWiki]      = useState(true);

  // UI state
  const [status,   setStatus]   = useState<ImportStatus>('idle');
  const [preview,  setPreview]  = useState<PreviewResult | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ saved: 0, embedded: 0, total: 0, message: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [doneInfo, setDoneInfo] = useState<{ saved: number; embedded: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !isAdmin && !isDev) router.replace("/trips");
  }, [loading, isAdmin, isDev, router]);

  // ── Preview ────────────────────────────────────────────────

  const handlePreview = useCallback(async () => {
    if (!location.trim()) return;
    setStatus('previewing');
    setPreview(null);
    setErrorMsg('');

    const params = new URLSearchParams({
      location,
      presets: selectedPresets.join(',') || 'attractions',
      limit:   '12',
    });

    try {
      const res = await fetch(`/api/catalog/preview?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore preview');
      setPreview(data);
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Errore sconosciuto');
      setStatus('error');
    }
  }, [location, selectedPresets]);

  // ── Import ─────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    setStatus('importing');
    setProgress({ saved: 0, embedded: 0, total: 0, message: 'Avvio import…' });
    setErrorMsg('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/catalog/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          location,
          presetIds:  selectedPresets,
          limit,
          enrichWiki,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error('Errore avvio import');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'progress') {
              setProgress({ saved: event.saved, embedded: event.embedded, total: event.total, message: event.message });
            } else if (event.type === 'done') {
              setDoneInfo({ saved: event.saved, embedded: event.embedded });
              setStatus('done');
            } else if (event.type === 'error') {
              setErrorMsg(event.message);
              setStatus('error');
            }
          } catch { /* JSON parse error, ignora */ }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setErrorMsg(e instanceof Error ? e.message : 'Errore sconosciuto');
      setStatus('error');
    }
  }, [location, selectedPresets, limit, enrichWiki]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setStatus('ready');
  }, []);

  const togglePreset = useCallback((id: string) => {
    setSelectedPresets((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        isLoggedIn={isLoggedIn}
        initials={user?.initials ?? ""}
        avatarUrl={user?.avatarUrl ?? ""}
        fullName={user?.fullName ?? ""}
      />

      <main className="flex-1 max-w-[1100px] mx-auto w-full px-5 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Catalog Import</h1>
          <p className="text-[13px] text-ink-soft mt-1">
            Importa posti da OpenStreetMap nel catalogo TravelGo.{" "}
            <span className="text-ink-faint">© OpenStreetMap contributors (ODbL)</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* ── Colonna sinistra: filtri ── */}
          <div className="space-y-5">

            {/* Location */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-[13px] font-semibold text-ink flex items-center gap-2">
                <IconWorld size={15} className="text-ink-soft" />
                Destinazione
              </h2>
              <div>
                <label className="block text-[11px] text-ink-soft mb-1">
                  Paese o città (nome come su OpenStreetMap)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="es. Japan, Tokyo, Italy…"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/30"
                />
              </div>
            </div>

            {/* Categorie OSM */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <h2 className="text-[13px] font-semibold text-ink flex items-center gap-2">
                <IconCategory size={15} className="text-ink-soft" />
                Categorie OSM
              </h2>
              <div className="flex flex-wrap gap-2">
                {OSM_PRESETS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => togglePreset(id)}
                    className={`px-3 py-1.5 rounded-pill text-[12px] border transition-colors cursor-pointer ${
                      selectedPresets.includes(id)
                        ? "bg-ink text-white border-ink"
                        : "bg-transparent border-border text-ink-soft hover:border-border-strong hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedPresets.length === 0 && (
                <p className="text-[11px] text-amber-500">Seleziona almeno una categoria</p>
              )}
            </div>

            {/* Volume e opzioni */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-[13px] font-semibold text-ink">Volume e opzioni</h2>

              {/* Max posti */}
              <div>
                <label className="block text-[11px] text-ink-soft mb-2">
                  Max posti da importare: <span className="font-medium text-ink">{limit.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="w-full accent-ink"
                />
                <div className="flex justify-between text-[10px] text-ink-faint mt-0.5">
                  <span>100</span><span>2.000</span>
                </div>
              </div>

              {/* Enrichment Wikipedia */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enrichWiki}
                  onChange={(e) => setEnrichWiki(e.target.checked)}
                  className="mt-0.5 accent-ink"
                />
                <div>
                  <span className="text-[12px] text-ink leading-snug block">
                    Arricchisci da Wikipedia + Wikidata
                  </span>
                  <span className="text-[11px] text-ink-faint">
                    Aggiunge descrizione e immagine per i posti con tag Wikipedia/Wikidata (più lento)
                  </span>
                </div>
              </label>
            </div>

            {/* Azioni */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!location.trim() || status === 'previewing' || status === 'importing'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-[13px] text-ink-soft hover:text-ink hover:border-border-strong transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {status === 'previewing'
                  ? <IconLoader2 size={14} className="animate-spin" />
                  : <IconEye size={14} />}
                Anteprima
              </button>

              <button
                type="button"
                onClick={status === 'importing' ? handleStop : handleImport}
                disabled={!location.trim() || selectedPresets.length === 0 || status === 'previewing'}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${
                  status === 'importing'
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "bg-ink text-white hover:opacity-90"
                }`}
              >
                {status === 'importing'
                  ? <><IconLoader2 size={14} className="animate-spin" /> Stop</>
                  : <><IconDownload size={14} /> Importa</>}
              </button>
            </div>
          </div>

          {/* ── Colonna destra: preview + progress ── */}
          <div className="space-y-4">

            {/* Progress monitor */}
            {(status === 'importing' || status === 'done') && (
              <div className={`rounded-xl border p-4 space-y-3 ${
                status === 'done' ? "border-emerald-200 bg-emerald-50" : "border-border bg-surface"
              }`}>
                <div className="flex items-center gap-2">
                  {status === 'done'
                    ? <IconCircleCheck size={16} className="text-emerald-600" />
                    : <IconLoader2 size={16} className="animate-spin text-ink-soft" />}
                  <span className="text-[13px] font-medium text-ink">
                    {status === 'done' ? "Import completato" : "Import in corso…"}
                  </span>
                </div>

                {status === 'done' && doneInfo ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-100">
                      <p className="text-[18px] font-semibold text-ink">{doneInfo.saved.toLocaleString()}</p>
                      <p className="text-[11px] text-ink-soft">Posti salvati</p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-100">
                      <p className="text-[18px] font-semibold text-ink">{doneInfo.embedded.toLocaleString()}</p>
                      <p className="text-[11px] text-ink-soft">Embeddings</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[12px] text-ink-soft">{progress.message}</p>
                    {progress.total > 0 && (
                      <>
                        <ProgressBar value={progress.saved} max={progress.total} />
                        <div className="flex justify-between text-[11px] text-ink-faint">
                          <span>{progress.saved.toLocaleString()} salvati</span>
                          <span>{progress.embedded.toLocaleString()} embeddings</span>
                          <span>{progress.total.toLocaleString()} totali</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Errore */}
            {status === 'error' && errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-2">
                <IconAlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-red-700">Errore</p>
                  <p className="text-[12px] text-red-600 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Preview risultati */}
            {preview && (
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconList size={14} className="text-ink-soft" />
                    <span className="text-[13px] font-medium text-ink">
                      Anteprima — {preview.location}
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-faint">
                    {preview.total_found} trovati
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {preview.places.map((p) => (
                    <div key={p.osmId} className="px-4 py-2.5 flex items-center gap-3 hover:bg-surface-soft">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink truncate">
                          {p.name || <span className="text-ink-faint italic">senza nome</span>}
                        </p>
                        <p className="text-[11px] text-ink-faint truncate mt-0.5">
                          {p.mainTag} · {p.category}
                        </p>
                      </div>
                      <WikiBadge place={p} />
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <p className="text-[10px] text-ink-faint">{preview.attribution}</p>
                </div>
              </div>
            )}

            {/* Idle state */}
            {status === 'idle' && !preview && (
              <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center">
                <IconDatabase size={24} className="text-ink-faint mx-auto mb-2" />
                <p className="text-[13px] text-ink-soft">
                  Configura i filtri e clicca <strong>Anteprima</strong> per vedere un campione,
                  poi <strong>Importa</strong> per aggiungere al catalogo.
                </p>
                <p className="text-[11px] text-ink-faint mt-2">
                  I posti con tag Wikipedia/Wikidata riceveranno descrizione e immagine automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
