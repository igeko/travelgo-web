"use client";

/**
 * /dev/agent/compare — send the same message to two models, side by side.
 *
 * Each column picks a provider + tier (resolved to a concrete model via the
 * registry, e.g. gemini-2.5-flash vs gemini-3.5-flash). One ephemeral model
 * call per column: nothing is persisted and no tools run — the tool calls a
 * model WOULD make are listed, not executed.
 */

import { useState } from "react";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import { RichText } from "@/features/go/RichText";
import { LLM_MODELS } from "@/lib/ai/llm/models";
import type { LlmProvider, LlmTier } from "@/lib/ai/llm";
import type { GoAgentCompareResult } from "@/lib/client/go";

type Side = { provider: LlmProvider; tier: LlmTier };
type Run = { loading: boolean; result?: GoAgentCompareResult; error?: string };

const PROVIDERS: LlmProvider[] = ["openai", "gemini"];
const TIERS: LlmTier[] = ["fast", "smart"];

export default function ComparePage() {
  const [message, setMessage] = useState("10 giorni in Giappone a luglio 2026, in coppia. Ci piace mangiare bene.");
  const [a, setA] = useState<Side>({ provider: "gemini", tier: "fast" });
  const [b, setB] = useState<Side>({ provider: "gemini", tier: "smart" });
  const [runA, setRunA] = useState<Run>({ loading: false });
  const [runB, setRunB] = useState<Run>({ loading: false });

  const busy = runA.loading || runB.loading;

  const compare = async () => {
    const text = message.trim();
    if (!text || busy) return;
    setRunA({ loading: true });
    setRunB({ loading: true });

    const call = async (side: Side, setRun: (r: Run) => void) => {
      try {
        const result = await api.go.agentCompare({ message: text, provider: side.provider, tier: side.tier });
        setRun({ loading: false, result });
      } catch (e) {
        setRun({ loading: false, error: e instanceof Error ? e.message : String(e) });
      }
    };

    await Promise.all([call(a, setRunA), call(b, setRunB)]);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="shrink-0 border-b border-border bg-surface px-6 py-4">
        <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-orange">GoAgent</div>
        <h1 className="text-sm font-medium text-ink">Confronto modelli</h1>
        <p className="mt-1 text-tiny text-ink-soft max-w-prose">
          Stesso messaggio, due modelli. Una singola chiamata effimera per colonna · nessuna persistenza, i tool non vengono eseguiti.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void compare(); } }}
            rows={2}
            className="flex-1 resize-y rounded-md border border-border bg-surface-input px-3 py-2 text-meta text-ink leading-relaxed outline-none focus:border-ink transition-colors"
          />
          <button
            type="button"
            onClick={() => void compare()}
            disabled={!message.trim() || busy}
            className={cn(
              "rounded-pill px-5 py-2.5 text-mini font-medium border-0 transition-colors shrink-0",
              message.trim() && !busy ? "bg-ink text-white hover:bg-ink-hover cursor-pointer" : "bg-surface-soft text-ink-faint cursor-default",
            )}
          >
            {busy ? "Confronto…" : "Confronta"}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
        <Column side={a} onChange={setA} run={runA} className="border-b lg:border-b-0 lg:border-r border-border" />
        <Column side={b} onChange={setB} run={runB} />
      </div>
    </div>
  );
}

function Column({ side, onChange, run, className }: { side: Side; onChange: (s: Side) => void; run: Run; className?: string }) {
  const targetModel = LLM_MODELS[side.provider][side.tier];
  return (
    <div className={cn("min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4", className)}>
      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented options={PROVIDERS} value={side.provider} onChange={(provider) => onChange({ ...side, provider })} />
        <Segmented options={TIERS} value={side.tier} onChange={(tier) => onChange({ ...side, tier })} />
        <code className="text-tiny font-mono text-primary-deep bg-primary-soft border border-primary-border rounded px-1.5 py-0.5">
          {targetModel}
        </code>
      </div>

      {/* Result */}
      {run.loading ? (
        <div className="font-serif italic text-ink-faint text-meta">Sto interrogando {targetModel}…</div>
      ) : run.error ? (
        <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-tiny text-danger-fg">{run.error}</div>
      ) : run.result ? (
        <ResultBody result={run.result} />
      ) : (
        <div className="text-meta text-ink-faint font-serif italic">In attesa del confronto.</div>
      )}
    </div>
  );
}

function ResultBody({ result }: { result: GoAgentCompareResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-pill bg-surface border border-border px-2 py-0.5 text-tiny text-ink-soft">
          {result.provider} · <span className="font-mono text-ink">{result.model}</span>
        </span>
        {result.usage && (
          <span className="text-tiny font-mono text-ink-faint">
            {result.usage.totalTokens.toLocaleString("it")} tok
            {result.usage.cachedTokens ? ` · ${result.usage.cachedTokens.toLocaleString("it")} cached` : ""}
          </span>
        )}
      </div>

      {result.text ? (
        <RichText text={result.text} className="font-serif italic text-ink text-[15px] leading-relaxed" />
      ) : (
        <div className="text-mini text-ink-faint italic">(nessun testo — solo tool calls)</div>
      )}

      {result.toolCalls.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            Tool calls proposti ({result.toolCalls.length})
          </div>
          {result.toolCalls.map((c, i) => (
            <div key={i}>
              <div className="text-tiny font-mono font-medium text-ink mb-1">→ {c.name}</div>
              <pre className="text-[10px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-md px-2.5 py-2 overflow-x-auto">
                {JSON.stringify(c.arguments, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 text-tiny font-medium transition-colors",
            opt === value ? "bg-ink text-white" : "bg-surface text-ink-soft hover:bg-surface-soft",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
