"use client";

/**
 * Design sketch — Icon Picker
 * URL: /design/icon-picker
 *
 * DIREZIONE SCELTA: proposta "A · Sezioni" — popover flottante con
 * TUTTE le icone visibili (scroll se serve), raggruppate per macro.
 *
 * Vincolo chiave (non negoziabile): il dominio delle icone è SEMPRE
 * quello delle categorie di ExploreToolbar — `CategoryIconPicker`
 * deriva tutto da EXPLORE_CATEGORY_TREE via useExploreCategories():
 * una categoria nuova compare automaticamente in toolbar E nel picker.
 * Niente liste hardcoded, niente set paralleli.
 *
 * In fondo, ARCHIVIATA: la variante a tab su STOP_ICON_CATEGORIES
 * prodotta dall'implementazione (features/activity/IconPicker.tsx) —
 * da riallineare a questa direzione.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { IconX } from "@/components/ui/icons";
import { useExploreCategories } from "@/features/explore/useExploreCategories";
import {
  STOP_ICONS,
  STOP_ICON_CATEGORIES,
  type StopIconCategory,
} from "@/features/activity/Timeline/stopIcons";
import { CategoryIconPicker, IconPicker } from "./IconPicker";

export default function IconPickerPage() {
  const macros = useExploreCategories();
  const [selectedId, setSelectedId] = useState("mercati");
  const [open, setOpen] = useState(true);

  const flat = useMemo(() => macros.flatMap((m) => m.subs), [macros]);
  const current = flat.find((s) => s.id === selectedId) ?? flat[0];
  const CurrentIcon = current.icon;

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <header className="mb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-orange">
          TravelGo · design scratchpad
        </div>
        <h1 className="mb-3 text-[26px] font-medium leading-tight">
          Icon Picker — A · Sezioni (direzione scelta)
        </h1>
        <p className="max-w-[680px] text-meta leading-relaxed text-ink-soft">
          Due livelli: <code className="rounded bg-surface-soft px-1 text-[12px]">IconPicker</code>{" "}
          puro (riceve <code className="rounded bg-surface-soft px-1 text-[12px]">groups</code>,
          zero icone hardcoded) +{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">CategoryIconPicker</code>{" "}
          che deriva i gruppi da{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">EXPLORE_CATEGORY_TREE</code>{" "}
          via <code className="rounded bg-surface-soft px-1 text-[12px]">useExploreCategories()</code>{" "}
          — la stessa fonte della ExploreToolbar: aggiungi una categoria
          all&apos;albero e la trovi qui, senza toccare il picker. Tutte le
          sezioni visibili, un solo tap per scegliere, label i18n come
          tooltip/aria.
        </p>
      </header>

      {/* Demo 1 — nel contesto: header dell'editor attività, popover
          flottante ancorato al badge icona (senza chevron). */}
      <section className="mb-12">
        <h2 className="mb-1 text-[17px] font-semibold text-ink">
          Nel dettaglio attività — interattivo
        </h2>
        <p className="mb-4 text-mini text-ink-soft">
          Tap sul badge icona per aprire/chiudere; la selezione aggiorna
          l&apos;icona e chiude. Selezionata:{" "}
          <span className="font-medium text-ink">{current.label}</span>{" "}
          <span className="text-ink-faint">({current.id})</span>
        </p>
        <div className="relative max-w-[360px]">
          <div className="flex flex-col gap-1 rounded-md bg-ink p-1">
            <div className="flex items-center gap-2 px-2 py-1.5 text-white">
              <button
                type="button"
                aria-label="Cambia icona"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center rounded-sm px-1 py-0.5 transition-colors hover:bg-white/10",
                  open && "bg-white/10",
                )}
              >
                <CurrentIcon size={15} className="shrink-0" />
              </button>
              <span className="flex-1 truncate text-meta font-semibold">
                Spesa Beisia Tomisato
              </span>
              <IconX size={14} className="shrink-0 text-white/60" />
            </div>
            <div className="flex h-24 items-center justify-center rounded-sm bg-surface text-mini text-ink-faint">
              … corpo dell&apos;editor …
            </div>
          </div>
          {open ? (
            <div className="absolute left-1.5 top-9 z-dropdown">
              <CategoryIconPicker
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  setOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* Demo 2 — pannello standalone (per form/altre superfici). */}
      <section className="mb-12">
        <h2 className="mb-1 text-[17px] font-semibold text-ink">Standalone</h2>
        <p className="mb-4 text-mini text-ink-soft">
          Lo stesso componente senza ancoraggio — riusabile in form
          (es. StopComposer) o pannelli.
        </p>
        <CategoryIconPicker selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      {/* Demo 3 — IconPicker puro con un dominio custom. */}
      <section className="mb-12">
        <h2 className="mb-1 text-[17px] font-semibold text-ink">
          Dominio custom (IconPicker puro)
        </h2>
        <p className="mb-4 text-mini text-ink-soft">
          Il presentazionale accetta qualsiasi{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">groups</code>:
          qui un sottoinsieme (solo &quot;{macros[1]?.label}&quot;).
        </p>
        <IconPicker
          groups={macros
            .filter((m) => m.id === "mangia")
            .map((m) => ({
              id: m.id,
              label: m.label,
              icon: m.icon,
              items: m.subs.map((s) => ({ id: s.id, label: s.label, icon: s.icon })),
            }))}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>

      {/* Note di porting */}
      <section className="mb-12 rounded-md border border-border bg-surface p-4">
        <p className="mb-1.5 text-meta font-semibold text-ink">
          Note per il porting
        </p>
        <div className="flex flex-col gap-1.5 text-mini leading-relaxed text-ink-soft [&_code]:rounded [&_code]:bg-surface-soft [&_code]:px-1 [&_code]:text-[11px] [&_code]:text-ink">
          <p>
            <code>IconPicker</code> (puro) → <code>components/ui/IconPicker.tsx</code>;{" "}
            <code>CategoryIconPicker</code> (dominio) →{" "}
            <code>features/explore/CategoryIconPicker.tsx</code>, unico punto
            che tocca <code>useExploreCategories</code>. Popover: ancorato al
            trigger, <code>z-dropdown</code>, chiusura su selezione / Esc /
            click-out; focus trap + frecce per a11y. Persistenza: id
            categoria su <code>activity.icon</code> (entity-level,{" "}
            <code>ActivityService.updateEntity</code>), con mappa di
            compatibilità in <code>getStopIcon</code> per le vecchie chiavi{" "}
            <code>STOP_ICONS</code>. L&apos;attuale{" "}
            <code>features/activity/IconPicker.tsx</code> (variante tab qui
            sotto) va riallineato: stessa resa &quot;A · Sezioni&quot; e
            dominio EXPLORE_CATEGORY_TREE — il set parallelo{" "}
            <code>STOP_ICON_CATEGORIES</code> non deve diventare una seconda
            fonte di verità.
          </p>
        </div>
      </section>

      {/* ARCHIVIO — variante a tab dell'implementazione, per confronto. */}
      <section className="border-t border-border pt-8">
        <h2 className="mb-1 text-[17px] font-semibold text-ink">
          Variante a tab — archiviata
        </h2>
        <p className="mb-4 max-w-[640px] text-mini leading-relaxed text-ink-soft">
          Prodotta dall&apos;implementazione su{" "}
          <code className="rounded bg-surface-soft px-1 text-[12px]">STOP_ICON_CATEGORIES</code>.
          Tenuta come riferimento: la direzione scelta è &quot;A · Sezioni&quot;
          qui sopra (un tap, tutto visibile, dominio = ExploreToolbar).
        </p>
        <ArchivedTabVariant />
      </section>
    </div>
  );
}

/* ─── Archivio: variante a tab (implementazione agent) ─────────────── */

const CATEGORY_LABELS_IT: Record<StopIconCategory, string> = {
  food: "Cibo & drink",
  sights: "Luoghi",
  shop: "Acquisti",
  transport: "Trasporti",
  nature: "Natura",
  sleep: "Pernottamento",
  other: "Altro",
};

function ArchivedTabVariant() {
  const [value, setValue] = useState<string | null>("coffee");
  const allowed = STOP_ICON_CATEGORIES.filter((c) => c !== "sleep");
  const [activeCat, setActiveCat] = useState<StopIconCategory>(allowed[0]);
  const items = STOP_ICONS.filter((i) => i.category === activeCat);
  return (
    <div className="flex w-[300px] flex-col gap-3 rounded-lg border border-border bg-white p-3 shadow-float">
      <span className="text-[10px] font-semibold uppercase tracking-eyebrow text-ink/40">
        Scegli un&apos;icona
      </span>
      <div className="flex flex-wrap gap-1">
        {allowed.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCat(cat)}
            className={cn(
              "rounded-pill px-2 py-1 text-[11px] font-medium transition-colors",
              activeCat === cat
                ? "bg-ink text-white"
                : "bg-surface-soft text-ink/60 hover:bg-surface-warm hover:text-ink",
            )}
          >
            {CATEGORY_LABELS_IT[cat]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {items.map(({ key, Icon }) => (
          <button
            key={key}
            type="button"
            title={key}
            onClick={() => setValue(key)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-sm transition-colors",
              key === value
                ? "bg-primary text-white"
                : "text-ink/60 hover:bg-surface-soft hover:text-ink",
            )}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
