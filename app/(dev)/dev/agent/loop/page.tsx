"use client";

/**
 * /dev/agent/loop — single-turn deep debug of the agent loop.
 *
 * Sends one message (debug:true) and lays out the full trace: the per-message
 * token split of the payload and every model call the loop made, with its
 * kind, usage, tool calls and tool results.
 */

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import type { GoAgentResult, GoAgentIteration } from "@/lib/client/go";

const KIND_TONE: Record<GoAgentIteration["kind"], string> = {
  tools: "bg-primary-soft text-primary-deep border-primary-border",
  answer: "bg-success-bg text-success-fg border-success-border",
  gated: "bg-warning-bg text-warning-fg border-warning-border",
  intro: "bg-surface-soft text-ink-soft border-border",
  "forced-final": "bg-danger-bg text-danger-fg border-danger-border",
};

export default function AgentLoopPage() {
  const tripIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string> | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [message, setMessage] = useState("10 giorni in Giappone a luglio 2026, in coppia.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GoAgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureTripId = useCallback(async (): Promise<string> => {
    if (tripIdRef.current) return tripIdRef.current;
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      const { id } = await api.trips.create({ title: "Agent loop draft" });
      tripIdRef.current = id;
      setTripId(id);
      return id;
    })();
    return creatingRef.current;
  }, []);

  const run = async () => {
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const id = await ensureTripId();
      setResult(await api.go.agent({ tripId: id, message: text, debug: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const newSession = async () => {
    const old = tripIdRef.current;
    tripIdRef.current = null;
    creatingRef.current = null;
    setTripId(null);
    setResult(null);
    if (old) await api.trips.remove(old).catch(() => {});
  };

  const dbg = result?._debug;

  return (
    <div className="px-10 py-10 max-w-4xl space-y-7">
      <div>
        <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-orange mb-1">GoAgent</div>
        <h1 className="text-2xl font-semibold text-ink">Loop / debug</h1>
        <p className="mt-2 text-sm text-ink-soft max-w-prose">
          Un singolo turno, esploso. Manda un messaggio su un trip draft e osserva ogni chiamata al modello.
        </p>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full resize-y rounded-md border border-border bg-surface-input px-3 py-2 text-meta text-ink leading-relaxed outline-none focus:border-ink transition-colors"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={!message.trim() || loading}
            className={cn(
              "rounded-pill px-4 py-2 text-mini font-medium border-0 transition-colors",
              message.trim() && !loading ? "bg-ink text-white hover:bg-ink-hover cursor-pointer" : "bg-surface-soft text-ink-faint cursor-default",
            )}
          >
            {loading ? "In corso…" : "Invia turno"}
          </button>
          <button
            type="button"
            onClick={() => void newSession()}
            disabled={loading}
            className="rounded-pill px-4 py-2 text-mini font-medium border border-border-strong bg-transparent text-ink-soft hover:bg-surface-soft cursor-pointer transition-colors"
          >
            Nuova sessione
          </button>
          {tripId && <span className="text-tiny font-mono text-ink-faint">trip {tripId.slice(0, 8)}</span>}
        </div>
        {error && (
          <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-tiny text-danger-fg">{error}</div>
        )}
      </div>

      {result && (
        <>
          {/* Summary */}
          <div className="flex flex-wrap gap-2">
            <Stat label="Iterazioni" value={result.iterations} />
            <Stat label="Token totali" value={result.usage?.totalTokens ?? 0} />
            <Stat label="Cached" value={result.usage?.cachedTokens ?? 0} />
            <Stat label="Completion" value={result.usage?.completionTokens ?? 0} />
            <span className="rounded-md bg-surface border border-border px-3 py-1.5 text-tiny text-ink-faint">
              {result.provider} · <span className="font-mono">{result.model}</span>
            </span>
          </div>

          {/* Token split */}
          {dbg?.tokens && (
            <section>
              <SectionTitle>Token del payload</SectionTitle>
              <div className="flex flex-wrap gap-2">
                <Stat label="System" value={dbg.tokens.system} />
                <Stat label="Tools" value={dbg.tokens.tools} />
                <Stat label="Context" value={dbg.tokens.context} />
                <Stat label="User msg" value={dbg.tokens.userMessage} />
              </div>
            </section>
          )}

          {/* Final text */}
          <section>
            <SectionTitle>Risposta finale</SectionTitle>
            <div className="text-meta text-ink bg-surface-soft rounded-lg px-3 py-2.5 font-serif italic leading-snug whitespace-pre-wrap">
              {result.text || "(vuota)"}
            </div>
          </section>

          {/* Iterations */}
          <section>
            <SectionTitle>Iterazioni ({dbg?.iterations.length ?? 0})</SectionTitle>
            <div className="flex flex-col gap-3">
              {(dbg?.iterations ?? []).map((it) => (
                <div key={it.index} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-tiny font-mono text-ink-faint">#{it.index}</span>
                    <span className={cn("rounded-pill border px-2 py-0.5 text-micro font-medium", KIND_TONE[it.kind])}>
                      {it.kind}
                    </span>
                    {it.usage && (
                      <span className="text-micro font-mono text-ink-faint">
                        {it.usage.totalTokens} tok
                        {it.usage.cachedTokens ? ` · ${it.usage.cachedTokens} cached` : ""}
                      </span>
                    )}
                  </div>

                  {it.text && (
                    <p className="mt-2 text-mini text-ink leading-relaxed whitespace-pre-wrap">{it.text}</p>
                  )}

                  {it.toolCalls.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {it.toolCalls.map((c, ci) => {
                        const tr = it.toolResults[ci];
                        return (
                          <div key={ci}>
                            <div className="text-tiny font-mono font-medium text-ink mb-1">→ {c.name}</div>
                            <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-md px-2.5 py-2 overflow-x-auto">
                              {JSON.stringify(c.arguments, null, 2)}
                            </pre>
                            {tr && (
                              <pre className="mt-1 text-[10px] font-mono text-ink-faint leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-md px-2.5 py-2 overflow-x-auto">
                                ← {JSON.stringify(tr.result, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-2">{children}</div>;
}
