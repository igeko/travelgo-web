"use client";

/**
 * app/(app)/admin/catalog/page.tsx
 *
 * Pannello import catalogo posti da OpenStreetMap.
 *
 * Flusso:
 *  1. Configura filtri → "Crea Task" → conta posti (~2s) → job pending
 *  2. Ogni job mostra: location, stato, total_found, progresso
 *  3. "Avvia" / "Riprendi" → SSE stream che processa un batch
 *  4. Se auto_continue=true il client rilancia automaticamente
 *
 * Dati: © OpenStreetMap contributors (ODbL)
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { AppHeader }  from "@/features/app/AppHeader";
import { useUser }    from "@/features/app/UserContext";
import { useRouter }  from "next/navigation";
import {
  IconWorld, IconCategory, IconPlus, IconPlayerPlay,
  IconPlayerStop, IconCircleCheck, IconAlertCircle,
  IconLoader2, IconDatabase, IconRefresh, IconTrash,
} from "@/components/ui/icons";
import { FilterPill } from "@/components/ui/FilterPill";
import { cn } from "@/lib/cn";
import { OSM_PRESETS } from "@/lib/overpass";
import { REGION_PRESETS, type RegionPreset } from "@/lib/region-presets";

// ── Tipi Overpass Status ─────────────────────────────────────
interface OverpassStatus {
  timestamp: string;
  best: {
    endpoint: string;
    slots: number;
    available: boolean;
    status: 'ready' | 'busy' | 'error';
  };
  all: Array<{
    endpoint: string;
    slots: number;
    statusUrl: string;
  }>;
}

// ── Tipi ────────────────────────────────────────────────────

interface ImportJob {
  id:             string;
  status:         'pending' | 'running' | 'paused' | 'done' | 'error';
  filters:        {
    location:    string;
    presetIds:   string[];
    notableOnly: boolean;
    enrichWiki:  boolean;
  };
  batch_size:     number;
  auto_continue:  boolean;
  import_offset:  number;
  total_found:    number;
  total_saved:    number;
  total_embedded: number;
  created_at:     string;
}

interface BatchProgress {
  saved:    number;
  embedded: number;
  total:    number;
  offset:   number;
  message:  string;
}

// ── Helpers ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: ImportJob['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'In attesa',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    running: { label: 'In corso',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    paused:  { label: 'In pausa',   cls: 'bg-ink/5 text-ink-soft border-border' },
    done:    { label: 'Completato', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    error:   { label: 'Errore',     cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const { label, cls } = map[status] ?? map.pending;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-tiny font-medium",
      cls,
    )}>
      {status === 'running' && <IconLoader2 size={10} className="animate-spin" />}
      {label}
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-ink/5 rounded-full h-1 overflow-hidden">
      <div className="h-full bg-ink rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function CatalogPage() {
  const { isAdmin, isDev, isLoggedIn, loading, user } = useUser();
  const router = useRouter();

  // ── Filtri ──────────────────────────────────────────────
  const [location,       setLocation]       = useState("Japan");
  const [selectedPresets,setSelectedPresets]= useState<string[]>(["attractions", "historic", "religion"]);
  const [notableOnly,    setNotableOnly]     = useState(false);
  const [batchSize,      setBatchSize]       = useState(500);
  const [autoContinue,   setAutoContinue]    = useState(false);
  const [enrichWiki,     setEnrichWiki]      = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // ── Apply a region preset ────────────────────────────────
  const applyPreset = useCallback((preset: RegionPreset) => {
    setLocation(preset.location);
    setSelectedPresets(preset.presetIds);
    setNotableOnly(preset.notableOnly);
    setBatchSize(preset.batchSize);
    setAutoContinue(preset.autoContinue);
    setEnrichWiki(preset.enrichWiki);
    setSelectedPresetId(preset.id);
  }, []);

  // ── Task list ───────────────────────────────────────────
  const [jobs,         setJobs]        = useState<ImportJob[]>([]);
  const [creating,     setCreating]    = useState(false);
  const [createMsg,    setCreateMsg]   = useState('');   // messaggio di stato durante la creazione
  const [createError,  setCreateError] = useState('');
  const createAbortRef = useRef<AbortController | null>(null);

  // ── Progress per job in esecuzione ─────────────────────
  const [activeJobId,  setActiveJobId]  = useState<string | null>(null);
  const [batchProgress,setBatchProgress]= useState<BatchProgress | null>(null);
  const [batchError,   setBatchError]   = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // ── Overpass Status Monitor ──────────────────────────────
  const [overpassStatus, setOverpassStatus] = useState<OverpassStatus | null>(null);
  const [statusLoading,  setStatusLoading]  = useState(false);
  const statusRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const refreshOverpassStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/overpass/status');
      const data = await res.json();
      setOverpassStatus(data);
    } catch (e) {
      console.error('[status] errore:', e);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Auth guard
  useEffect(() => {
    if (!loading && !isAdmin && !isDev) router.replace("/trips");
  }, [loading, isAdmin, isDev, router]);

  // ── Carica status Overpass ───────────────────────────────
  useEffect(() => {
    // Prima richiesta subito
    refreshOverpassStatus();

    // Poi ogni 30 secondi (non bannare)
    statusRefreshRef.current = setInterval(() => {
      refreshOverpassStatus();
    }, 30000);

    return () => {
      if (statusRefreshRef.current) clearInterval(statusRefreshRef.current);
    };
  }, [refreshOverpassStatus]);

  // ── Carica job ──────────────────────────────────────────

  const loadJobs = useCallback(async () => {
    const res = await fetch('/api/catalog/jobs');
    if (!res.ok) return;
    const data = await res.json();
    setJobs(data.jobs ?? []);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── Crea task ───────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!location.trim() || selectedPresets.length === 0) return;
    setCreating(true);
    setCreateError('');
    setCreateMsg('Interrogo Overpass…');

    const ctrl = new AbortController();
    createAbortRef.current = ctrl;

    try {
      const res = await fetch('/api/catalog/jobs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          location, presetIds: selectedPresets,
          notableOnly, batchSize, autoContinue, enrichWiki,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error('Errore connessione server');

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
            const ev = JSON.parse(line.slice(6));

            if (ev.type === 'retry') {
              const secs = Math.round(ev.waitMs / 1000);
              setCreateMsg(
                `Server ${ev.endpoint} occupato — attendo ${secs}s (tentativo ${ev.attempt}/${ev.maxRetries})…`
              );
            } else if (ev.type === 'done') {
              await loadJobs();
            } else if (ev.type === 'error') {
              const errorDetail = (ev as any).details ? `\n\n${(ev as any).details}` : '';
              throw new Error(ev.message + errorDetail);
            }
          } catch (parseErr) {
            if ((parseErr as Error).message !== 'Unexpected token') throw parseErr;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setCreateError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setCreating(false);
      setCreateMsg('');
      createAbortRef.current = null;
    }
  }, [location, selectedPresets, notableOnly, batchSize, autoContinue, enrichWiki, loadJobs]);

  const handleCancelCreate = useCallback(() => {
    createAbortRef.current?.abort();
  }, []);

  // ── Avvia / Riprendi batch ──────────────────────────────

  const startBatch = useCallback(async (job: ImportJob) => {
    setActiveJobId(job.id);
    setBatchProgress({ saved: 0, embedded: 0, total: job.total_found, offset: job.import_offset, message: 'Avvio…' });
    setBatchError('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Ottimisticamente aggiorna lo stato in lista
    setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: 'running' } : j));

    try {
      const res = await fetch('/api/catalog/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId: job.id }),
        signal:  ctrl.signal,
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
            const ev = JSON.parse(line.slice(6));

            if (ev.type === 'progress') {
              setBatchProgress({
                saved: ev.saved, embedded: ev.embedded,
                total: ev.total, offset: ev.offset, message: ev.message,
              });
            } else if (ev.type === 'done') {
              await loadJobs();
              setActiveJobId(null);
              setBatchProgress(null);

              // Auto-continue: riprendi se non completo
              if (!ev.complete && job.auto_continue) {
                const updated = await fetch('/api/catalog/jobs').then((r) => r.json());
                const next = (updated.jobs as ImportJob[]).find((j) => j.id === job.id);
                if (next && next.status === 'paused') {
                  setTimeout(() => startBatch(next), 500);
                }
              }
            } else if (ev.type === 'error') {
              setBatchError(ev.message);
              await loadJobs();
              setActiveJobId(null);
            }
          } catch { /* parse error */ }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        await loadJobs();
        setActiveJobId(null);
        return;
      }
      setBatchError(e instanceof Error ? e.message : 'Errore');
      await loadJobs();
      setActiveJobId(null);
    }
  }, [loadJobs]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDelete = useCallback(async (jobId: string) => {
    await fetch(`/api/catalog/jobs?id=${jobId}`, { method: 'DELETE' }).catch(() => {});
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  const togglePreset = useCallback((id: string) => {
    setSelectedPresets((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  }, []);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader activeNav="trips" isLoggedIn={isLoggedIn}
        initials={user?.initials ?? ""} avatarUrl={user?.avatarUrl ?? ""} fullName={user?.fullName ?? ""}
      />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-5 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-ink">Catalog Import</h1>
              <p className="text-meta text-ink-soft mt-0.5">
                © OpenStreetMap contributors (ODbL)
              </p>
            </div>
            <button onClick={loadJobs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-mini text-ink-soft hover:text-ink cursor-pointer">
              <IconRefresh size={13}/> Aggiorna
            </button>
          </div>

          {/* Overpass Status Monitor */}
          {overpassStatus && (
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      overpassStatus.best.status === 'ready' && 'bg-emerald-500',
                      overpassStatus.best.status === 'busy' && 'bg-amber-500',
                      overpassStatus.best.status === 'error' && 'bg-red-500',
                    )}
                  />
                  <span className="text-meta font-medium text-ink">Overpass API Status</span>
                </div>
                <span className={cn(
                  "text-tiny px-2 py-1 rounded-lg border",
                  overpassStatus.best.status === 'ready' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  overpassStatus.best.status === 'busy' && 'bg-amber-50 text-amber-700 border-amber-200',
                  overpassStatus.best.status === 'error' && 'bg-red-50 text-red-700 border-red-200',
                )}>
                  {overpassStatus.best.status === 'ready' ? '✓ Pronto' :
                   overpassStatus.best.status === 'busy' ? '⏳ Occupato' :
                   '✕ Errore'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-bg rounded-lg p-2">
                  <p className="text-[20px] font-semibold text-ink">{overpassStatus.best.slots}</p>
                  <p className="text-micro text-ink-faint mt-0.5">Slot disponibili</p>
                </div>
                <div className="bg-bg rounded-lg p-2">
                  <p className="text-tiny text-ink-soft font-mono break-all">
                    {overpassStatus.best.endpoint.split('/').slice(-3).join('/')}
                  </p>
                  <p className="text-micro text-ink-faint mt-0.5">Endpoint attivo</p>
                </div>
                <div className="bg-bg rounded-lg p-2">
                  <p className="text-tiny text-ink font-mono">
                    {new Date(overpassStatus.timestamp).toLocaleTimeString('it-IT')}
                  </p>
                  <p className="text-micro text-ink-faint mt-0.5">Aggiornato</p>
                </div>
              </div>

              <div className="flex gap-1 flex-wrap">
                {overpassStatus.all.map((ep, i) => (
                  <span key={i} className={cn(
                    "text-micro px-2 py-1 rounded-lg border",
                    ep.slots > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : ep.slots === 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200',
                  )}>
                    {ep.endpoint.split('/')[2]}: {ep.slots >= 0 ? ep.slots : '✕'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

          {/* ── Colonna sinistra: configurazione ── */}
          <div className="space-y-4">

            {/* Preset Regions */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <h2 className="text-meta font-semibold text-ink flex items-center gap-2">
                <IconWorld size={14} className="text-ink-soft"/> Template Rapidi
              </h2>
              <div className="space-y-2">
                {REGION_PRESETS.slice(0, 5).map((preset) => (
                  <button key={preset.id} onClick={() => applyPreset(preset)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg border transition-colors text-mini",
                      selectedPresetId === preset.id
                        ? "border-ink bg-ink/5 text-ink font-medium"
                        : "border-border text-ink-soft hover:border-border-strong hover:text-ink",
                    )}>
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-tiny text-ink-faint mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Destinazione */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <h2 className="text-meta font-semibold text-ink flex items-center gap-2">
                <IconWorld size={14} className="text-ink-soft"/> Destinazione
              </h2>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="es. Japan, Tokyo, Italy…"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink/30"/>
            </div>

            {/* Categorie */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <h2 className="text-meta font-semibold text-ink flex items-center gap-2">
                <IconCategory size={14} className="text-ink-soft"/> Categorie OSM
              </h2>
              <div className="flex flex-wrap gap-2">
                {OSM_PRESETS.map(({ id, label }) => (
                  <FilterPill
                    key={id}
                    size="md"
                    active={selectedPresets.includes(id)}
                    onClick={() => togglePreset(id)}
                  >
                    {label}
                  </FilterPill>
                ))}
              </div>
            </div>

            {/* Opzioni */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-meta font-semibold text-ink">Opzioni</h2>

              {/* Batch size */}
              <div>
                <label className="block text-tiny text-ink-soft mb-2">
                  Elementi per batch: <span className="font-medium text-ink">{batchSize.toLocaleString()}</span>
                </label>
                <input type="range" min={100} max={2000} step={100} value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                  className="w-full accent-ink"/>
                <div className="flex justify-between text-micro text-ink-faint mt-0.5">
                  <span>100</span><span>2.000</span>
                </div>
              </div>

              {/* Solo posti notevoli */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={notableOnly}
                  onChange={(e) => setNotableOnly(e.target.checked)} className="mt-0.5 accent-ink"/>
                <div>
                  <span className="text-mini text-ink block">Solo posti notevoli</span>
                  <span className="text-tiny text-ink-faint">Solo elementi con tag Wikipedia o Wikidata</span>
                </div>
              </label>

              {/* Enrich Wikipedia */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={enrichWiki}
                  onChange={(e) => setEnrichWiki(e.target.checked)} className="mt-0.5 accent-ink"/>
                <div>
                  <span className="text-mini text-ink block">Arricchisci da Wikipedia + Wikidata</span>
                  <span className="text-tiny text-ink-faint">Descrizione e immagine (più lento)</span>
                </div>
              </label>

              {/* Auto-continue */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={autoContinue}
                  onChange={(e) => setAutoContinue(e.target.checked)} className="mt-0.5 accent-ink"/>
                <div>
                  <span className="text-mini text-ink block">Continua automaticamente</span>
                  <span className="text-tiny text-ink-faint">Passa al batch successivo senza fermarsi</span>
                </div>
              </label>
            </div>

            {/* CTA */}
            {createError && (
              <p className="text-mini text-red-600 px-1">{createError}</p>
            )}
            <button type="button" onClick={handleCreate}
              disabled={creating || !location.trim() || selectedPresets.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink text-white text-[14px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-opacity">
              {creating
                ? <><IconLoader2 size={15} className="animate-spin"/> Conteggio in corso…</>
                : <><IconPlus size={15}/> Crea Task</>}
            </button>
            {creating && (
              <div className="space-y-1.5 -mt-1">
                <p className="text-tiny text-ink-faint text-center">
                  {createMsg || 'Interrogo Overpass per il conteggio…'}
                </p>
                <button type="button" onClick={handleCancelCreate}
                  className="w-full text-tiny text-ink-soft hover:text-red-600 py-1 cursor-pointer transition-colors">
                  Annulla
                </button>
              </div>
            )}
          </div>

          {/* ── Colonna destra: lista task ── */}
          <div className="space-y-3">

            {jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                <IconDatabase size={28} className="text-ink-faint mx-auto mb-3"/>
                <p className="text-[14px] text-ink-soft">Nessun task creato.</p>
                <p className="text-mini text-ink-faint mt-1">
                  Configura i filtri e clicca <strong>Crea Task</strong> per iniziare.
                </p>
              </div>
            ) : (
              jobs.map((job) => {
                const isActive   = job.id === activeJobId;
                const pct        = job.total_found > 0
                  ? Math.round((job.import_offset / job.total_found) * 100)
                  : 0;
                const presetLabels = OSM_PRESETS
                  .filter((p) => job.filters.presetIds?.includes(p.id))
                  .map((p) => p.label)
                  .join(' · ');

                return (
                  <div key={job.id}
                    className={cn(
                      "rounded-xl border bg-surface p-5 space-y-3 transition-colors",
                      isActive ? 'border-ink/20' : 'border-border',
                    )}>

                    {/* Header card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-semibold text-ink">
                            {job.filters.location}
                          </span>
                          <StatusBadge status={isActive ? 'running' : job.status}/>
                        </div>
                        <p className="text-tiny text-ink-faint mt-0.5 truncate">{presetLabels}</p>
                      </div>
                      <button onClick={() => handleDelete(job.id)}
                        disabled={isActive}
                        className="shrink-0 p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors">
                        <IconTrash size={13}/>
                      </button>
                    </div>

                    {/* Statistiche */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Totale',    value: job.total_found?.toLocaleString()   ?? '—' },
                        { label: 'Importati', value: job.total_saved?.toLocaleString()   ?? '0' },
                        { label: 'Embedded',  value: job.total_embedded?.toLocaleString() ?? '0' },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-bg border border-border px-2 py-1.5">
                          <p className="text-[14px] font-semibold text-ink">{value}</p>
                          <p className="text-micro text-ink-faint">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    {job.total_found > 0 && (
                      <div className="space-y-1">
                        <ProgressBar value={isActive ? (batchProgress?.offset ?? job.import_offset) : job.import_offset} max={job.total_found}/>
                        <div className="flex justify-between text-micro text-ink-faint">
                          <span>
                            {isActive
                              ? batchProgress?.message
                              : `${job.import_offset.toLocaleString()} / ${job.total_found.toLocaleString()} processati`}
                          </span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    )}

                    {/* Errore */}
                    {!isActive && job.status === 'error' && batchError && job.id === activeJobId && (
                      <p className="text-tiny text-red-600">{batchError}</p>
                    )}

                    {/* Opzioni batch */}
                    <div className="flex items-center gap-3 text-tiny text-ink-faint">
                      <span>Batch: {job.batch_size}</span>
                      {job.auto_continue && <span>· Auto-continue</span>}
                      {job.filters.notableOnly && <span>· Solo notevoli</span>}
                      {job.filters.enrichWiki && <span>· Wikipedia</span>}
                    </div>

                    {/* Azioni */}
                    <div className="flex gap-2">
                      {isActive ? (
                        <button onClick={handleStop}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-mini font-medium hover:bg-red-100 cursor-pointer transition-colors">
                          <IconPlayerStop size={13}/> Stop
                        </button>
                      ) : (job.status === 'pending' || job.status === 'paused' || job.status === 'error') ? (
                        <button onClick={() => startBatch(job)}
                          disabled={!!activeJobId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink text-white text-mini font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-opacity">
                          <IconPlayerPlay size={13}/>
                          {job.status === 'pending' ? 'Avvia Import' : 'Riprendi'}
                        </button>
                      ) : job.status === 'done' ? (
                        <div className="flex items-center gap-1.5 text-mini text-emerald-600">
                          <IconCircleCheck size={14}/> Completato
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
