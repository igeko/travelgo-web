"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppHeader } from "@/features/app/AppHeader";
import { useUser } from "@/features/app/UserContext";
import { useRouter } from "next/navigation";
import {
  IconBug, IconBulb, IconMessage,
  IconCircleDashed, IconThumbUp, IconHourglass, IconCircleCheck, IconArchive,
  IconTestPipe, IconPencil, IconCheck, IconX, IconTools,
} from "@/components/ui/icons";
import { FilterPill } from "@/components/ui/FilterPill";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackStatus =
  | "proposed"
  | "approved"
  | "in_progress"
  | "to_be_tested"
  | "done"
  | "archived";

type TesterNote = {
  id: string;
  type: "bug" | "suggestion" | "other";
  note: string;
  fix_notes: string | null;
  page_url: string | null;
  trip_id: string | null;
  user_id: string;
  author_name: string;
  created_at: string;
  status: FeedbackStatus;
};

type EditState = { id: string; field: "note" | "fix_notes"; value: string } | null;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const TYPE_META = {
  bug:        { icon: <IconBug size={14} />,     label: "Bug",        iconClass: "text-red-500" },
  suggestion: { icon: <IconBulb size={14} />,    label: "Suggestion", iconClass: "text-amber-500" },
  other:      { icon: <IconMessage size={14} />, label: "Other",      iconClass: "text-ink-soft" },
};

const STATUS_META: Record<FeedbackStatus, {
  label: string;
  icon: React.ReactNode;
  pillClass: string;
}> = {
  proposed:     {
    label: "Proposed",
    icon: <IconCircleDashed size={13} />,
    pillClass: "text-ink-soft border-border bg-surface-soft",
  },
  approved:     {
    label: "Approved",
    icon: <IconThumbUp size={13} />,
    pillClass: "text-blue-600 border-blue-200 bg-blue-50",
  },
  in_progress:  {
    label: "In progress",
    icon: <IconHourglass size={13} />,
    pillClass: "text-amber-600 border-amber-200 bg-amber-50",
  },
  to_be_tested: {
    label: "To be tested",
    icon: <IconTestPipe size={13} />,
    pillClass: "text-violet-600 border-violet-200 bg-violet-50",
  },
  done:         {
    label: "Done",
    icon: <IconCircleCheck size={13} />,
    pillClass: "text-green-600 border-green-200 bg-green-50",
  },
  archived:     {
    label: "Archived",
    icon: <IconArchive size={13} />,
    pillClass: "text-ink-faint border-border bg-surface",
  },
};

const ALL_STATUSES: FeedbackStatus[] = [
  "proposed", "approved", "in_progress", "to_be_tested", "done", "archived",
];
const FILTER_STATUSES: FeedbackStatus[] = [
  "proposed", "approved", "in_progress", "to_be_tested", "done",
];
const TYPE_FILTERS = ["all", "bug", "suggestion", "other"] as const;

// ---------------------------------------------------------------------------
// Markdown renderer (no deps — handles **bold**, *italic*, `code`, newlines)
// ---------------------------------------------------------------------------

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          <InlineMd text={line} />
          {li < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

function InlineMd({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  // Regex: **bold**, *italic*, `code`
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<strong key={key++} className="font-semibold">{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(<em key={key++}>{m[2]}</em>);
    else if (m[3] !== undefined) parts.push(
      <code key={key++} className="font-mono text-tiny bg-black/5 px-1 rounded">{m[3]}</code>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TesterNotesPage() {
  const { isDev, isAdmin, isTester, isLoggedIn, loading, user } = useUser();
  const router = useRouter();

  const [notes, setNotes]               = useState<TesterNote[]>([]);
  const [fetching, setFetching]         = useState(true);
  const [typeFilter, setTypeFilter]     = useState<typeof TYPE_FILTERS[number]>("all");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [updatingId, setUpdatingId]     = useState<string | null>(null);
  const [editing, setEditing]           = useState<EditState>(null);
  const [saving, setSaving]             = useState(false);
  // which rows have fix-notes panel open
  const [expandedFix, setExpandedFix]   = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canManage = isDev || isAdmin;

  // --- Auth guard ---
  useEffect(() => {
    if (!loading && !isDev && !isAdmin && !isTester) router.replace("/trips");
  }, [loading, isDev, isAdmin, isTester, router]);

  // --- Fetch ---
  useEffect(() => {
    if (loading || (!isDev && !isAdmin && !isTester)) return;
    fetch("/api/tester-notes")
      .then((r) => r.json())
      .then(({ data }) => setNotes(Array.isArray(data) ? data : []))
      .finally(() => setFetching(false));
  }, [loading, isDev, isAdmin, isTester]);

  // --- Focus textarea on edit start ---
  useEffect(() => {
    if (editing) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [editing]);

  // --- Actions ---
  const updateStatus = useCallback(async (id: string, status: FeedbackStatus) => {
    setUpdatingId(id);
    try {
      await fetch(`/api/tester-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, status } : n));
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const startEdit = useCallback((id: string, field: "note" | "fix_notes", value: string) => {
    setEditing({ id, field, value });
  }, []);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tester-notes/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editing.field]: editing.value }),
      });
      if (res.ok) {
        setNotes((prev) =>
          prev.map((n) => n.id === editing.id ? { ...n, [editing.field]: editing.value } : n)
        );
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  }, [editing]);

  const toggleFix = useCallback((id: string) => {
    setExpandedFix((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // --- Filter ---
  const filtered = notes.filter((n) => {
    if (!showArchived && n.status === "archived") return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    return true;
  });

  const countByStatus  = (s: FeedbackStatus) => notes.filter((n) => n.status === s).length;
  const archivedCount  = notes.filter((n) => n.status === "archived").length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        isLoggedIn={isLoggedIn}
        initials={user?.initials ?? ""}
        avatarUrl={user?.avatarUrl ?? ""}
        fullName={user?.fullName ?? ""}
      />

      <main className="flex-1 max-w-[1100px] mx-auto w-full px-5 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-ink">
            {canManage ? "Tester feedback" : "My feedback"}
          </h1>
          <p className="text-meta text-ink-soft mt-1">
            {canManage
              ? "Reports and suggestions from testers."
              : "Your reports and suggestions."}
          </p>
        </div>

        {/* Toolbar — solo admin/dev */}
        {canManage && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">

            {/* Type filter */}
            <div className="flex items-center gap-1">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  title={f === "all" ? "All types" : TYPE_META[f].label}
                  onClick={() => setTypeFilter(f)}
                  className={cn(
                    "inline-flex items-center justify-center w-7 h-7 rounded-lg border text-mini transition-colors cursor-pointer",
                    typeFilter === f
                      ? "bg-ink text-white border-ink"
                      : "bg-transparent border-border text-ink-soft hover:border-border-strong hover:text-ink",
                  )}
                >
                  {f === "all"
                    ? <span className="text-micro font-medium leading-none">All</span>
                    : <span className={typeFilter === f ? "text-white" : TYPE_META[f].iconClass}>{TYPE_META[f].icon}</span>
                  }
                </button>
              ))}
            </div>

            <span className="w-px h-4 bg-border shrink-0" />

            {/* Status filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <FilterPill
                size="sm"
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </FilterPill>
              {FILTER_STATUSES.map((s) => {
                const count = countByStatus(s);
                const meta  = STATUS_META[s];
                const isActive = statusFilter === s;
                return (
                  <FilterPill
                    key={s}
                    size="sm"
                    active={isActive}
                    onClick={() => setStatusFilter(s)}
                    className={cn(!isActive && meta.pillClass)}
                  >
                    <span className={isActive ? "text-white" : ""}>{meta.icon}</span>
                    {meta.label}
                    {count > 0 && (
                      <span className={cn(
                        "text-micro px-1 rounded-full",
                        isActive ? "bg-white/20 text-white" : "bg-white/60 text-ink-faint",
                      )}>
                        {count}
                      </span>
                    )}
                  </FilterPill>
                );
              })}
            </div>

            {/* Archived toggle */}
            {archivedCount > 0 && (
              <FilterPill
                size="sm"
                active={showArchived}
                onClick={() => setShowArchived((v) => !v)}
                className="ml-auto"
              >
                <IconArchive size={11} />
                {showArchived ? "Hide archived" : `${archivedCount} archived`}
              </FilterPill>
            )}
          </div>
        )}

        {fetching && <div className="text-meta text-ink-faint">Loading…</div>}
        {!fetching && filtered.length === 0 && (
          <div className="text-meta text-ink-faint">No feedback found.</div>
        )}

        {/* Notes list */}
        <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
          {filtered.map((note) => {
            const typeMeta      = TYPE_META[note.type];
            const statusMeta    = STATUS_META[note.status] ?? STATUS_META.proposed;
            const isAuthor      = user?.id === note.user_id;
            const isEditingNote = editing?.id === note.id && editing.field === "note";
            const isEditingFix  = editing?.id === note.id && editing.field === "fix_notes";
            const fixOpen       = expandedFix.has(note.id);
            const hasFix        = !!note.fix_notes;

            return (
              <div
                key={note.id}
                className={cn(
                  "group/row flex flex-col px-4 py-3 bg-surface hover:bg-surface-soft transition-colors",
                  note.status === "archived" && "opacity-40",
                )}
              >
                {/* Main row */}
                <div className="flex items-start gap-3">

                  {/* Type icon — allineato alla prima riga di testo */}
                  <span className={cn("shrink-0 mt-[3px]", typeMeta.iconClass)} title={typeMeta.label}>
                    {typeMeta.icon}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">

                    {/* Prima riga: data | autore (sx) — status (dx) */}
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-tiny text-ink-faint whitespace-nowrap shrink-0">
                          {fmt(note.created_at)}
                        </span>
                        {canManage && (
                          <>
                            <span className="text-micro text-ink-faint/40 shrink-0">|</span>
                            <span className="text-tiny text-ink-soft font-medium truncate">
                              {note.author_name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        {canManage ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={note.status}
                              disabled={updatingId === note.id}
                              onChange={(e) => updateStatus(note.id, e.target.value as FeedbackStatus)}
                              className={cn(
                                "appearance-none text-tiny font-medium pl-[22px] pr-5 py-0.5 rounded-pill border cursor-pointer transition-colors disabled:opacity-50",
                                statusMeta.pillClass,
                              )}
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{STATUS_META[s].label}</option>
                              ))}
                            </select>
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              {statusMeta.icon}
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                              className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </div>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-tiny font-medium px-2 py-0.5 rounded-pill border",
                            statusMeta.pillClass,
                          )}>
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Testo nota — editabile dall'autore */}
                    {isEditingNote ? (
                      <EditBlock
                        textareaRef={textareaRef}
                        value={editing.value}
                        onChange={(v) => setEditing((p) => p ? { ...p, value: v } : null)}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                        rows={3}
                        className="text-[15px]"
                      />
                    ) : (
                      <div className="group/note flex items-start gap-1.5">
                        <p className="text-[15px] text-ink leading-snug flex-1">{note.note}</p>
                        {(isAuthor || canManage) && !editing && (
                          <button
                            type="button"
                            title="Edit note"
                            onClick={() => startEdit(note.id, "note", note.note)}
                            className="shrink-0 opacity-30 hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded text-ink-faint hover:text-ink cursor-pointer mt-0.5"
                          >
                            <IconPencil size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions row: page button · dev note toggle */}
                    {!isEditingNote && (note.page_url || hasFix || canManage) && (
                      <div className="flex items-center gap-2 mt-1.5">

                        {/* URL → bottone "Page" */}
                        {note.page_url && (
                          <a
                            href={note.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={note.page_url}
                            className="inline-flex items-center gap-1 text-tiny px-2 py-0.5 rounded-pill border border-border text-ink-soft hover:text-ink hover:border-border-strong transition-colors"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5 opacity-60">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            Page
                          </a>
                        )}

                        {/* Dev note toggle — solo se fix_notes esiste */}
                        {hasFix && (
                          <button
                            type="button"
                            onClick={() => toggleFix(note.id)}
                            className={cn(
                              "inline-flex items-center gap-1 text-tiny px-2 py-0.5 rounded-pill border transition-colors cursor-pointer",
                              fixOpen
                                ? "text-amber-600 border-amber-300 bg-amber-50"
                                : "text-amber-500 border-amber-200 hover:border-amber-300 hover:text-amber-600",
                            )}
                          >
                            <IconTools size={11} />
                            {fixOpen ? "Hide dev note" : "Dev note"}
                          </button>
                        )}

                        {/* Add dev note — admin, solo su hover, solo se non esiste */}
                        {canManage && !hasFix && !editing && (
                          <button
                            type="button"
                            onClick={() => { setExpandedFix((p) => { const n = new Set(p); n.add(note.id); return n; }); }}
                            className="inline-flex items-center gap-1 text-tiny text-ink-faint hover:text-ink-soft focus:text-ink-soft transition-colors cursor-pointer opacity-30 hover:opacity-100 focus:opacity-100 py-1 px-1"
                          >
                            <IconTools size={11} />
                            + Dev note
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fix notes panel — on demand */}
                {fixOpen && !isEditingNote && (
                  <div className="ml-5 mt-2.5">
                    {isEditingFix ? (
                      <EditBlock
                        textareaRef={textareaRef}
                        value={editing.value}
                        onChange={(v) => setEditing((p) => p ? { ...p, value: v } : null)}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                        rows={3}
                        placeholder="Developer note… supports **bold**, *italic*, `code`"
                        className="text-mini border-amber-200 bg-amber-50/30 focus:border-amber-300"
                      />
                    ) : hasFix ? (
                      <div className="group/fix flex items-start gap-2 bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2.5">
                        <IconTools size={12} className="shrink-0 mt-0.5 text-amber-500" />
                        <p className="text-mini text-ink-soft leading-relaxed flex-1">
                          <MarkdownText text={note.fix_notes!} />
                        </p>
                        {canManage && !editing && (
                          <button
                            type="button"
                            title="Edit dev note"
                            onClick={() => startEdit(note.id, "fix_notes", note.fix_notes ?? "")}
                            className="shrink-0 opacity-30 hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded text-ink-faint hover:text-ink cursor-pointer"
                          >
                            <IconPencil size={14} />
                          </button>
                        )}
                      </div>
                    ) : canManage && !editing ? (
                      <div className="border border-dashed border-amber-200 rounded-lg px-3 py-2">
                        <EditBlock
                          textareaRef={textareaRef}
                          value=""
                          onChange={(v) => startEdit(note.id, "fix_notes", v)}
                          onSave={saveEdit}
                          onCancel={() => { cancelEdit(); toggleFix(note.id); }}
                          saving={saving}
                          rows={2}
                          placeholder="Developer note… supports **bold**, *italic*, `code`"
                          className="text-mini border-amber-200 bg-amber-50/20 focus:border-amber-300"
                          autoStart
                          onAutoStart={(v) => setEditing({ id: note.id, field: "fix_notes", value: v })}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditBlock — textarea con save/cancel riusabile
// ---------------------------------------------------------------------------

function EditBlock({
  textareaRef,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  rows = 3,
  placeholder,
  className = "",
  autoStart = false,
  onAutoStart,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  autoStart?: boolean;
  onAutoStart?: (v: string) => void;
}) {
  // Per il caso autoStart: apre il focus e segnala il valore iniziale
  const initialized = useRef(false);
  useEffect(() => {
    if (autoStart && !initialized.current) {
      initialized.current = true;
      onAutoStart?.("");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [autoStart, onAutoStart, textareaRef]);

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave();
        }}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          "w-full leading-snug border rounded-lg px-3 py-2 bg-bg resize-none focus:outline-none",
          className,
        )}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={saving || !value.trim()}
          onClick={onSave}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-tiny font-medium bg-ink text-white border border-ink disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <IconCheck size={11} />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-tiny border border-border text-ink-soft cursor-pointer hover:text-ink transition-colors"
        >
          <IconX size={11} />
          Cancel
        </button>
        <span className="text-micro text-ink-faint ml-1">⌘↵ to save</span>
      </div>
    </div>
  );
}
