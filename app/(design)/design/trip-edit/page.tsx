"use client";

/**
 * Trip Edit · design sketch
 *
 * Pagina dedicata alla modifica delle impostazioni del viaggio,
 * raggiunta da "Edit" sulla trip home. Layout two-pane:
 *
 *   - Sidebar sx (5 voci, con preview): Luogo (locked) · Date · Viaggiatori ·
 *     Inviti · Tono.
 *   - Pannello dx con l'editor della voce selezionata.
 *
 * Riusa i controlli del CreateTripForm: DatePickerField (mode="range"),
 * stepper adulti/bambini, theme chips, textarea themeNote.
 *
 * Sezione "Inviti" — è la stanza dedicata a invitare via email,
 * gestire ruoli e inviti pending (`trip_members` + `trip_invites`).
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { DatePickerField, type DateRange } from "@/components/ui/DatePickerField";
import {
  IconCheck,
  IconChevronLeft,
  IconInfoCircle,
  IconLink,
  IconLock,
  IconMail,
  IconMapPin,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconX,
} from "@/components/ui/icons";

/* ─────────────────────────────────────────────────────────────────
   Types and mock data
───────────────────────────────────────────────────────────────── */

type SectionId = "place" | "dates" | "travelers" | "invites" | "theme";

const THEMES = [
  "Nature", "Food", "Culture", "Sport",
  "Relax", "Family", "Spiritual", "Off-the-beaten",
] as const;

type Role = "owner" | "editor" | "viewer";
type Member = { id: string; name: string; email: string; initials: string; color: string; role: Role; joinedAt: string; self?: boolean };
type Invite = { id: string; email: string; role: "editor" | "viewer"; sentAt: string };

const INITIAL_MEMBERS: Member[] = [
  { id: "m1", name: "Enrico Del Greco", email: "enrico.delgreco@gmail.com", initials: "ED", color: "#0d2c3d", role: "owner", joinedAt: "12 maggio", self: true },
  { id: "m2", name: "Sara Romano", email: "sara.romano@example.com", initials: "SR", color: "#6d8a45", role: "editor", joinedAt: "14 maggio" },
];

const INITIAL_INVITES: Invite[] = [
  { id: "i1", email: "luca.bianchi@example.com", role: "viewer", sentAt: "20 maggio" },
];

/* ─────────────────────────────────────────────────────────────────
   Mock sub-header (back + crumb + save)
───────────────────────────────────────────────────────────────── */

function EditHeader() {
  return (
    <header className="bg-surface border-b border-border px-5 py-2.5 flex items-center gap-3">
      <a href="#" className="inline-flex items-center gap-1 text-tiny text-ink-faint hover:text-ink no-underline">
        <IconChevronLeft size={14} /> Tokyo 2026
      </a>
      <span className="text-tiny text-ink-muted">/</span>
      <span className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium">Modifica viaggio</span>
      <a href="#" className="ml-auto text-mini text-ink-faint hover:text-ink underline decoration-ink/20 px-2 py-1.5">
        Annulla
      </a>
      <button
        type="button"
        className="bg-orange hover:bg-orange-deep text-white border-0 px-4 py-1.5 rounded-pill text-mini font-medium inline-flex items-center gap-1.5 transition-colors"
      >
        <IconCheck size={13} /> Salva
      </button>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────────────────────────── */

type SidebarItem = {
  id: SectionId;
  label: string;
  preview: string;
  locked?: boolean;
};

function Sidebar({
  active,
  onSelect,
  items,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  items: SidebarItem[];
}) {
  return (
    <aside className="bg-surface-soft border-r border-border px-3 py-5">
      <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium px-3 mb-3.5">Modifica</p>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.locked && onSelect(item.id)}
              disabled={item.locked}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "relative flex items-start gap-2 px-3 py-2.5 text-left transition-colors rounded-md",
                isActive && "bg-surface my-0.5",
                !isActive && !item.locked && "hover:bg-surface/60 cursor-pointer",
                item.locked && "opacity-55 cursor-not-allowed",
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-1.5 h-[30px] bg-orange rounded-[3px]"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-mini font-medium m-0",
                  item.locked ? "text-ink-muted" : "text-ink",
                )}>
                  {item.label}
                </p>
                <p className="font-serif italic text-[10.5px] leading-snug mt-0.5 text-ink-muted">
                  {item.preview}
                </p>
              </div>
              {item.locked && <IconLock size={10} className="text-ink-muted shrink-0 mt-1" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 px-3 pt-3.5 border-t border-dashed border-border-strong/40">
        <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium mb-1.5">Anteprima</p>
        <p className="font-serif italic text-mini text-ink-soft leading-snug m-0">
          <b className="not-italic font-medium text-ink">Tokyo</b><br />
          27 lug → 5 ago<br />
          9 notti · 2 adulti
        </p>
        <p className="font-serif italic text-tiny text-orange-deep mt-2">Countdown: 63 giorni</p>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Section header (titolo + descrizione, riutilizzato nei pannelli)
───────────────────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <>
      <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium m-0">{eyebrow}</p>
      <h2 className="font-serif italic text-[22px] text-ink font-medium leading-tight m-0 mt-1">{title}</h2>
      <p className="font-serif italic text-meta text-ink-faint mt-1">{sub}</p>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PLACE pane (locked)
───────────────────────────────────────────────────────────────── */

function PlacePane() {
  return (
    <div>
      <SectionHeader
        eyebrow="Sezione · luogo"
        title="Il posto da cui tutto nasce."
        sub="Il luogo del viaggio non si modifica: ogni viaggio nasce da un posto."
      />
      <div className="mt-5 bg-ink/[0.04] border border-dashed border-border-strong rounded-md px-4 py-4 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-surface text-orange-deep border border-border inline-flex items-center justify-center shrink-0">
          <IconMapPin size={16} />
        </span>
        <div className="flex-1">
          <p className="text-[9px] tracking-meta uppercase text-ink-muted font-medium m-0">Luogo</p>
          <p className="font-serif italic text-[17px] text-ink font-medium mt-0.5">Tokyo, Giappone</p>
          <p className="font-serif italic text-tiny text-ink-muted mt-1">
            Se vuoi un'altra destinazione, <a href="#" className="text-orange-deep underline">apri un nuovo viaggio →</a>
          </p>
        </div>
        <IconLock size={13} className="text-ink-muted" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DATES pane
───────────────────────────────────────────────────────────────── */

function DatesPane() {
  const [dates, setDates] = useState<DateRange>({
    start: new Date(2026, 6, 27),
    end: new Date(2026, 7, 5),
  });
  const nights =
    dates.start && dates.end
      ? Math.round((dates.end.getTime() - dates.start.getTime()) / 86_400_000)
      : 0;
  return (
    <div>
      <SectionHeader
        eyebrow="Sezione · le date"
        title="Da quando a quando."
        sub="Il countdown si aggiorna in tempo reale · Go ti riprogramma le tappe in corso."
      />
      <div className="mt-5">
        <DatePickerField mode="range" value={dates} onChange={setDates} fromDate={new Date()} />
      </div>
      {nights > 0 && (
        <p className="mt-3 font-serif italic text-mini text-ink-faint">
          {nights} {nights === 1 ? "notte" : "notti"} · countdown a 63 giorni dal decollo
        </p>
      )}

      <div className="mt-5 px-4 py-3 bg-orange/[0.08] rounded-md flex items-start gap-3">
        <IconSparkles size={16} className="text-orange-deep mt-0.5 shrink-0" />
        <p className="m-0 font-serif italic text-meta text-[#6d4923] leading-snug">
          <b className="not-italic font-medium text-orange-deep">Go nota · </b>
          spostando il rientro a sabato 8 ago avresti due notti in più per Kyoto. Vuoi che ti mostri?
        </p>
        <button
          type="button"
          className="bg-surface border border-orange/40 text-orange-deep px-3 py-1 rounded-pill text-tiny shrink-0"
        >
          Mostra
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TRAVELERS pane
───────────────────────────────────────────────────────────────── */

function TravelersPane() {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  return (
    <div>
      <SectionHeader
        eyebrow="Sezione · viaggiatori"
        title="Chi viene con te."
        sub="Quanti siete in totale · stanze, prezzi e attività si adattano."
      />
      <div className="mt-5 flex flex-col">
        <StepperRow
          label="Adulti"
          sub="dai 18 anni"
          value={adults}
          min={1}
          onChange={setAdults}
        />
        <StepperRow
          label="Bambini"
          sub="0 – 17 anni"
          value={children}
          min={0}
          onChange={setChildren}
        />
      </div>
    </div>
  );
}

function StepperRow({
  label,
  sub,
  value,
  min,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
      <div className="flex-1">
        <p className="text-[10px] tracking-meta uppercase text-ink-muted font-medium m-0">{label}</p>
        <p className="font-serif italic text-tiny text-ink-muted mt-0.5">{sub}</p>
      </div>
      <div className="inline-flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-full bg-surface border border-border-strong text-ink hover:border-ink transition-colors disabled:opacity-35 disabled:pointer-events-none text-meta"
        >
          −
        </button>
        <span className="font-serif italic text-[18px] text-ink font-medium min-w-6 text-center tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-full bg-surface border border-border-strong text-ink hover:border-ink transition-colors text-meta"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   INVITES pane
───────────────────────────────────────────────────────────────── */

function InvitesPane() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [invites, setInvites] = useState<Invite[]>(INITIAL_INVITES);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "viewer">("editor");
  const [linkOn, setLinkOn] = useState(false);

  const handleInvite = () => {
    if (!newEmail.trim()) return;
    setInvites((prev) => [
      ...prev,
      { id: `i${Date.now()}`, email: newEmail.trim(), role: newRole, sentAt: "ora" },
    ]);
    setNewEmail("");
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Sezione · inviti"
        title="Chi viaggia con te."
        sub="Condividi piano e modifiche con chi parte con te o ti dà una mano a organizzare."
      />

      <div className="mt-5">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[9px] tracking-eyebrow uppercase text-orange-deep font-medium">Sul viaggio</span>
          <span className="flex-1 h-px bg-border" />
          <span className="font-serif italic text-tiny text-ink-muted">
            {members.length} {members.length === 1 ? "persona" : "persone"} · {invites.length} {invites.length === 1 ? "invito" : "inviti"} pendenti
          </span>
        </div>

        <div className="flex flex-col">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} onChangeRole={(role) => {
              setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, role } : x));
            }} onRemove={() => {
              setMembers((prev) => prev.filter((x) => x.id !== m.id));
            }} />
          ))}
          {invites.map((inv) => (
            <InviteRow
              key={inv.id}
              invite={inv}
              onResend={() => { /* no-op */ }}
              onCancel={() => setInvites((prev) => prev.filter((x) => x.id !== inv.id))}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 bg-orange/[0.05] border border-dashed border-orange/30 rounded-md px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <IconSend size={16} className="text-orange-deep" />
          <h3 className="font-serif italic text-meta text-ink font-medium m-0">Invita qualcuno di nuovo</h3>
        </div>
        <p className="font-serif italic text-mini text-ink-faint m-0 mb-3.5">
          Riceverà un link via mail · se non ha l'account si registra in un click.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@esempio.com"
            className="bg-surface border border-border-strong rounded-md px-3 py-2.5 text-meta text-ink focus:outline focus:outline-2 focus:outline-orange/30 focus:border-orange"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "editor" | "viewer")}
            className="bg-surface border border-border-strong rounded-md px-3 py-2.5 text-mini text-ink focus:outline focus:outline-2 focus:outline-orange/30 focus:border-orange"
          >
            <option value="editor">Editor — può modificare</option>
            <option value="viewer">Viewer — solo lettura</option>
          </select>
          <button
            type="button"
            onClick={handleInvite}
            className="bg-ink hover:bg-ink/90 text-white border-0 px-4 py-2.5 rounded-md text-mini font-medium inline-flex items-center justify-center gap-1.5"
          >
            <IconSend size={13} /> Invita
          </button>
        </div>

        <div className="mt-3.5 pt-3 border-t border-dashed border-orange/30 flex items-center gap-3">
          <IconInfoCircle size={14} className="text-orange-deep shrink-0" />
          <p className="m-0 font-serif italic text-mini text-ink-faint leading-snug">
            Editor possono modificare itinerario, attività e impostazioni — tranne il luogo. Viewer vedono ma non toccano.
          </p>
        </div>
      </div>

      <div className="mt-5 bg-surface border border-border rounded-md px-4 py-3 flex items-center gap-3">
        <span className="w-[30px] h-[30px] rounded-full bg-ink/[0.05] text-ink-soft inline-flex items-center justify-center shrink-0">
          <IconLink size={14} />
        </span>
        <div className="flex-1">
          <p className="text-mini text-ink font-medium m-0">Link di lettura del viaggio</p>
          <p className="font-serif italic text-tiny text-ink-muted mt-0.5">
            Chiunque abbia il link può vedere il piano · {linkOn ? "attivo" : "disattivato"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLinkOn((v) => !v)}
          className={cn(
            "relative inline-flex w-9 h-5 rounded-pill transition-colors",
            linkOn ? "bg-orange" : "bg-ink/15",
          )}
          aria-pressed={linkOn}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
              linkOn ? "translate-x-[18px]" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}

function RolePill({ role }: { role: Role | "pending" }) {
  const map: Record<Role | "pending", { bg: string; fg: string; label: string }> = {
    owner:   { bg: "bg-ink",                fg: "text-white",       label: "Owner" },
    editor:  { bg: "bg-orange/15",          fg: "text-orange-deep", label: "Editor" },
    viewer:  { bg: "bg-ink/[0.06]",         fg: "text-ink-soft",    label: "Viewer" },
    pending: { bg: "bg-surface border border-dashed border-border-strong", fg: "text-ink-muted", label: "Pending" },
  };
  const cfg = map[role];
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-pill tracking-[0.06em] uppercase font-medium", cfg.bg, cfg.fg)}>
      {cfg.label}
    </span>
  );
}

function MemberRow({
  member,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  onChangeRole: (role: Role) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <span
        className="w-8 h-8 rounded-full text-white text-tiny font-medium inline-flex items-center justify-center shrink-0"
        style={{ background: member.color }}
      >
        {member.initials}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-meta text-ink font-medium m-0">
          {member.name}{" "}
          {member.self && (
            <span className="font-serif italic text-ink-muted font-normal">· tu</span>
          )}
        </p>
        <p className="text-tiny text-ink-muted m-0 mt-0.5">
          {member.email} · entrato il {member.joinedAt}
        </p>
      </div>
      {member.role === "owner" ? (
        <RolePill role="owner" />
      ) : (
        <>
          <select
            value={member.role}
            onChange={(e) => onChangeRole(e.target.value as Role)}
            className="bg-surface border border-border-strong rounded-md px-2.5 py-1 text-tiny text-ink"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="button"
            onClick={onRemove}
            className="text-ink-muted hover:text-ink p-1.5 rounded-full"
            title="Rimuovi"
          >
            <IconX size={14} />
          </button>
        </>
      )}
    </div>
  );
}

function InviteRow({
  invite,
  onResend,
  onCancel,
}: {
  invite: Invite;
  onResend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <span className="w-8 h-8 rounded-full bg-ink/15 text-ink-soft inline-flex items-center justify-center shrink-0">
        <IconMail size={13} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-meta text-ink-soft m-0">{invite.email}</p>
        <p className="font-serif italic text-tiny text-ink-muted m-0 mt-0.5">
          invito spedito il {invite.sentAt} · in attesa di accettazione
        </p>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-pill tracking-[0.06em] uppercase font-medium bg-surface border border-dashed border-border-strong text-ink-muted">
        Pending · {invite.role}
      </span>
      <button
        type="button"
        onClick={onResend}
        className="bg-surface border border-border-strong text-ink-faint px-3 py-1 rounded-pill text-[10px] inline-flex items-center gap-1 hover:text-ink"
      >
        <IconRefresh size={11} /> Reinvia
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-ink-muted hover:text-ink p-1.5 rounded-full"
        title="Annulla invito"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   THEME pane
───────────────────────────────────────────────────────────────── */

function ThemePane() {
  const [themes, setThemes] = useState<string[]>(["Food", "Culture"]);
  const [note, setNote] = useState(
    "Lento, niente sveglie all'alba. Ci piace mangiare bene, perderci nei mercati, una sera di onsen e tanti vicoli.",
  );

  const toggle = (t: string) => {
    setThemes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Sezione · tono del viaggio"
        title="Come vuoi viverlo."
        sub="Scegli i temi che ti somigliano · racconta in poche righe come vorresti viverlo."
      />

      <div className="flex flex-wrap gap-1.5 mt-5 mb-3.5">
        {THEMES.map((t) => {
          const on = themes.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                "text-mini px-3.5 py-1.5 rounded-pill border transition-colors font-medium",
                on
                  ? "bg-ink text-white border-ink"
                  : "bg-surface border-border-strong text-ink-soft hover:border-ink-soft",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Describe your ideal trip — anything Go should know…"
        className={cn(
          "w-full resize-none rounded-md bg-surface border border-border-strong px-3.5 py-3",
          "font-serif italic text-meta text-ink placeholder:text-ink-faint leading-snug",
          "focus:outline focus:outline-2 focus:outline-orange/30 focus:border-orange transition-colors",
        )}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page · puts it all together
───────────────────────────────────────────────────────────────── */

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "place",     label: "Luogo",       preview: "Tokyo, Giappone",          locked: true },
  { id: "dates",     label: "Date",        preview: "27 lug → 5 ago · 9 notti" },
  { id: "travelers", label: "Viaggiatori", preview: "2 adulti" },
  { id: "invites",   label: "Inviti",      preview: "1 attivo · 1 in attesa" },
  { id: "theme",     label: "Tono",        preview: "Cultura · Cibo · «lento, niente sveglie…»" },
];

export default function TripEditSketch() {
  const [section, setSection] = useState<SectionId>("invites");

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <EditHeader />

      <main className="max-w-[900px] mx-auto w-full px-6 py-6">
        <div className="bg-surface border border-border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-[215px_1fr] min-h-[560px]">
          <Sidebar active={section} onSelect={setSection} items={SIDEBAR_ITEMS} />
          <div className="p-7 md:p-8">
            {section === "place"     && <PlacePane />}
            {section === "dates"     && <DatesPane />}
            {section === "travelers" && <TravelersPane />}
            {section === "invites"   && <InvitesPane />}
            {section === "theme"     && <ThemePane />}
          </div>
        </div>
      </main>
    </div>
  );
}
