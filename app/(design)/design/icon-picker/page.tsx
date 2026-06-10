"use client";

/**
 * Design sketch — Icon Picker
 * URL: /design/icon-picker
 *
 * Popover per cambiare l'icona di una activity o di un pernottamento.
 *
 * Struttura:
 *   - Header: label "Scegli un'icona"
 *   - Tab categorie (pillole orizzontali con scroll)
 *   - Griglia icone della categoria attiva (6 colonne)
 *
 * Filtri:
 *   - mode="activity" → mostra tutte le categorie ECCETTO `sleep`
 *   - mode="lodging"  → mostra SOLO la categoria `sleep`
 *
 * Componente target: features/activity/IconPicker.tsx
 * Usato in: ActivityStop (Explore Timeline) — apertura su click dell'icona
 * nel pannello aperto.
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  STOP_ICONS,
  STOP_ICON_CATEGORIES,
  type StopIconCategory,
} from "@/features/activity/Timeline/stopIcons";

const CATEGORY_LABELS_IT: Record<StopIconCategory, string> = {
  food: "Cibo & drink",
  sights: "Luoghi",
  shop: "Acquisti",
  transport: "Trasporti",
  nature: "Natura",
  sleep: "Pernottamento",
  other: "Altro",
};

const ICON_LABELS_IT: Record<string, string> = {
  coffee: "Caffè", food: "Cibo", drink: "Drink", dessert: "Dolce",
  photo: "Foto", view: "Panorama", monument: "Monumento", museum: "Museo",
  rest: "Riposo", shop: "Shopping", market: "Mercato", ticket: "Biglietti",
  walk: "A piedi", bike: "Bici", bus: "Bus", car: "Auto", train: "Treno",
  beach: "Spiaggia", swim: "Nuoto", park: "Parco",
  bed: "Hotel", tent: "Campeggio", house: "Appartamento", ryokan: "Ryokan",
  star: "Preferito", music: "Musica", info: "Info", gift: "Regalo",
};

type Mode = "activity" | "lodging";

/* ─── Sketch del componente ───────────────────────────────────────── */

function IconPickerSketch({
  mode,
  value,
  onChange,
}: {
  mode: Mode;
  value: string | null;
  onChange: (key: string) => void;
}) {
  const allowedCategories: StopIconCategory[] =
    mode === "lodging"
      ? ["sleep"]
      : STOP_ICON_CATEGORIES.filter((c) => c !== "sleep");

  // Categoria iniziale: quella dell'icona corrente se ancora valida, altrimenti
  // la prima permessa.
  const initialCategory: StopIconCategory =
    (STOP_ICONS.find((i) => i.key === value)?.category &&
      allowedCategories.includes(
        STOP_ICONS.find((i) => i.key === value)!.category,
      )
      ? STOP_ICONS.find((i) => i.key === value)!.category
      : allowedCategories[0]);
  const [activeCat, setActiveCat] = useState<StopIconCategory>(initialCategory);
  const items = STOP_ICONS.filter((i) => i.category === activeCat);

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-border shadow-float",
        "w-[300px] p-3 flex flex-col gap-3",
      )}
    >
      <span className="text-[10px] font-semibold tracking-eyebrow uppercase text-ink/40">
        Scegli un&apos;icona
      </span>

      {/* Tab categorie — non scrollano in lodging (1 sola cat) */}
      {allowedCategories.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {allowedCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={cn(
                "px-2 py-1 rounded-pill text-[11px] font-medium transition-colors",
                activeCat === cat
                  ? "bg-ink text-white"
                  : "bg-surface-soft text-ink/60 hover:text-ink hover:bg-surface-warm",
              )}
            >
              {CATEGORY_LABELS_IT[cat]}
            </button>
          ))}
        </div>
      ) : null}

      {/* Griglia icone */}
      <div className="grid grid-cols-6 gap-1">
        {items.map(({ key, Icon }) => {
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              title={ICON_LABELS_IT[key] ?? key}
              onClick={() => onChange(key)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm transition-colors",
                selected
                  ? "bg-primary text-white"
                  : "text-ink/60 hover:text-ink hover:bg-surface-soft",
              )}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Demo page ───────────────────────────────────────────────────── */

export default function IconPickerSketchPage() {
  const [activityIcon, setActivityIcon] = useState<string | null>("coffee");
  const [lodgingIcon, setLodgingIcon] = useState<string | null>("bed");

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10 flex flex-col gap-10">
      <header>
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          Design sketch
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-2">
          Icon picker
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[600px]">
          Popover per selezionare l&apos;icona di un&apos;activity o di un
          pernottamento. Sull&apos;activity la categoria{" "}
          <code>sleep</code> è esclusa; sul lodging è l&apos;unica disponibile.
        </p>
      </header>

      {/* Activity — esclude sleep */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[14px] font-medium">Picker su activity</h2>
        <p className="text-[12px] text-ink-soft">
          Categoria <code>sleep</code> nascosta. Default sull&apos;icona corrente.
        </p>
        <div className="flex items-start gap-6">
          <IconPickerSketch
            mode="activity"
            value={activityIcon}
            onChange={setActivityIcon}
          />
          <div className="text-[12px] text-ink-soft">
            Selezionato: <code className="bg-surface-soft px-1 rounded">{activityIcon ?? "—"}</code>
          </div>
        </div>
      </section>

      {/* Lodging — solo sleep */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[14px] font-medium">Picker su pernottamento</h2>
        <p className="text-[12px] text-ink-soft">
          Solo categoria <code>sleep</code> — i tab spariscono perché non ci sono
          alternative.
        </p>
        <div className="flex items-start gap-6">
          <IconPickerSketch
            mode="lodging"
            value={lodgingIcon}
            onChange={setLodgingIcon}
          />
          <div className="text-[12px] text-ink-soft">
            Selezionato: <code className="bg-surface-soft px-1 rounded">{lodgingIcon ?? "—"}</code>
          </div>
        </div>
      </section>
    </div>
  );
}
