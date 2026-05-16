"use client";

import { useEffect, useState } from "react";

type TesterNote = {
  id: string;
  type: "bug" | "suggestion" | "other";
  note: string;
  page_url: string | null;
  trip_id: string | null;
  user_id: string;
  created_at: string;
};

const TYPE_META = {
  bug:        { emoji: "🐛", label: "Bug",          color: "text-red-600 bg-red-50 border-red-200" },
  suggestion: { emoji: "💡", label: "Suggerimento",  color: "text-amber-700 bg-amber-50 border-amber-200" },
  other:      { emoji: "💬", label: "Altro",         color: "text-ink-soft bg-surface-soft border-border" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export default function TesterNotesPage() {
  const [notes, setNotes] = useState<TesterNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "bug" | "suggestion" | "other">("all");

  useEffect(() => {
    fetch("/api/tester-notes")
      .then((r) => r.json())
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? notes : notes.filter((n) => n.type === filter);

  return (
    <div className="p-8 max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-ink">Tester Notes</h1>
        <p className="text-[13px] text-ink-soft mt-1">Feedback e segnalazioni dai tester.</p>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-2 mb-5">
        {(["all", "bug", "suggestion", "other"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-pill text-[12px] border transition-colors cursor-pointer font-sans ${
              filter === f
                ? "bg-ink text-white border-ink font-medium"
                : "bg-transparent border-border text-ink-soft hover:border-border-strong hover:text-ink"
            }`}
          >
            {f === "all" ? `Tutti (${notes.length})` : `${TYPE_META[f].emoji} ${TYPE_META[f].label}`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-[13px] text-ink-faint">Caricamento…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-[13px] text-ink-faint">Nessuna nota.</div>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((note) => {
          const meta = TYPE_META[note.type];
          return (
            <div key={note.id} className="rounded-xl border border-border bg-surface px-4 py-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-pill border ${meta.color}`}>
                  {meta.emoji} {meta.label}
                </span>
                <span className="text-[11px] text-ink-faint ml-auto">{fmt(note.created_at)}</span>
              </div>
              <p className="text-[13px] text-ink leading-snug">{note.note}</p>
              {note.page_url && (
                <span className="text-[11px] font-mono text-ink-faint">{note.page_url}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
