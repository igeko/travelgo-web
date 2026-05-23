"use client";

/**
 * TripEdit — trip settings editor shown on the Trip Home when edit mode is on.
 *
 * Same container chrome as DayEditForm (header bar + section panes + a single
 * footer that exposes Cancel / Save), but the section menu stays on the LEFT.
 * Trip-field sections (dates, travelers, theme) are plain controlled editors;
 * the footer Save collects every change into one PATCH. Invites act on the
 * server immediately (list operations), independent of the footer.
 *
 * Reuses the app's input primitives (DatePickerField, SoftField, Button) — no
 * new input components.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { api, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/Button";
import { DatePickerField, type DateRange } from "@/components/ui/DatePickerField";
import { SoftField } from "@/components/ui/SoftField";
import { IconInfoCircle, IconLock, IconMail, IconMapPin, IconSend, IconX } from "@/components/ui/icons";
import type { DbTrip } from "@/lib/dal/types";
import type { UpdateTripPayload } from "@/lib/client/trips";
import { parseAirport, cleanAirport, type TripAirport } from "@/lib/trip-home/airports";

type SectionId = "place" | "dates" | "airports" | "travelers" | "invites" | "theme";

const THEMES = [
  "Nature", "Food", "Culture", "Sport",
  "Relax", "Family", "Spiritual", "Off-the-beaten",
];

type TripFacts = Pick<
  DbTrip,
  "title" | "start_date" | "end_date" | "adults_count" | "children_count"
  | "theme_tags" | "theme_description" | "departure_airport" | "arrival_airport"
>;

type Member = Awaited<ReturnType<typeof api.trips.members>>[number];
type Invite = Awaited<ReturnType<typeof api.trips.invites>>[number];

// ── ISO <-> Date (local, tz-safe) ─────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromIso(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function sameAirport(a: TripAirport | null, b: TripAirport | null): boolean {
  if (a === null || b === null) return a === b;
  return a.city === b.city && a.iata === b.iata;
}

function airportsPreview(depIata: string, arrIata: string): string {
  const dep = depIata.trim().toUpperCase();
  const arr = arrIata.trim().toUpperCase();
  if (dep && arr) return `${dep} → ${arr}`;
  return dep || arr || "";
}

export function TripEdit({ tripId, trip, onClose }: { tripId: string; trip: TripFacts; onClose: () => void }) {
  const t = useTranslations("TripEdit");
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("dates");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // ── Field state (the footer Save diffs this against the initial values) ──
  const [dates, setDates] = useState<DateRange>({ start: fromIso(trip.start_date), end: fromIso(trip.end_date) });
  const [adults, setAdults] = useState(trip.adults_count ?? 2);
  const [kids, setKids] = useState(trip.children_count ?? 0);
  const [themes, setThemes] = useState<string[]>(trip.theme_tags ?? []);
  const [themeNote, setThemeNote] = useState(trip.theme_description ?? "");

  const initialDep = parseAirport(trip.departure_airport);
  const initialArr = parseAirport(trip.arrival_airport);
  const [depCity, setDepCity] = useState(initialDep?.city ?? "");
  const [depIata, setDepIata] = useState(initialDep?.iata ?? "");
  const [arrCity, setArrCity] = useState(initialArr?.city ?? "");
  const [arrIata, setArrIata] = useState(initialArr?.iata ?? "");

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([api.trips.members(tripId), api.trips.invites(tripId)])
      .then(([m, i]) => { if (active) { setMembers(m); setInvites(i); } })
      .catch(() => {/* leave empty on failure */});
    return () => { active = false; };
  }, [tripId]);

  const nights =
    dates.start && dates.end
      ? Math.max(0, Math.round((dates.end.getTime() - dates.start.getTime()) / 86_400_000))
      : 0;

  // Diff current field state against the persisted values.
  function buildPatch(): UpdateTripPayload {
    const patch: UpdateTripPayload = {};
    const startIso = dates.start ? toIso(dates.start) : null;
    const endIso = dates.end ? toIso(dates.end) : null;
    if (startIso !== trip.start_date) patch.start_date = startIso;
    if (endIso !== trip.end_date) patch.end_date = endIso;
    if (adults !== (trip.adults_count ?? 2)) patch.adults_count = adults;
    if (kids !== (trip.children_count ?? 0)) patch.children_count = kids;
    if (themes.join("|") !== (trip.theme_tags ?? []).join("|")) patch.theme_tags = themes;
    if (themeNote !== (trip.theme_description ?? "")) patch.theme_description = themeNote;

    const dep = cleanAirport(depCity, depIata);
    const arr = cleanAirport(arrCity, arrIata);
    if (!sameAirport(dep, initialDep)) patch.departure_airport = dep;
    if (!sameAirport(arr, initialArr)) patch.arrival_airport = arr;
    return patch;
  }

  async function handleSave() {
    setError(false);
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) { onClose(); return; }
    setSaving(true);
    try {
      await api.trips.update(tripId, patch);
      router.refresh();
      onClose();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  const items: { id: SectionId; label: string; preview: string; locked?: boolean }[] = [
    { id: "place", label: t("place.label"), preview: trip.title, locked: true },
    { id: "dates", label: t("dates.label"), preview: dates.start && dates.end ? t("dates.preview", { nights }) : t("notSet") },
    { id: "airports", label: t("airports.label"), preview: airportsPreview(depIata, arrIata) || t("notSet") },
    { id: "travelers", label: t("travelers.label"), preview: t("travelers.preview", { adults, children: kids }) },
    { id: "invites", label: t("invites.label"), preview: t("invites.preview", { members: members.length, invites: invites.length }) },
    { id: "theme", label: t("theme.label"), preview: themes.length ? themes.slice(0, 3).join(" · ") : t("notSet") },
  ];

  return (
    <div
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } }}
      className="bg-surface border border-border-strong rounded-lg overflow-hidden flex flex-col"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-baseline gap-2">
          <span className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium">{t("header")}</span>
          <span className="text-mini font-medium text-ink truncate">{trip.title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-ink-faint hover:bg-surface-soft hover:text-ink transition-colors"
          aria-label={t("close")}
        >
          <IconX className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Two-pane: menu (sx) + editor (dx) ── */}
      <div className="grid grid-cols-1 md:grid-cols-[215px_1fr] min-h-[460px]">
        <aside className="bg-surface-soft border-b md:border-b-0 md:border-r border-border px-3 py-5">
          <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium px-3 mb-3.5">{t("eyebrow")}</p>
          <nav className="flex flex-col gap-0.5">
            {items.map((item) => {
              const isActive = item.id === section;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.locked && setSection(item.id)}
                  disabled={item.locked}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative flex items-start gap-2 px-3 py-2.5 text-left rounded-md transition-colors",
                    isActive && "bg-surface my-0.5",
                    !isActive && !item.locked && "hover:bg-surface/60 cursor-pointer",
                    item.locked && "opacity-55 cursor-not-allowed",
                  )}
                >
                  {isActive && (
                    <span aria-hidden className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-1.5 h-[30px] bg-orange rounded-[3px]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-mini font-medium m-0", item.locked ? "text-ink-faint" : "text-ink")}>{item.label}</p>
                    <p className="font-serif italic text-[10.5px] leading-snug mt-0.5 text-ink-faint truncate">{item.preview}</p>
                  </div>
                  {item.locked && <IconLock size={10} className="text-ink-faint shrink-0 mt-1" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="p-6 md:p-7">
          {section === "place" && <PlacePane place={trip.title} />}
          {section === "dates" && <DatesPane dates={dates} setDates={setDates} nights={nights} />}
          {section === "airports" && (
            <AirportsPane
              depCity={depCity} setDepCity={setDepCity} depIata={depIata} setDepIata={setDepIata}
              arrCity={arrCity} setArrCity={setArrCity} arrIata={arrIata} setArrIata={setArrIata}
            />
          )}
          {section === "travelers" && (
            <TravelersPane adults={adults} setAdults={setAdults} kids={kids} setKids={setKids} />
          )}
          {section === "invites" && (
            <InvitesPane
              tripId={tripId}
              members={members} setMembers={setMembers}
              invites={invites} setInvites={setInvites}
            />
          )}
          {section === "theme" && (
            <ThemePane themes={themes} setThemes={setThemes} note={themeNote} setNote={setThemeNote} />
          )}
        </div>
      </div>

      {/* ── Single footer ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        {error ? <span className="text-mini text-danger-fg">{t("error")}</span> : <span />}
        <div className="flex items-center gap-2">
          <Button variant="text-only" iconOnly={false} onClick={onClose}>{t("cancel")}</Button>
          <Button variant="solid" tone="neutral" iconOnly={false} onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("saveTrip")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared bits ──────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mb-5">
      <p className="text-tiny tracking-eyebrow uppercase text-orange-deep font-medium m-0">{eyebrow}</p>
      <h2 className="font-serif italic text-[22px] text-ink font-medium leading-tight m-0 mt-1">{title}</h2>
      <p className="font-serif italic text-meta text-ink-faint mt-1">{sub}</p>
    </div>
  );
}

/* ── PLACE ─────────────────────────────────────────────────────────── */

function PlacePane({ place }: { place: string }) {
  const t = useTranslations("TripEdit");
  return (
    <div>
      <SectionHeader eyebrow={t("place.eyebrow")} title={t("place.title")} sub={t("place.sub")} />
      <div className="bg-ink/[0.04] border border-dashed border-border-strong rounded-md px-4 py-4 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-surface text-orange-deep border border-border inline-flex items-center justify-center shrink-0">
          <IconMapPin size={16} />
        </span>
        <div className="flex-1">
          <p className="text-micro tracking-meta uppercase text-ink-faint font-medium m-0">{t("place.label")}</p>
          <p className="font-serif italic text-[17px] text-ink font-medium mt-0.5">{place}</p>
          <p className="font-serif italic text-tiny text-ink-faint mt-1">{t("place.hint")}</p>
        </div>
        <IconLock size={13} className="text-ink-faint" />
      </div>
    </div>
  );
}

/* ── DATES ─────────────────────────────────────────────────────────── */

function DatesPane({ dates, setDates, nights }: { dates: DateRange; setDates: (r: DateRange) => void; nights: number }) {
  const t = useTranslations("TripEdit");
  return (
    <div>
      <SectionHeader eyebrow={t("dates.eyebrow")} title={t("dates.title")} sub={t("dates.sub")} />
      <DatePickerField mode="range" value={dates} onChange={setDates} fromDate={new Date()} />
      {nights > 0 && <p className="mt-3 font-serif italic text-mini text-ink-faint">{t("dates.nights", { nights })}</p>}
    </div>
  );
}

/* ── AIRPORTS ──────────────────────────────────────────────────────── */

function AirportsPane({
  depCity, setDepCity, depIata, setDepIata,
  arrCity, setArrCity, arrIata, setArrIata,
}: {
  depCity: string; setDepCity: (v: string) => void; depIata: string; setDepIata: (v: string) => void;
  arrCity: string; setArrCity: (v: string) => void; arrIata: string; setArrIata: (v: string) => void;
}) {
  const t = useTranslations("TripEdit");
  return (
    <div>
      <SectionHeader eyebrow={t("airports.eyebrow")} title={t("airports.title")} sub={t("airports.sub")} />
      <div className="flex flex-col gap-6">
        <AirportLeg
          legLabel={t("airports.departure")}
          city={depCity} setCity={setDepCity} iata={depIata} setIata={setDepIata}
          cityLabel={t("airports.city")} iataLabel={t("airports.code")}
          cityPlaceholder={t("airports.depCityPlaceholder")}
        />
        <AirportLeg
          legLabel={t("airports.arrival")}
          city={arrCity} setCity={setArrCity} iata={arrIata} setIata={setArrIata}
          cityLabel={t("airports.city")} iataLabel={t("airports.code")}
          cityPlaceholder={t("airports.arrCityPlaceholder")}
        />
      </div>
      <p className="mt-4 font-serif italic text-tiny text-ink-faint leading-snug">{t("airports.hint")}</p>
    </div>
  );
}

function AirportLeg({
  legLabel, city, setCity, iata, setIata, cityLabel, iataLabel, cityPlaceholder,
}: {
  legLabel: string;
  city: string; setCity: (v: string) => void;
  iata: string; setIata: (v: string) => void;
  cityLabel: string; iataLabel: string; cityPlaceholder: string;
}) {
  return (
    <div>
      <p className="text-micro tracking-eyebrow uppercase text-orange-deep font-medium mb-2">{legLabel}</p>
      <div className="grid grid-cols-[1fr_110px] gap-2">
        <SoftField label={cityLabel} value={city} onChange={setCity} placeholder={cityPlaceholder} hideCounter />
        <SoftField
          label={iataLabel}
          value={iata}
          onChange={(v) => setIata(v.toUpperCase().slice(0, 3))}
          placeholder="FCO"
          maxLength={3}
          hideCounter
        />
      </div>
    </div>
  );
}

/* ── TRAVELERS ─────────────────────────────────────────────────────── */

function TravelersPane({
  adults, setAdults, kids, setKids,
}: {
  adults: number; setAdults: (n: number) => void;
  kids: number; setKids: (n: number) => void;
}) {
  const t = useTranslations("TripEdit");
  return (
    <div>
      <SectionHeader eyebrow={t("travelers.eyebrow")} title={t("travelers.title")} sub={t("travelers.sub")} />
      <div className="flex flex-col">
        <StepperRow label={t("travelers.adults")} sub={t("travelers.adultsSub")} value={adults} min={1} onChange={setAdults} />
        <StepperRow label={t("travelers.children")} sub={t("travelers.childrenSub")} value={kids} min={0} onChange={setKids} />
      </div>
    </div>
  );
}

function StepperRow({
  label, sub, value, min, onChange,
}: {
  label: string; sub: string; value: number; min: number; onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
      <div className="flex-1">
        <p className="text-micro tracking-meta uppercase text-ink-faint font-medium m-0">{label}</p>
        <p className="font-serif italic text-tiny text-ink-faint mt-0.5">{sub}</p>
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

/* ── THEME ─────────────────────────────────────────────────────────── */

function ThemePane({
  themes, setThemes, note, setNote,
}: {
  themes: string[]; setThemes: (v: string[]) => void;
  note: string; setNote: (v: string) => void;
}) {
  const t = useTranslations("TripEdit");
  const toggle = (x: string) => setThemes(themes.includes(x) ? themes.filter((v) => v !== x) : [...themes, x]);
  return (
    <div>
      <SectionHeader eyebrow={t("theme.eyebrow")} title={t("theme.title")} sub={t("theme.sub")} />
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {THEMES.map((x) => {
          const on = themes.includes(x);
          return (
            <button
              key={x}
              type="button"
              onClick={() => toggle(x)}
              className={cn(
                "text-mini px-3.5 py-1.5 rounded-pill border transition-colors font-medium",
                on ? "bg-ink text-white border-ink" : "bg-surface border-border-strong text-ink-soft hover:border-ink-soft",
              )}
            >
              {x}
            </button>
          );
        })}
      </div>
      <SoftField multiline rows={3} value={note} onChange={setNote} placeholder={t("theme.notePlaceholder")} hideCounter />
    </div>
  );
}

/* ── INVITES ───────────────────────────────────────────────────────── */

function InvitesPane({
  tripId, members, setMembers, invites, setInvites,
}: {
  tripId: string;
  members: Member[]; setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  invites: Invite[]; setInvites: React.Dispatch<React.SetStateAction<Invite[]>>;
}) {
  const t = useTranslations("TripEdit");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  const invite = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const created = await api.trips.createInvite(tripId, { email: trimmed, role });
      setInvites((prev) => [...prev, created]);
      setEmail("");
    } catch (err) {
      if (!(err instanceof ApiClientError)) throw err;
    } finally {
      setBusy(false);
    }
  }, [email, role, busy, tripId, setInvites]);

  return (
    <div>
      <SectionHeader eyebrow={t("invites.eyebrow")} title={t("invites.title")} sub={t("invites.sub")} />

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-micro tracking-eyebrow uppercase text-orange-deep font-medium">{t("invites.onTrip")}</span>
        <span className="flex-1 h-px bg-border" />
        <span className="font-serif italic text-tiny text-ink-faint">
          {t("invites.counts", { members: members.length, invites: invites.length })}
        </span>
      </div>

      <div className="flex flex-col">
        {members.map((m) => (
          <MemberRow
            key={m.userId}
            member={m}
            onChangeRole={async (r) => {
              setMembers((prev) => prev.map((x) => (x.userId === m.userId ? { ...x, role: r } : x)));
              try { await api.trips.setMemberRole(tripId, m.userId, r); } catch {/* ignore */}
            }}
            onRemove={async () => {
              setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
              try { await api.trips.removeMember(tripId, m.userId); } catch {/* ignore */}
            }}
          />
        ))}
        {invites.map((inv) => (
          <InviteRow
            key={inv.id}
            invite={inv}
            onCancel={async () => {
              setInvites((prev) => prev.filter((x) => x.id !== inv.id));
              try { await api.trips.deleteInvite(tripId, inv.id); } catch {/* ignore */}
            }}
          />
        ))}
      </div>

      <div className="mt-6 bg-orange/[0.05] border border-dashed border-orange/30 rounded-md px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <IconSend size={16} className="text-orange-deep" />
          <h3 className="font-serif italic text-meta text-ink font-medium m-0">{t("invites.newTitle")}</h3>
        </div>
        <p className="font-serif italic text-mini text-ink-faint m-0 mb-3.5">{t("invites.newSub")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px_auto] gap-2 items-start">
          <SoftField
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t("invites.emailPlaceholder")}
            hideCounter
            inputProps={{ onKeyDown: (e) => { if (e.key === "Enter") invite(); } }}
          />
          <RoleSelect value={role} onChange={setRole} />
          <button
            type="button"
            onClick={invite}
            disabled={busy || !email.trim()}
            className="bg-ink hover:bg-ink-hover text-white px-4 py-2.5 rounded-md text-mini font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            <IconSend size={13} /> {t("invites.invite")}
          </button>
        </div>
        <div className="mt-3.5 pt-3 border-t border-dashed border-orange/30 flex items-center gap-3">
          <IconInfoCircle size={14} className="text-orange-deep shrink-0" />
          <p className="m-0 font-serif italic text-mini text-ink-faint leading-snug">{t("invites.rolesHint")}</p>
        </div>
      </div>
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: "editor" | "viewer"; onChange: (v: "editor" | "viewer") => void }) {
  const t = useTranslations("TripEdit");
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "editor" | "viewer")}
      className="h-full bg-surface border border-border-strong rounded-md px-3 py-2.5 text-mini text-ink focus:outline focus:outline-2 focus:outline-orange/30 focus:border-orange"
    >
      <option value="editor">{t("invites.roleEditorLong")}</option>
      <option value="viewer">{t("invites.roleViewerLong")}</option>
    </select>
  );
}

function RolePill({ role }: { role: "owner" | "editor" | "viewer" | "pending" }) {
  const t = useTranslations("TripEdit");
  const cls: Record<string, string> = {
    owner: "bg-ink text-white",
    editor: "bg-orange/15 text-orange-deep",
    viewer: "bg-ink/[0.06] text-ink-soft",
    pending: "bg-surface border border-dashed border-border-strong text-ink-faint",
  };
  return (
    <span className={cn("text-micro px-2 py-0.5 rounded-pill tracking-eyebrow uppercase font-medium", cls[role])}>
      {t(`invites.role_${role}`)}
    </span>
  );
}

function MemberRow({
  member, onChangeRole, onRemove,
}: {
  member: Member;
  onChangeRole: (role: "editor" | "viewer") => void;
  onRemove: () => void;
}) {
  const initials = member.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-ink text-white text-tiny font-medium inline-flex items-center justify-center shrink-0">{initials}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-meta text-ink font-medium m-0 truncate">{member.name}</p>
      </div>
      {member.role === "owner" ? (
        <RolePill role="owner" />
      ) : (
        <>
          <RoleSelectInline value={member.role === "viewer" ? "viewer" : "editor"} onChange={onChangeRole} />
          <button type="button" onClick={onRemove} className="text-ink-faint hover:text-ink p-1.5 rounded-full">
            <IconX size={14} />
          </button>
        </>
      )}
    </div>
  );
}

function RoleSelectInline({ value, onChange }: { value: "editor" | "viewer"; onChange: (v: "editor" | "viewer") => void }) {
  const t = useTranslations("TripEdit");
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "editor" | "viewer")}
      className="bg-surface border border-border-strong rounded-md px-2.5 py-1 text-tiny text-ink"
    >
      <option value="editor">{t("invites.role_editor")}</option>
      <option value="viewer">{t("invites.role_viewer")}</option>
    </select>
  );
}

function InviteRow({ invite, onCancel }: { invite: Invite; onCancel: () => void }) {
  const t = useTranslations("TripEdit");
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <span className="w-8 h-8 rounded-full bg-ink/15 text-ink-soft inline-flex items-center justify-center shrink-0">
        <IconMail size={13} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-meta text-ink-soft m-0 truncate">{invite.email}</p>
        <p className="font-serif italic text-tiny text-ink-faint m-0 mt-0.5">{t("invites.pendingHint")}</p>
      </div>
      <span className="text-micro px-2 py-0.5 rounded-pill tracking-eyebrow uppercase font-medium bg-surface border border-dashed border-border-strong text-ink-faint">
        {t("invites.role_pending")} · {t(`invites.role_${invite.role}`)}
      </span>
      <button type="button" onClick={onCancel} className="text-ink-faint hover:text-ink p-1.5 rounded-full" title={t("invites.cancelInvite")}>
        <IconX size={14} />
      </button>
    </div>
  );
}
