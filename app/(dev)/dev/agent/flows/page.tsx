"use client";

/**
 * /dev/agent/flows — replayable scenario runner for the Go agent.
 *
 * A flow is an ordered script of user messages. Running it spins up a fresh
 * draft trip, sends each message to /api/go/agent in sequence (same session,
 * so the agent accumulates context), optionally auto-confirms every proposed
 * write, then shows the resulting trip + token/iteration totals. Re-run as
 * many times as you like to probe a flow (e.g. new-trip setup) repeatedly.
 */

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { RichText } from "@/features/go/RichText";
import type { GoUsage, GoPendingAction } from "@/lib/client/go";
import type { TripSnapshot } from "@/lib/dal";

type Flow = { id: string; title: string; description: string; messages: string[] };

const PRESET_FLOWS: Flow[] = [
  {
    id: "setup-full",
    title: "Setup completo · Giappone",
    description: "Anagrafica → scheletro città → attività sui primi giorni.",
    messages: [
      "Ciao! Vorrei organizzare un viaggio.",
      "10 giorni in Giappone dal 10 al 19 luglio 2026, io e la mia ragazza. Ci piace mangiare bene e camminare poco.",
      "Sì, procedi: dividi i giorni tra le città principali.",
      "Perfetto, ora riempi i primi tre giorni con un paio di attività ciascuno.",
    ],
  },
  {
    id: "meta-only",
    title: "Solo anagrafica · Lisbona",
    description: "Un singolo messaggio con tutti i fatti base → setTripMeta.",
    messages: [
      "Un weekend a Lisbona dal 18 al 20 settembre 2026, da solo.",
    ],
  },
  {
    id: "add-activities",
    title: "Aggiungi attività · Roma",
    description: "Crea il trip, poi chiede attività su un giorno specifico.",
    messages: [
      "5 giorni a Roma dal 3 al 7 ottobre 2026, in coppia.",
      "Aggiungi al giorno 1: Colosseo la mattina e una cena a Trastevere la sera.",
    ],
  },
];

type Turn = {
  role: "user" | "assistant";
  content: string;
  meta?: { tokens?: number; iterations?: number; tools?: string[] };
  pending?: GoPendingAction[];
  applied?: number;
};

const ZERO_USAGE: GoUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, cachedTokens: 0 };

export default function FlowsPage() {
  const [flowId, setFlowId] = useState(PRESET_FLOWS[0].id);
  const [script, setScript] = useState(PRESET_FLOWS[0].messages.join("\n"));
  const [autoConfirm, setAutoConfirm] = useState(true);

  const [running, setRunning] = useState(false);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [usage, setUsage] = useState<GoUsage>(ZERO_USAGE);
  const [iterTotal, setIterTotal] = useState(0);
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef(false);

  const selectPreset = (id: string) => {
    const f = PRESET_FLOWS.find((x) => x.id === id);
    if (!f) return;
    setFlowId(id);
    setScript(f.messages.join("\n"));
  };

  const messages = script.split("\n").map((m) => m.trim()).filter(Boolean);

  const run = async () => {
    if (running || messages.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    setError(null);
    setTurns([]);
    setSnapshot(null);
    setUsage(ZERO_USAGE);
    setIterTotal(0);

    // Drop any previous draft so each run starts clean.
    if (tripId) {
      await api.trips.remove(tripId).catch(() => {});
      setTripId(null);
    }

    let id: string;
    try {
      const created = await api.trips.create({ title: "Flow draft" });
      id = created.id;
      setTripId(id);
    } catch (e) {
      setError(`Creazione draft fallita: ${msg(e)}`);
      setRunning(false);
      return;
    }

    const totals: GoUsage = { ...ZERO_USAGE };
    let iters = 0;

    for (let i = 0; i < messages.length; i++) {
      if (cancelRef.current) break;
      const text = messages[i];
      setStepLabel(`Messaggio ${i + 1}/${messages.length}`);
      setTurns((prev) => [...prev, { role: "user", content: text }]);

      try {
        const res = await api.go.agent({ tripId: id, message: text, debug: true });
        if (res.usage) {
          totals.promptTokens += res.usage.promptTokens;
          totals.completionTokens += res.usage.completionTokens;
          totals.totalTokens += res.usage.totalTokens;
          totals.cachedTokens = (totals.cachedTokens ?? 0) + (res.usage.cachedTokens ?? 0);
        }
        iters += res.iterations ?? 0;
        setUsage({ ...totals });
        setIterTotal(iters);

        const pending = res.pendingActions ?? [];
        let applied = 0;
        if (autoConfirm && pending.length > 0) {
          setStepLabel(`Messaggio ${i + 1}/${messages.length} · applico ${pending.length} proposte`);
          for (const action of pending) {
            try {
              await api.go.agentApply(id, { name: action.name, arguments: action.arguments });
              applied++;
            } catch { /* keep going; surfaced via applied count */ }
          }
        }

        setTurns((prev) => [...prev, {
          role: "assistant",
          content: res.text || (pending.length ? "(proposta senza testo)" : "(nessuna risposta)"),
          meta: { tokens: res.usage?.totalTokens, iterations: res.iterations, tools: (res.steps ?? []).map((s) => s.tool) },
          pending: pending.length ? pending : undefined,
          applied,
        }]);
      } catch (e) {
        setTurns((prev) => [...prev, { role: "assistant", content: `Errore: ${msg(e)}` }]);
        setError(msg(e));
        break;
      }
    }

    // Final trip state.
    try {
      setSnapshot(await api.trips.get(id));
    } catch { /* ignore */ }

    setStepLabel(null);
    setRunning(false);
  };

  const stop = () => { cancelRef.current = true; };

  const removeDraft = async () => {
    if (!tripId) return;
    await api.trips.remove(tripId).catch(() => {});
    setTripId(null);
    setSnapshot(null);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* ── Config column ── */}
      <div className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-surface px-6 py-7 flex flex-col gap-6">
        <div>
          <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-orange mb-1">GoAgent</div>
          <h1 className="text-xl font-semibold text-ink">Flussi</h1>
          <p className="mt-1.5 text-mini text-ink-soft leading-snug">
            Scenari ripetibili end-to-end. Ogni run parte da un trip draft pulito.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium text-ink-soft">Preset</span>
          <div className="flex flex-col gap-1.5">
            {PRESET_FLOWS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => selectPreset(f.id)}
                className={cn(
                  "text-left rounded-md border px-3 py-2 transition-colors",
                  flowId === f.id ? "border-ink bg-surface-soft" : "border-border hover:border-border-strong",
                )}
              >
                <div className="text-mini font-medium text-ink">{f.title}</div>
                <div className="text-tiny text-ink-soft leading-snug mt-0.5">{f.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-ink-soft">Messaggi (uno per riga)</span>
            <span className="text-tiny text-ink-faint">{messages.length}</span>
          </div>
          <textarea
            value={script}
            onChange={(e) => { setScript(e.target.value); setFlowId("custom"); }}
            rows={8}
            className="w-full resize-y rounded-md border border-border bg-surface-input px-3 py-2 text-mini text-ink leading-relaxed outline-none focus:border-ink transition-colors"
          />
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <span className="text-[11px] font-medium text-ink-soft">Auto-conferma proposte</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoConfirm}
            onClick={() => setAutoConfirm((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              autoConfirm ? "bg-orange" : "bg-border-strong",
            )}
          >
            <span className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
              autoConfirm ? "translate-x-4" : "translate-x-0.5",
            )} />
          </button>
        </label>

        <div className="flex flex-col gap-2">
          {!running ? (
            <button
              type="button"
              onClick={() => void run()}
              disabled={messages.length === 0}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-mini font-medium border-0 transition-colors",
                messages.length ? "bg-ink text-white hover:bg-ink-hover cursor-pointer" : "bg-surface-soft text-ink-faint cursor-default",
              )}
            >
              {turns.length ? "Esegui da capo" : "Esegui flusso"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-mini font-medium border border-border-strong bg-transparent text-ink-soft hover:bg-surface-soft cursor-pointer transition-colors"
            >
              Interrompi
            </button>
          )}

          {tripId && (
            <div className="flex items-center gap-2">
              <a
                href={`/trips/new?draft=${tripId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center rounded-md border border-border px-3 py-1.5 text-tiny text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors no-underline"
              >
                Apri draft ↗
              </a>
              <button
                type="button"
                onClick={() => void removeDraft()}
                disabled={running}
                className="flex-1 rounded-md border border-border px-3 py-1.5 text-tiny text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors"
              >
                Elimina draft
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-tiny text-danger-fg">{error}</div>
        )}
      </div>

      {/* ── Run output ── */}
      <div className="flex-1 min-w-0 px-8 py-7 flex flex-col gap-6">
        {/* Totals */}
        <div className="flex flex-wrap gap-2">
          <Stat label="Turni" value={turns.filter((t) => t.role === "assistant").length} />
          <Stat label="Iterazioni" value={iterTotal} />
          <Stat label="Token" value={usage.totalTokens} />
          <Stat label="Cached" value={usage.cachedTokens ?? 0} />
          {stepLabel && (
            <span className="inline-flex items-center gap-2 rounded-md bg-surface-soft px-3 py-1.5 text-tiny text-ink-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" /> {stepLabel}
            </span>
          )}
        </div>

        {/* Resulting trip */}
        {snapshot && <TripResult snapshot={snapshot} />}

        {/* Transcript */}
        <div className="flex flex-col gap-4">
          {turns.length === 0 && !running && (
            <div className="text-meta text-ink-faint font-serif italic">
              Scegli un preset (o scrivi i tuoi messaggi) e premi «Esegui flusso».
            </div>
          )}
          {turns.map((t, i) => (
            t.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="bg-ink text-white rounded-[14px_14px_4px_14px] px-3.5 py-2 text-meta max-w-[80%]">{t.content}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5 items-start">
                <GoAvatar size="xs" pulse={false} className="mt-0.5" />
                <div className="flex flex-col gap-1.5 min-w-0">
                  <RichText text={t.content} className="font-serif italic text-ink text-[15px] leading-relaxed" />
                  {t.pending && t.pending.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {t.pending.map((p, pi) => (
                        <div key={pi} className="rounded-md border border-primary-border bg-primary-soft px-2.5 py-1.5 text-tiny text-primary-deep">
                          <span className="font-mono font-medium">{p.name}</span> · {p.summary}
                        </div>
                      ))}
                      <div className="text-micro text-ink-faint">
                        {t.applied === t.pending.length
                          ? `✓ ${t.applied} applicate`
                          : `${t.applied ?? 0}/${t.pending.length} applicate`}
                      </div>
                    </div>
                  )}
                  {t.meta && (
                    <div className="text-micro font-mono text-ink-faint">
                      {t.meta.tokens != null ? `${t.meta.tokens} tok` : ""}
                      {t.meta.iterations != null ? ` · ${t.meta.iterations} iter` : ""}
                      {t.meta.tools?.length ? ` · ${t.meta.tools.join(", ")}` : ""}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface border border-border px-3 py-1.5">
      <span className="text-tiny text-ink-faint">{label} </span>
      <span className="text-mini font-mono font-medium text-ink">{value.toLocaleString("it")}</span>
    </div>
  );
}

function TripResult({ snapshot }: { snapshot: TripSnapshot }) {
  const days = [...snapshot.days].sort((a, b) => a.day_number - b.day_number);
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-2">Trip risultante</div>
      <div className="text-sm font-medium text-ink">{snapshot.trip.title || "—"}</div>
      <div className="text-mini text-ink-soft">
        {snapshot.trip.destination ?? "—"}
        {snapshot.trip.start_date ? ` · ${snapshot.trip.start_date} → ${snapshot.trip.end_date ?? "?"}` : ""}
        {` · ${days.length} giorni`}
      </div>
      {days.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {days.map((d) => (
            <li key={d.id} className="flex items-baseline gap-2 text-tiny">
              <span className="font-mono text-ink-faint w-8 shrink-0">g{d.day_number}</span>
              <span className="text-ink font-medium">{d.label || d.city || "—"}</span>
              <span className="text-ink-faint">
                {d.activities.length ? `· ${d.activities.length} attività` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
