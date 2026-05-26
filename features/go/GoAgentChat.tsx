"use client";

/**
 * features/go/GoAgentChat.tsx
 * ─────────────────────────────────────────────────────────────────
 * Minimal chat bound to the Go agent loop (/api/go/agent). Deliberately
 * lightweight — this is the seed of the official Go chat. No streaming yet:
 * one turn = one request, the agent may call tools server-side and returns
 * the final narration.
 *
 * The host owns the trip: `ensureTripId` creates/returns the draft trip on
 * first send; `onTurnComplete` lets the host refetch the trip after the
 * agent may have mutated it (e.g. setTripMeta generating days).
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import { useDebugMode } from "@/lib/hooks/useDebugMode";
import { publishLlmDebug } from "@/lib/debug/llmDebug";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { RichText } from "./RichText";
import { ActivityCard, type ActivityCardData } from "./ActivityCard";
import { IconArrowUp, IconSparkles, IconCheck, IconX } from "@/components/ui/icons";
import type { GoPendingAction } from "@/lib/client/go";

type ActItem = { day?: number; title?: string; slot?: string; time?: string; category?: string; description?: string };

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: { tokens?: number; iterations?: number; tools?: string[] };
  /** Proposed writes awaiting the user's confirmation. */
  pending?: GoPendingAction[];
  /** Resolution of the pending actions, once the user decides. */
  resolved?: "applied" | "cancelled";
};

/** Starter affordances shown in the Blank input (design trips-new-v5). */
const HINTS = ["una città", "un weekend", "un long-haul"];

export function GoAgentChat({
  ensureTripId,
  onTurnComplete,
  initialTurns,
  selectedDay,
  className,
}: {
  ensureTripId: () => Promise<string>;
  onTurnComplete?: () => void;
  /** Saved conversation to hydrate on reload (loaded by the host), including
   *  any confirm-gated proposals so the widgets/cards come back. */
  initialTurns?: { role: "user" | "assistant"; content: string; pending?: GoPendingAction[] }[];
  /** Currently selected day number (from the DayRail), or null. */
  selectedDay?: number | null;
  className?: string;
}) {
  const [debug] = useDebugMode();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [yumeKeys, setYumeKeys] = useState<Set<string>>(new Set());
  const [yumeBusyKey, setYumeBusyKey] = useState<string | null>(null);
  const [infoCards, setInfoCards] = useState<{ id: string; title: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tripIdRef = useRef<string | null>(null);

  // Hydrate once from saved history (arrives async); never clobber a live thread.
  useEffect(() => {
    if (initialTurns && initialTurns.length > 0) {
      setTurns((prev) => (prev.length === 0 ? initialTurns.map((t) => ({ id: crypto.randomUUID(), ...t })) : prev));
    }
  }, [initialTurns]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setTurns((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);
    setLoading(true);
    const t0 = Date.now();
    try {
      const tripId = await ensureTripId();
      tripIdRef.current = tripId;
      const res = await api.go.agent({ tripId, message: text, selectedDay, debug });
      setTurns((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.text || (res.pendingActions?.length ? "Ecco la mia proposta:" : "(nessuna risposta)"),
        meta: { tokens: res.usage?.totalTokens, iterations: res.iterations, tools: (res.steps ?? []).map((s) => s.tool) },
        pending: res.pendingActions?.length ? res.pendingActions : undefined,
      }]);
      // Feed the app-wide LLM debug panel when debug mode is on.
      if (debug) {
        publishLlmDebug({
          id: crypto.randomUUID(),
          ts: t0,
          provider: res.provider ?? null,
          model: res.model ?? null,
          mode: "agent",
          durationMs: Date.now() - t0,
          systemPrompt: res._debug?.systemPrompt ?? null,
          agent: res._debug ?? null,
          usage: res.usage ?? null,
          iterations: res.iterations ?? null,
          responseText: res.text ?? null,
          raw: JSON.stringify({ text: res.text, steps: res.steps }, null, 2),
        });
      }
      onTurnComplete?.();
    } catch (e) {
      setTurns((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Errore: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  };

  // Confirm the proposed writes for a turn: apply each, then refetch.
  const confirmTurn = async (turn: Turn) => {
    const tripId = tripIdRef.current;
    if (!tripId || !turn.pending || applying) return;
    setApplying(true);
    try {
      for (const action of turn.pending) {
        await api.go.agentApply(tripId, { name: action.name, arguments: action.arguments });
      }
      setTurns((prev) => prev.map((t) => (t.id === turn.id ? { ...t, resolved: "applied" } : t)));
      onTurnComplete?.();
    } catch {
      // leave pending so the user can retry
    } finally {
      setApplying(false);
    }
  };

  const cancelTurn = (turn: Turn) => {
    setTurns((prev) => prev.map((t) => (t.id === turn.id ? { ...t, resolved: "cancelled" } : t)));
  };

  // Add one proposed activity to a specific day (per-card flow).
  const addOne = async (key: string, item: ActItem, day: number) => {
    const tripId = tripIdRef.current;
    if (!tripId || busyKey) return;
    setBusyKey(key);
    try {
      await api.go.agentApply(tripId, {
        name: "addActivities",
        arguments: { items: [{ ...item, day }] },
      });
      setAddedKeys((prev) => new Set(prev).add(key));
      onTurnComplete?.();
    } catch {
      // leave un-added so the user can retry
    } finally {
      setBusyKey(null);
    }
  };

  // A [[place:…]] chip's "Mostra info" → append a detail card at the bottom of
  // the chat (deduped by name, so re-clicking the same place won't stack).
  const showPlaceInfo = (name: string) => {
    setInfoCards((prev) => (prev.some((c) => c.title === name) ? prev : [...prev, { id: crypto.randomUUID(), title: name }]));
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  // Save one proposed activity to the user's Yumeji collection (unscheduled).
  const saveYume = async (key: string, item: ActItem) => {
    if (yumeBusyKey) return;
    setYumeBusyKey(key);
    try {
      await api.yumes.create({ title: item.title, short_desc: item.description, category: item.category });
      setYumeKeys((prev) => new Set(prev).add(key));
    } catch {
      // leave unsaved so the user can retry
    } finally {
      setYumeBusyKey(null);
    }
  };

  const empty = turns.length === 0;

  const sendBtn = (
    <button
      type="submit"
      disabled={!input.trim() || loading}
      aria-label="Invia"
      className={cn(
        "inline-flex items-center justify-center rounded-pill size-8 shrink-0 border-0 transition-colors",
        input.trim() && !loading ? "bg-primary text-white hover:opacity-90 cursor-pointer" : "bg-surface-soft text-ink-faint cursor-default",
      )}
    >
      <IconArrowUp size={15} />
    </button>
  );

  // Step 1 (Blank): hero + design-style input box (placeholder esempio + hint chips).
  if (empty) {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center px-6", className)}>
        <GoAvatar size="lg" className="mb-5" />
        <div className="text-tiny font-medium uppercase tracking-eyebrow text-primary mb-2">Go · the travel companion</div>
        <h1 className="font-serif italic text-3xl text-ink mb-3">Dove ti porto?</h1>
        <p className="text-meta text-ink-soft max-w-md mb-8">Scrivi quello che hai in mente, anche disordinato. Una città, una stagione, un&apos;idea: ci penso io a rimettere in ordine.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="w-full max-w-[560px] text-left rounded-lg border border-border-strong bg-surface px-4 py-4 shadow-sm"
        >
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="es. dieci giorni in Giappone a luglio con la mia ragazza, ci piace mangiare e camminare poco…"
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-ink-faint placeholder:italic outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {HINTS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setInput(h)}
                  className="rounded-pill border border-border bg-surface-soft text-ink-soft text-mini px-3 py-1 cursor-pointer hover:border-ink-soft transition-colors"
                >
                  ↗ {h}
                </button>
              ))}
            </div>
            {sendBtn}
          </div>
        </form>
      </div>
    );
  }

  // Active conversation: thread + compact bar.
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-4 px-1 py-2">
        {turns.map((t) => (
          t.role === "user" ? (
            <div key={t.id} className="flex justify-end">
              <div className="bg-ink text-white rounded-[14px_14px_4px_14px] px-3.5 py-2 text-meta max-w-[80%]">{t.content}</div>
            </div>
          ) : (
            <div key={t.id} className="flex gap-2.5 items-start">
              <GoAvatar size="xs" pulse={false} className="mt-0.5" />
              <div className="flex flex-col gap-1.5 min-w-0">
                <RichText text={t.content} onPlaceInfo={showPlaceInfo} className="font-serif italic text-ink text-[15px] leading-relaxed" />

                {/* Proposed writes. The cards stay visible even after the user
                    acts (per-card add / yumeji) or dismisses — only the
                    block action row below is gated on resolution, so nothing
                    the user is looking at vanishes on a click. */}
                {t.pending && (() => {
                  // Non-activity proposals (e.g. tappe) keep the block confirm;
                  // activity proposals expose per-card actions instead.
                  const hasBlock = t.pending.some((a) => a.name !== "addActivities");
                  return (
                    <div className="flex flex-col gap-2">
                      {t.pending.map((a, ai) => (
                        a.name === "addActivities" ? (
                          <div key={ai} className="flex flex-col gap-2">
                            {((a.arguments.items as ActItem[] | undefined) ?? []).map((it, ii) => {
                              const key = `${t.id}:${ai}:${ii}`;
                              const dayNum = selectedDay ?? it.day;
                              const data: ActivityCardData = {
                                title: it.title ?? "—",
                                category: it.category,
                                description: it.description,
                                day: dayNum,
                                slot: it.slot,
                                time: it.time,
                              };
                              return (
                                <ActivityCard
                                  key={ii}
                                  data={data}
                                  addLabel={dayNum != null ? `Aggiungi a g${dayNum}` : "Aggiungi"}
                                  onAdd={dayNum != null ? () => void addOne(key, it, dayNum) : undefined}
                                  added={addedKeys.has(key)}
                                  adding={busyKey === key}
                                  onYumeji={() => void saveYume(key, it)}
                                  yumeSaved={yumeKeys.has(key)}
                                  yumeSaving={yumeBusyKey === key}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div key={ai} className="rounded-md border border-primary-border bg-primary-soft p-3 text-mini text-primary-deep">{a.summary}</div>
                        )
                      ))}

                      {!t.resolved && (
                        <div className="flex gap-2 mt-0.5">
                          {hasBlock && (
                            <button
                              type="button"
                              onClick={() => void confirmTurn(t)}
                              disabled={applying}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-mini font-medium border-0 transition-colors",
                                applying ? "bg-surface-soft text-ink-faint cursor-default" : "bg-ink text-white hover:bg-ink-hover cursor-pointer",
                              )}
                            >
                              <IconCheck size={14} /> {applying ? "Applico…" : "Conferma"}
                            </button>
                          )}
                          {/* Block proposals can be cancelled; activity card sets
                              are just dismissed (the cards remain in the thread). */}
                          <button
                            type="button"
                            onClick={() => cancelTurn(t)}
                            disabled={applying}
                            className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-mini text-ink-soft border border-border-strong bg-transparent hover:bg-surface-soft cursor-pointer transition-colors"
                          >
                            <IconX size={14} /> {hasBlock ? "Annulla" : "Chiudi"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {t.resolved === "applied" && (
                  <div className="inline-flex items-center gap-1 text-mini text-success-fg"><IconCheck size={14} /> Fatto</div>
                )}

                {debug && t.meta && (
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

        {/* Place-mention detail cards: appended when the user picks "Mostra info"
            on a [[place:…]] chip. Auto-expand the deep-dive; add to the selected
            day (or save to Yumeji when no day is open). */}
        {infoCards.map((c) => {
          const key = `info:${c.id}`;
          const item: ActItem = { title: c.title, day: selectedDay ?? undefined };
          return (
            <div key={c.id} className="flex gap-2.5 items-start">
              <GoAvatar size="xs" pulse={false} className="mt-0.5" />
              <ActivityCard
                className="flex-1 min-w-0"
                data={{ title: c.title, day: selectedDay ?? undefined }}
                autoOpenInfo
                addLabel={selectedDay != null ? `Aggiungi a g${selectedDay}` : undefined}
                onAdd={selectedDay != null ? () => void addOne(key, item, selectedDay) : undefined}
                added={addedKeys.has(key)}
                adding={busyKey === key}
                addHint={selectedDay == null ? "Seleziona un giorno per aggiungerlo all'itinerario" : undefined}
                onYumeji={() => void saveYume(key, item)}
                yumeSaved={yumeKeys.has(key)}
                yumeSaving={yumeBusyKey === key}
              />
            </div>
          );
        })}

        {loading && <div className="font-serif italic text-ink-faint text-meta">Go sta pensando…</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(); }}
        className="mt-3 shrink-0 flex items-end gap-2 rounded-md border border-border-strong bg-surface-input px-3 py-2"
      >
        <IconSparkles size={15} className="text-primary shrink-0 mb-1.5" />
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Scrivi a Go…"
          className="flex-1 resize-none bg-transparent text-meta text-ink placeholder:text-ink-faint outline-none py-1 max-h-32"
        />
        {sendBtn}
      </form>
    </div>
  );
}
