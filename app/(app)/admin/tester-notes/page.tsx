"use client";

import { useEffect, useState, useCallback } from "react";
import { AppHeader } from "@/features/app/AppHeader";
import { useUser } from "@/features/app/UserContext";
import { useRouter } from "next/navigation";
import {
  IconBug, IconBulb, IconMessage,
  IconCircleDashed, IconThumbUp, IconHourglass, IconCircleCheck, IconArchive,
} from "@/components/ui/icons";

type FeedbackStatus = "proposed" | "approved" | "in_progress" | "done" | "archived";

type TesterNote = {
  id: string;
  type: "bug" | "suggestion" | "other";
  note: string;
  page_url: string | null;
  trip_id: string | null;
  user_id: string;
  author_name: string;
  created_at: string;
  status: FeedbackStatus;
};

const TYPE_META = {
  bug:        { icon: <IconBug size={14} />,     label: "Bug",        iconClass: "text-red-500" },
  suggestion: { icon: <IconBulb size={14} />,    label: "Suggestion", iconClass: "text-amber-500" },
  other:      { icon: <IconMessage size={14} />, label: "Other",      iconClass: "text-ink-soft" },
};

const STATUS_META: Record<FeedbackStatus, {
  label: string;
  icon: React.ReactNode;
  pillClass: string;
  optionClass: string;
}> = {
  proposed:    {
    label: "Proposed",
    icon: <IconCircleDashed size={13} />,
    pillClass: "text-ink-soft border-border bg-surface-soft",
    optionClass: "text-ink-soft",
  },
  approved:    {
    label: "Approved",
    icon: <IconThumbUp size={13} />,
    pillClass: "text-blue-600 border-blue-200 bg-blue-50",
    optionClass: "text-blue-600",
  },
  in_progress: {
    label: "In progress",
    icon: <IconHourglass size={13} />,
    pillClass: "text-amber-600 border-amber-200 bg-amber-50",
    optionClass: "text-amber-600",
  },
  done:        {
    label: "Done",
    icon: <IconCircleCheck size={13} />,
    pillClass: "text-green-600 border-green-200 bg-green-50",
    optionClass: "text-green-600",
  },
  archived:    {
    label: "Archived",
    icon: <IconArchive size={13} />,
    pillClass: "text-ink-faint border-border bg-surface",
    optionClass: "text-ink-faint",
  },
};

const ALL_STATUSES: FeedbackStatus[] = ["proposed", "approved", "in_progress", "done", "archived"];
const TYPE_FILTERS = ["all", "bug", "suggestion", "other"] as const;

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function TesterNotesPage() {
  const { isDev, isAdmin, isLoggedIn, loading, user } = useUser();
  const router = useRouter();
  const [notes, setNotes] = useState<TesterNote[]>([]);
  const [fetching, setFetching] = useState(true);
  const [typeFilter, setTypeFilter] = useState<typeof TYPE_FILTERS[number]>("all");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isDev && !isAdmin) router.replace("/trips");
  }, [loading, isDev, isAdmin, router]);

  useEffect(() => {
    if (loading || (!isDev && !isAdmin)) return;
    fetch("/api/tester-notes")
      .then((r) => r.json())
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .finally(() => setFetching(false));
  }, [loading, isDev, isAdmin]);

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

  const filtered = notes.filter((n) => {
    if (!showArchived && n.status === "archived") return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    return true;
  });

  const countByStatus = (s: FeedbackStatus) => notes.filter((n) => n.status === s).length;
  const archivedCount = notes.filter((n) => n.status === "archived").length;

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader
        activeNav="trips"
        isLoggedIn={isLoggedIn}
        initials={user?.initials ?? ""}
        avatarUrl={user?.avatarUrl ?? ""}
        fullName={user?.fullName ?? ""}
      />

      <main className="flex-1 max-w-[860px] mx-auto w-full px-5 py-10">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-ink">Tester feedback</h1>
          <p className="text-[13px] text-ink-soft mt-1">Reports and suggestions from testers.</p>
        </div>

        {/* Toolbar filtri */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">

          {/* Tipo */}
          <div className="flex items-center gap-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                title={f === "all" ? "All types" : TYPE_META[f].label}
                onClick={() => setTypeFilter(f)}
                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-[12px] transition-colors cursor-pointer ${
                  typeFilter === f
                    ? "bg-ink text-white border-ink"
                    : "bg-transparent border-border text-ink-soft hover:border-border-strong hover:text-ink"
                }`}
              >
                {f === "all"
                  ? <span className="text-[10px] font-medium leading-none">All</span>
                  : <span className={typeFilter === f ? "text-white" : TYPE_META[f].iconClass}>{TYPE_META[f].icon}</span>
                }
              </button>
            ))}
          </div>

          <span className="w-px h-4 bg-border shrink-0" />

          {/* Stato */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="All statuses"
              onClick={() => setStatusFilter("all")}
              className={`inline-flex items-center px-2.5 py-1 rounded-pill text-[11px] border transition-colors cursor-pointer font-sans ${
                statusFilter === "all"
                  ? "bg-ink text-white border-ink font-medium"
                  : "bg-transparent border-border text-ink-soft hover:border-border-strong hover:text-ink"
              }`}
            >
              All
            </button>
            {(["proposed", "approved", "in_progress", "done"] as FeedbackStatus[]).map((s) => {
              const count = countByStatus(s);
              const meta = STATUS_META[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] border transition-colors cursor-pointer font-sans ${
                    statusFilter === s
                      ? "bg-ink text-white border-ink font-medium"
                      : `bg-transparent ${meta.pillClass} hover:opacity-80`
                  }`}
                >
                  <span className={statusFilter === s ? "text-white" : ""}>{meta.icon}</span>
                  {meta.label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1 rounded-full ${
                      statusFilter === s ? "bg-white/20 text-white" : "bg-white/60 text-ink-faint"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Toggle archived */}
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] border transition-colors cursor-pointer font-sans ml-auto ${
                showArchived
                  ? "bg-ink text-white border-ink font-medium"
                  : "bg-transparent border-border text-ink-faint hover:border-border-strong hover:text-ink-soft"
              }`}
            >
              <IconArchive size={11} />
              {showArchived ? "Hide archived" : `${archivedCount} archived`}
            </button>
          )}
        </div>

        {fetching && <div className="text-[13px] text-ink-faint">Loading…</div>}
        {!fetching && filtered.length === 0 && (
          <div className="text-[13px] text-ink-faint">No feedback found.</div>
        )}

        {/* Lista compatta */}
        <div className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
          {filtered.map((note) => {
            const typeMeta = TYPE_META[note.type];
            const statusMeta = STATUS_META[note.status];
            return (
              <div
                key={note.id}
                className={`flex items-start gap-3 px-4 py-3 bg-surface hover:bg-surface-soft transition-colors ${
                  note.status === "archived" ? "opacity-40" : ""
                }`}
              >
                {/* Icona tipo */}
                <span
                  className={`shrink-0 mt-0.5 ${typeMeta.iconClass}`}
                  title={typeMeta.label}
                >
                  {typeMeta.icon}
                </span>

                {/* Contenuto */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink leading-snug">{note.note}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-ink-faint">{note.author_name}</span>
                    {note.page_url && (
                      <>
                        <span className="text-ink-faint text-[10px]">·</span>
                        <a
                          href={note.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-orange hover:underline truncate"
                        >
                          {note.page_url}
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Destra: stato + data */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <span className="text-[11px] text-ink-faint whitespace-nowrap">{fmt(note.created_at)}</span>

                  {/* Status select */}
                  <div className="relative inline-flex items-center">
                    <select
                      value={note.status}
                      disabled={updatingId === note.id}
                      onChange={(e) => updateStatus(note.id, e.target.value as FeedbackStatus)}
                      className={`appearance-none text-[11px] font-medium pl-[22px] pr-5 py-0.5 rounded-pill border cursor-pointer transition-colors ${statusMeta.pillClass} disabled:opacity-50`}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>
                    {/* Icona stato sovrapposta a sinistra */}
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {statusMeta.icon}
                    </span>
                    {/* Chevron a destra */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
