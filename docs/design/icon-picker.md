# Icon Picker — generalizzato

> Sketch: `/design/icon-picker` (estratto da timeline-readability it.11b)
> Demo interattiva: popover ancorato, standalone, dominio custom.

## Vincolo fondante

Il dominio delle icone è SEMPRE quello delle categorie di ExploreToolbar.
Nessuna lista hardcoded nel picker: tutto deriva da
`EXPLORE_CATEGORY_TREE` (`features/explore/categories.ts`) via
`useExploreCategories()` (label i18n `ExploreCategories.*`). Aggiungere
una categoria all'albero = trovarla automaticamente in toolbar E picker.

## Architettura (due livelli)

- **`IconPicker`** — puro/presentazionale, target
  `components/ui/IconPicker.tsx`. Props: `groups: { id, label, icon,
  items: { id, label, icon }[] }[]`, `selectedId`, `onSelect(id)`.
  Resa "Sezioni" (proposta A): popover `w-[252px]` `shadow-float`
  `border-border-strong`, eyebrow macro (icona 12 + label uppercase
  9px ink-faint), griglia `grid-cols-6`, celle h-8 `bg-surface-soft`
  → hover `bg-ink/10` → selezionata `bg-ink text-white`; `title`/
  `aria-label` = label, `aria-pressed` sulla selezionata.
- **`CategoryIconPicker`** — wrapper di dominio, target
  `features/explore/CategoryIconPicker.tsx`: unico punto che tocca
  `useExploreCategories`, mappa l'albero in `groups`.

## Comportamento

- Trigger: il badge icona nel dettaglio (NIENTE chevron — it.11b);
  popover ancorato, `z-dropdown`, chiusura su selezione / Esc /
  click-out; focus trap + navigazione frecce per a11y.
- Selezione → scrive l'ID CATEGORIA su `activity.icon` (entity-level,
  `ActivityService.updateEntity`).

## Nota dati (da decidere al porting)

`activity.icon` oggi contiene chiavi `STOP_ICONS` ("shop", "coffee"…).
Passando agli id categoria ("mercati", "caffe"…): mappa di
compatibilità in `getStopIcon` (vecchie chiavi → icona) oppure
migrazione una tantum. `STOP_ICONS` resta solo come legacy-resolver.

## Fuori scope

- Accommodation: non usa questo picker — il tipo struttura si sceglie
  con lo StayTypePicker (timeline-readability it.11) e l'icona deriva
  da `accommodationIcon(type)`.

## Nota (2026-06-10) — riallineamento richiesto

L'implementazione (`features/activity/IconPicker.tsx`, commit 149db34)
ha introdotto una variante A TAB basata su `STOP_ICON_CATEGORIES` — un
set parallelo che NON rispetta il vincolo fondante (dominio =
EXPLORE_CATEGORY_TREE). Decisione di Enrico: la direzione resta
**A · Sezioni** (tutto visibile, scroll). La pagina sketch è stata
ripristinata con la A come principale; la variante tab è archiviata in
fondo per confronto. Il componente reale va riallineato: resa a sezioni
+ dominio derivato dall'albero categorie; `STOP_ICON_CATEGORIES` non
deve diventare una seconda fonte di verità (al più legacy-resolver per
le vecchie chiavi di `activity.icon`).

## Stato

- [x] Sketch generalizzato + demo interattiva
- [ ] Porting `components/ui/IconPicker.tsx` + `features/explore/CategoryIconPicker.tsx`
- [ ] Decisione migrazione chiavi `activity.icon`
- [ ] Integrazione nell'editor ActivityStop (e StopComposer?)
