"use client";

/**
 * GoChat — trigger + pannello conversazionale di Go.
 *
 * Grafica fedele a ai_suggest.html:
 * - nessun container/card — conversazione aperta sulla pagina
 * - ai-card: background transparent, border 0
 * - ai-card-head: border-bottom 0.5px, padding 6px 4px 14px
 * - ai-card-body: padding 0 4px
 * - ai-card-foot: padding 14px 4px 4px, no border
 * - go-bubble: surface, border, serif italic, radius 16/16/16/4
 * - user-bubble: bg-ink, radius 16/16/4/16
 * - go-input: pill surface, sparkles orange, send circle ink
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconSparkles, IconArrowUp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { api } from "@/lib/client";
import { GoChatFloat } from "./GoChatFloat";

/* ─────────────────────────────────────────────────────────────────
   Tipi
───────────────────────────────────────────────────────────────── */

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

/* ─────────────────────────────────────────────────────────────────
   Rotating words (trigger)
───────────────────────────────────────────────────────────────── */

const ROTATING_WORDS = [
  "a place to visit?",
  "a stay for tonight?",
  "a food spot?",
  "an idea?",
];

/* ─────────────────────────────────────────────────────────────────
   Debug hook type — opzionale, usato solo dalla sandbox
───────────────────────────────────────────────────────────────── */

export type GoChatDebugCall = {
  id: string;
  ts: number;
  systemPrompt: string | null;
  messages: { role: "user" | "assistant" | "tool" | "system"; content: string }[];
  response: string | null;
  error: string | null;
  durationMs: number | null;
  streaming: boolean;
  /** Token usage (agent loop / tool calls), when the server reports it. */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  /** Number of model calls in the loop, when applicable. */
  iterations?: number | null;
};

export type GoChatDebugFn = (call: GoChatDebugCall) => void;

/* ─────────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────────── */

export type GoChatProps = {
  className?: string;
  onDebugCall?: GoChatDebugFn;
  /** Compact trip context string built by getGoContext(). Injected into system prompt. */
  tripContext?: string;
  /**
   * "inline" (default) — il panel si apre inline sotto il trigger.
   * "float" — al click sul trigger si apre il panel floating fixed bottom-right.
   */
  variant?: "inline" | "float";
};

/* ─────────────────────────────────────────────────────────────────
   Root
───────────────────────────────────────────────────────────────── */

export function GoChat({ className, onDebugCall, tripContext, variant = "inline" }: GoChatProps) {
  const [open, setOpen] = useState(false);
  const [floatOpen, setFloatOpen] = useState(false);

  if (variant === "float") {
    return (
      <>
        <GoTrigger onClick={() => setFloatOpen(true)} className={className} />
        <GoChatFloat
          tripContext={tripContext}
          onDebugCall={onDebugCall}
          open={floatOpen}
          onClose={() => setFloatOpen(false)}
        />
      </>
    );
  }

  if (!open) {
    return <GoTrigger onClick={() => setOpen(true)} className={className} />;
  }

  return <GoChatPanel onClose={() => setOpen(false)} className={className} onDebugCall={onDebugCall} tripContext={tripContext} />;
}

/* ─────────────────────────────────────────────────────────────────
   Trigger
───────────────────────────────────────────────────────────────── */

function GoTrigger({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ask Go for trip suggestions"
      className={cn(
        "relative overflow-hidden rounded-xl w-full text-left",
        "flex items-center gap-3 px-3.5 py-3 cursor-pointer bg-transparent border-0",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="go-sweep absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: "linear-gradient(100deg, transparent 30%, rgba(244,123,58,0.18) 50%, transparent 70%)" }}
      />
      <span className="relative z-[2] shrink-0"><GoAvatar size="lg" pulse /></span>
      <div className="relative z-[2] flex-1 min-w-0">
        <div className="text-micro font-medium uppercase tracking-[0.08em] text-orange leading-none">Hi from Go</div>
        <div className="text-[14px] font-medium text-ink mt-0.5 overflow-hidden">
          Want to find{" "}
          <span aria-hidden="true" className="inline-block h-[20px] overflow-hidden align-[-4px] min-w-[145px]">
            <ul className="go-words-rotate list-none m-0 p-0 flex flex-col">
              {ROTATING_WORDS.map((w) => (
                <li key={w} className="h-[20px] leading-[20px] font-serif italic text-ink whitespace-nowrap">{w}</li>
              ))}
              <li className="h-[20px] leading-[20px] font-serif italic text-ink whitespace-nowrap">{ROTATING_WORDS[0]}</li>
            </ul>
          </span>
        </div>
        <div className="text-tiny font-serif italic text-ink-soft mt-0.5">
          Two words from you, a handful of ideas from me.
        </div>
      </div>
      <span className="relative z-[2] inline-flex items-center gap-1.5 bg-ink hover:bg-ink-hover text-white rounded-pill text-mini font-medium shrink-0 pl-3 pr-4 py-2 transition-colors">
        <IconSparkles size={13} className="text-orange" />
        Ask me
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Chat panel — nessun container, aperto sulla pagina
───────────────────────────────────────────────────────────────── */


function GoChatPanel({ onClose, className, onDebugCall, tripContext }: { onClose: () => void; className?: string; onDebugCall?: GoChatDebugFn; tripContext?: string }) {
  const t = useTranslations("Go");
  const tCommon = useTranslations("Common");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const greetingSent = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Greeting automatico all'apertura
  useEffect(() => {
    if (greetingSent.current) return;
    greetingSent.current = true;
    void send(
      "Introduce yourself briefly and greet the user based on their trip context. Be warm and specific — mention the destination and something relevant (family, duration, themes). Keep it to 2-3 sentences max.",
      true,
    );
  }, []);

  const send = useCallback(async (text: string, silent = false) => {
    const assistantId = crypto.randomUUID();
    const debugId = crypto.randomUUID();
    const t0 = Date.now();

    // Silent: mostra solo la risposta di Go, non il messaggio utente
    if (silent) {
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
    } else {
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
    }
    setLoading(true);
    setInput("");

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    // Notifica debug: start
    onDebugCall?.({
      id: debugId, ts: Date.now(), systemPrompt: null,
      messages: history, response: null, error: null, durationMs: null, streaming: true,
    });

    try {
      const res = await api.go.chat({ messages: history, tripContext });

      if (!res.body) throw new Error("No response body");

      const rawSystemPrompt = res.headers.get("X-Go-System-Prompt");
      const systemPrompt = rawSystemPrompt ? decodeURIComponent(rawSystemPrompt) : null;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: snap } : m),
        );
        // Notifica debug: chunk
        onDebugCall?.({
          id: debugId, ts: t0, systemPrompt,
          messages: history, response: snap, error: null, durationMs: null, streaming: true,
        });
      }

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m),
      );
      // Notifica debug: done
      onDebugCall?.({
        id: debugId, ts: t0, systemPrompt,
        messages: history, response: accumulated, error: null, durationMs: Date.now() - t0, streaming: false,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: t("errorGeneric"), streaming: false }
            : m,
        ),
      );
      // Notifica debug: error
      onDebugCall?.({
        id: debugId, ts: t0, systemPrompt: null,
        messages: history, response: null, error: errMsg, durationMs: Date.now() - t0, streaming: false,
      });
    } finally {
      setLoading(false);
    }
  }, [messages, onDebugCall]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    void send(text);
  };

  return (
    /* ai-card: transparent, no border, no overflow */
    <div className={cn("bg-transparent", className)}>

      {/* ai-card-head: border-bottom sottile, padding fedele */}
      <div
        className="flex items-center gap-2.5 pb-3.5"
        style={{ borderBottom: "0.5px solid var(--color-border)", paddingTop: "6px", paddingLeft: "4px", paddingRight: "4px" }}
      >
        <GoAvatar size="md" pulse />
        <div className="flex-1 min-w-0">
          <div className="text-micro font-medium uppercase tracking-[0.08em] text-orange leading-none">
            {t("title")}
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-tiny text-ink-faint">
          <span className="w-[7px] h-[7px] rounded-full bg-success-fg" />
          online
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="ml-1.5 w-7 h-7 rounded-full border border-border-strong text-ink-soft inline-flex items-center justify-center hover:bg-surface-soft hover:text-ink transition-colors bg-transparent"
        >
          <CloseIcon />
        </button>
      </div>

      {/* ai-card-body: padding 0 4px, scroll */}
      <div
        className="overflow-y-auto flex flex-col py-3.5"
        style={{ padding: "14px 4px 0", maxHeight: "400px" }}
      >
        {messages.map((msg) =>
          msg.role === "assistant" ? (
            <GoRow key={msg.id}>
              <GoBubble streaming={msg.streaming}>{msg.content}</GoBubble>
            </GoRow>
          ) : (
            <UserRow key={msg.id}>
              <UserBubble>{msg.content}</UserBubble>
            </UserRow>
          ),
        )}

        <div ref={bottomRef} />
      </div>

      {/* ai-card-foot: padding 14px 4px 4px, no border */}
      <div style={{ padding: "14px 4px 4px" }}>
        <form onSubmit={handleSubmit}>
          {/* go-input: pill surface, border-strong, sparkles, send */}
          <div
            className={cn(
              "flex items-center gap-2.5 bg-surface rounded-pill transition-all",
              "focus-within:shadow-[0_0_0_3px_rgba(244,123,58,0.12)]",
            )}
            style={{
              border: "0.5px solid var(--color-border-strong)",
              padding: "6px 6px 6px 14px",
            }}
          >
            <IconSparkles size={15} className="text-orange shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholder")}
              disabled={loading}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-meta text-ink placeholder:text-ink-faint py-1.5 disabled:opacity-50"
              style={{ fontFamily: "inherit" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label={tCommon("send")}
              className={cn(
                "w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 transition-colors border-0",
                input.trim() && !loading
                  ? "bg-ink hover:bg-ink-hover text-white cursor-pointer"
                  : "bg-surface-soft text-ink-faint cursor-default",
              )}
            >
              <IconArrowUp size={16} />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Bubble — fedeli ad ai_suggest.html
───────────────────────────────────────────────────────────────── */

function GoRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start" style={{ marginBottom: "14px" }}>
      <GoAvatar size="sm" pulse={false} />
      {children}
    </div>
  );
}

function GoBubble({ children, streaming }: { children: React.ReactNode; streaming?: boolean }) {
  return (
    <div
      className="text-[14px] text-ink leading-[1.55] font-serif italic"
      style={{
        background: "var(--color-surface)",
        border: "0.5px solid var(--color-border)",
        borderRadius: "16px 16px 16px 4px",
        padding: "10px 14px",
        maxWidth: "calc(100% - 38px)",
      }}
    >
      <span
        className="block text-micro font-medium uppercase tracking-[0.08em] text-orange not-italic"
        style={{ fontFamily: "var(--font-sans)", marginBottom: "2px" }}
      >
        Go
      </span>
      {children || (streaming ? <StreamingDots /> : null)}
      {streaming && children && (
        <span className="inline-block w-[2px] h-[14px] bg-orange ml-0.5 align-middle animate-pulse rounded-sm" />
      )}
    </div>
  );
}

function UserRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2.5 items-start" style={{ marginBottom: "14px" }}>
      {children}
      <span
        className="rounded-full bg-surface-soft text-ink-soft inline-flex items-center justify-center text-mini font-medium shrink-0"
        style={{ width: "36px", height: "36px" }}
      >
        tu
      </span>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[14px] leading-[1.5] text-white"
      style={{
        background: "var(--color-ink)",
        borderRadius: "16px 16px 4px 16px",
        padding: "10px 14px",
        maxWidth: "calc(100% - 46px)",
      }}
    >
      {children}
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 items-center" style={{ height: "16px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full bg-ink-faint animate-bounce"
          style={{ width: "6px", height: "6px", animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Icona close
───────────────────────────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <line x1="2" y1="2" x2="10" y2="10" />
      <line x1="10" y1="2" x2="2" y2="10" />
    </svg>
  );
}
