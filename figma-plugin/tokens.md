# TravelGo · Design Tokens

Tabella di riferimento estratta da `app/globals.css` (`@theme` Tailwind v4) e `public/design/styles.css`. Tieni questo file allineato quando aggiorni i custom property.

## Colori

### Sfondi e superfici

| Token | Hex / RGBA | Uso |
|---|---|---|
| `--color-bg` | `#F1EFE8` | Background pagina (beige) |
| `--color-surface` | `#FFFFFF` | Card, sheet, topbar |
| `--color-surface-soft` | `#F5F3EE` | Hover sottile, drawer attivo, chip stato |
| `--color-surface-warm` | `#FDF5EE` | Stop pill default |
| `--color-surface-input` | `#FAFAF6` | **Field input** (SoftField, BudgetInput, AddressField) |

### Bordi

| Token | Hex / RGBA | Uso |
|---|---|---|
| `--border` | `rgba(13, 44, 61, 0.08)` | Bordo standard 0.5px |
| `--border-strong` | `rgba(13, 44, 61, 0.18)` | Bordo enfatizzato (hover, btn-icon) |

### Inchiostro (testo + primary)

| Token | Hex | Uso |
|---|---|---|
| `--color-ink` | `#0D2C3D` | Testo primario, solid button, day selezionato |
| `--color-ink-hover` | `#1A3D52` | Hover/active del solid `--color-ink` |
| `--color-ink-soft` | `#5B6B78` | Testo secondario, nav inattiva |
| `--color-ink-faint` | `#8A98A3` | Testo tertiary, dot stato, chevron, placeholder |

### Accent · Primary / Arancione (alias)

| Token | Hex | Uso |
|---|---|---|
| `--color-primary` (= `--color-orange`) | `#F47B3A` | Accent brand, eyebrow, focus ring field, barra giorno selezionato |
| `--color-primary-soft` (= `--color-orange-soft`) | `#FDECDF` | Background variant leggera |
| `--color-primary-border` (= `--color-orange-border`) | `#F9D4B6` | Border variant |
| `--color-primary-deep` (= `--color-orange-deep`) | `#A84818` | Testo arancione su sfondi chiari (link "Aggiungi…"), error inline |

### Accent · Night (Explore overlay)

| Token | Hex | Uso |
|---|---|---|
| `--color-night` | `#4338CA` | Pin + route layer Explore notturno |
| `--color-night-soft` | `#EEF0FB` | Background variant night leggera |

### Accent · Lime

| Token | Hex | Uso |
|---|---|---|
| `--lime` | `#E6F254` | Badge warning sull'hero, accent secondario |
| `--lime-text` | `#5A6206` | Testo lime su sfondi chiari |

### Stato viaggio

| Variante | Background | Testo |
|---|---|---|
| Pre · `.trip-state-pre` | `#E8F1FF` | `#1D4ED8` |
| During · `.trip-state-during` | `#FEF5CF` | `#7A5E0E` |
| After · `.trip-state-after` | `#E4F3DA` | `#3D6E0E` |

### Stato attività (dot in `.pill-status`)

| Stato | Color |
|---|---|
| `todo` | `#E24B4A` |
| `booked` | `#EF9F27` |
| `paid` | `#97C459` |

### Stato attività (background + foreground)

| Stato | `--color-status-{x}-bg` | `--color-status-{x}-fg` |
|---|---|---|
| `todo` | `#FDE6E1` | `#9A3015` |
| `booked` | `#FEF5CF` | `#7A5E0E` |
| `paid` | `#E4F3DA` | `#3D6E0E` |

### Semantic palette (Button, TabSwitcher, badge)

| Variante | `-bg` | `-fg` | `-deep` | `-border` |
|---|---|---|---|---|
| `danger` | `#FCEBEB` | `#9A3015` | `#A32D2D` | `rgba(154, 48, 21, 0.25)` |
| `warning` | `#FEF5CF` | `#A37809` | `#E0A818` | `rgba(163, 120, 9, 0.25)` |
| `success` | `#ECF5E1` | `#3D6E0E` | `#3D6E0E` | `rgba(61, 110, 14, 0.25)` |

### Budget bar

| Stato | Color |
|---|---|
| `ok` | `#65A30D` |
| `warn` | `--orange` (`#F47B3A`) |
| `alert` | `#DC2626` |

### Semantic varianti btn-icon

| Variante | Color base | Hover bg | Hover text |
|---|---|---|---|
| `.btn-danger` | `#9A3015` | `#9A3015` | `white` |
| `.btn-warning` | `#A37809` | `#E0A818` | `white` |
| `.ghost.btn-danger` hover bg | `#FCEBEB` | text `#A32D2D` |  |
| `.ghost.btn-warning` hover bg | `#FEF5CF` | text `#A37809` |  |

## Radius

| Token | Px | Uso |
|---|---|---|
| `--radius-sm` | `8` | Bottoni quadrati piccoli (`.map-btn`, brand-mark) |
| `--radius-md` | `12` | Card medie, `.next-day`, day-item selezionato |
| `--radius-lg` | `14` | Card grandi, `.day-list`, `.day-hero`, `.map-canvas` |
| `--radius-pill` | `999` | Bottoni `.btn-icon`, chip, tag, period-cell, SoftField pill |

## Shadow

| Token | Valore | Uso |
|---|---|---|
| `--shadow-float` | `0 10px 40px rgba(13,44,61,0.18), 0 2px 8px rgba(13,44,61,0.08)` | Pannelli flottanti (Go chat, toolbar Explore, popover Opzioni) |
| `--shadow-yumeji-drawer` | `-18px 0 36px rgba(13,44,61,0.1)` | Drawer Yumeji in modalità floating (overlay da destra) |
| Focus ring field | `0 0 0 3px rgba(244,123,58,0.12)` | `focus-within` su SoftField, AddressField, BudgetInput (primary @ 12%) |

## Typography

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Inter", Arial, sans-serif;
--font-serif: Georgia, "Times New Roman", serif;
```

### Font-size scale semantica

| Token | Px | Uso comune |
|---|---|---|
| `--text-micro` | `10` | Eyebrow, badge piccoli, counter, mobile drawer eyebrow |
| `--text-tiny` | `11` | Label inline, conversion budget, button sm, micro errore inline |
| `--text-mini` | `12` | Tab switcher md, label form, sub-info |
| `--text-meta` | `13` | Body compatto, label form lg, sub-header meta |

Base body: `15px`, line-height `1.5`, weight `400`. Heading weight `500` (mai `700`). Inline value SoftField: `12.5px / 500` con `caret-primary`.

### Tracking semantico

| Token | Em |
|---|---|
| `--tracking-meta` | `0.04` |
| `--tracking-eyebrow` | `0.06` |
| `--tracking-eyebrow-wide` | `0.12` |

## Bottoni `.btn-icon` (riassunto)

| Size | Square (icon-only) | Con label | Font |
|---|---|---|---|
| `btn-sm` | 24×24 | `padding 0 10px 0 8px`, gap 5px | 11px |
| `btn-md` | 32×32 | `padding 0 14px 0 11px`, gap 6px | 12px (label) / 14px (square) |
| `btn-lg` | 40×40 | `padding 0 18px 0 14px`, gap 8px | 13px (label) / 16px (square) |

Varianti:
- **Default**: bg `white`, border `0.5px var(--border-strong)`, color `var(--ink)`. Hover inverte: bg `var(--ink)`, color `white`.
- **Solid**: bg `var(--ink)`, color `white`. Hover inverte a bianco con border `var(--ink)`.
- **Ghost**: bg `transparent`, border `transparent`. Hover bg `var(--surface-soft)`.
- **Text-only**: senza icona, padding orizzontale più largo (sm 14, md 16, lg 22).
- **Over-media**: bg `rgba(255,255,255,0.18)` + `backdrop-filter: blur(6px)`. Per stare sopra immagini scure.

Tutti i bottoni:
- `border-radius: var(--radius-pill)` (999px → pill o cerchio)
- `transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.05s`
- `:active { transform: scale(0.96) }`
- `:disabled { opacity: 0.45; cursor: not-allowed }`
- `:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px }`

## TabSwitcher (riassunto)

Pill container con border-radius pill (999px), `gap-[2px] p-[3px]`. Ogni tab è una sub-pill che diventa solid (`bg-ink text-white`) quando attiva.

| Size | Container font | Button h | Button px | Button font |
|---|---|---|---|---|
| `xs` | `text-micro` (10px) | 20px | 8px | `text-micro` (10px) |
| `sm` | `text-tiny` (11px) | 24px | 10px | `text-tiny` (11px) |
| `md` | `text-mini` (12px) | 32px | 14px | `text-mini` (12px) |
| `lg` | `text-meta` (13px) | 40px | 18px | `text-meta` (13px) |

Variant container: `outline` (bg-surface + border-border-strong), `solid` (border-transparent), `ghost` (bg-transparent + border-transparent). Tone semantico (`neutral` / `danger` / `warning` / `success`) colora la pill attiva con il `deep` corrispondente.

## SoftField (riassunto)

Field pill con due varianti principali — `pill` (chrome visibile) e `inline` ("passport row" senza chrome).

**Pill — Default**: `bg-surface-input` (#FAFAF6), `border 0.5px var(--color-border)`. **Hover** `border-border-strong`. **Focus** `border-orange`, `bg-surface`, focus ring `0 0 0 3px rgba(244,123,58,0.12)`.

| Size | Padding | Gap | Input font | Min-h |
|---|---|---|---|---|
| `sm` | `px-3.5 py-1.5` (14/6px) | `gap-1` (4px) | 13px | — |
| `md` | `px-[18px] py-[10px]` | `gap-1.5` (6px) | 15px | — |

Multiline: stesso sistema, ma radius `20px` (md) / `16px` (sm) invece di pill.

Floating label (`label` prop): posizionato `-top-2 left-4 px-1.5`, `bg-surface` (taglio del bordo), `text-[9px] uppercase tracking-[0.08em] text-ink-faint font-medium`, visibile solo su `:hover` / `:focus-within` (a meno di `labelAlwaysVisible`).

**Inline** (`variant="inline"`): nessun chrome, layout a 4 varianti A/B/C/D combinando `icon` + `label`:

- A · icon + label + value
- B · icon + value
- C · label + value
- D · value only

Icon `text-ink-faint` → `text-primary` quando il campo è valorizzato o in focus. Eyebrow label `w-[50px] text-micro uppercase tracking-eyebrow` con stessa transizione di colore. Value `text-[12.5px] font-medium caret-primary`. Error → `text-primary-deep` + `errorMessage` italic sotto.

## BudgetInput (riassunto)

Stesso chrome del pill SoftField + layout interno fisso:

```
[symbol] [amount input · flex-1] [conversion (opt)] [currency pill ink]
```

`min-w-[180px]`, padding `px-[18px] py-2`, `gap-1.5`. Symbol e amount `text-meta tabular-nums`. Conversion `text-tiny ink-faint`. Currency pill: `bg-ink text-white rounded-pill pl-[9px] pr-[7px] py-[3px] text-micro font-medium tracking-meta` con chevron a 10×10 e opacità 0.6.
