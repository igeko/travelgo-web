"use client";

/**
 * /dev/agent/chat — live GoAgentChat playground.
 *
 * Same component the real /trips/new page mounts, on a throwaway draft trip.
 * "Nuova sessione" wipes the draft and remounts the chat from scratch, so you
 * can re-test the conversational flow as often as you like.
 */

import { useCallback, useRef, useState } from "react";
import { GoAgentChat } from "@/features/go/GoAgentChat";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";

export default function AgentChatPage() {
  const tripIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string> | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [models, setModels] = useState<string[]>([]);

  const ensureTripId = useCallback(async (): Promise<string> => {
    if (tripIdRef.current) return tripIdRef.current;
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      const { id } = await api.trips.create({ title: "Agent chat draft" });
      tripIdRef.current = id;
      setTripId(id);
      return id;
    })();
    return creatingRef.current;
  }, []);

  const newSession = async () => {
    const old = tripIdRef.current;
    tripIdRef.current = null;
    creatingRef.current = null;
    setTripId(null);
    setResetKey((k) => k + 1);
    setModels([]);
    if (old) await api.trips.remove(old).catch(() => {});
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3">
        <div>
          <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-orange">GoAgent</div>
          <h1 className="text-sm font-medium text-ink">Chat playground</h1>
        </div>
        <div className="flex items-center gap-2">
          {tripId && (
            <a
              href={`/trips/new?draft=${tripId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-3 py-1.5 text-tiny text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors no-underline"
            >
              Apri draft ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => void newSession()}
            className={cn(
              "rounded-pill px-3 py-1.5 text-tiny font-medium border-0 transition-colors",
              "bg-ink text-white hover:bg-ink-hover cursor-pointer",
            )}
          >
            Nuova sessione
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-12">
        {/* Chat · 5/12 */}
        <div className="col-span-12 lg:col-span-5 min-h-0 border-b lg:border-b-0 lg:border-r border-border px-6 py-6">
          <GoAgentChat
            key={resetKey}
            ensureTripId={ensureTripId}
            onResult={(res) => setModels((prev) => [...prev, res.model || "—"])}
            className="h-full"
          />
        </div>

        {/* Debug · 7/12 */}
        <div className="col-span-12 lg:col-span-7 min-h-0 overflow-y-auto bg-surface-soft px-7 py-6">
          <DebugPanel models={models} />
        </div>
      </div>
    </div>
  );
}

function DebugPanel({ models }: { models: string[] }) {
  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex items-baseline gap-2">
        <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint">Debug</div>
        <span className="text-tiny text-ink-faint">{models.length} chiamate</span>
      </div>

      {models.length === 0 ? (
        <p className="text-mini text-ink-faint italic">Il modello di ogni chiamata comparirà qui.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {models.map((model, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-tiny font-mono text-ink-faint w-8 shrink-0">#{i + 1}</span>
              <code className="text-mini font-mono text-primary-deep bg-primary-soft border border-primary-border rounded px-1.5 py-0.5">
                {model}
              </code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
