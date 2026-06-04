# TravelGo · Figma plugins

Plugin dev per Figma desktop che generano componenti coerenti con `public/design/styles.css` e `public/design/design-system.css`.

## Installazione (una volta sola, per plugin)

1. Apri **Figma desktop** (non il browser).
2. Menu **Plugins → Development → Import plugin from manifest…**
3. Seleziona il `manifest.json` della cartella che ti interessa (`buttons/` o `filter-header/`).
4. Da quel momento il plugin è disponibile sotto **Plugins → Development**.

I file `manifest.json` e `code.js` devono restare nella stessa cartella — Figma li legge dal disco ogni volta.

## Plugin disponibili

### `buttons/` — TravelGo button library
Crea una pagina `TravelGo — Buttons` con tre component set allineati a `.btn-icon`:
- **Button** (`Variant=Default|Solid|Ghost|Danger|Warning, Size=Sm|Md|Lg`) — bottoni con label
- **Icon button** (`Variant × Size`) — icon-only square (24/32/40)
- **Text button** (`Variant × Size`) — text-only (no icona)

Tutti i bottoni usano `--radius-pill` (999px) e i token `--ink`, `--border-strong`, `--surface-soft` esatti.

### `filter-header/` — Header + popover filtri
Crea una pagina `TravelGo — Filters` con header collapsed (search pill + bottone Opzioni) e popover espanso a 4 sezioni (Mostra, Raggruppa per, Vista, Ottimizza per) in stile Furkot.

### `tabs-fields/` — Tab switcher + field di form
Crea una pagina `TravelGo — Tabs & Fields` con tre component set + due esempi composti:
- **Tab switcher** (`Variant=Outline|Solid|Ghost × Size=Xs|Sm|Md|Lg`) — pill container con sub-pill attiva ink
- **Soft field — Pill** (`Size=Sm|Md × State=Default|Hover|Focus|Filled`) — chrome pill con focus ring arancione
- **Soft field — Inline** (`Layout=A|B|C|D × State=Default|Filled`) — passport row senza chrome
- **Address field** (esempio: pill + map-pin prefix + Button outline "map" suffix)
- **Budget input** (esempio: symbol € + amount + conversion + currency pill ink)

Allineato a `components/ui/TabSwitcher.tsx`, `SoftField.tsx`, `AddressField.tsx`, `BudgetInput.tsx`.

## Allineamento token

Tieni `tokens.md` allineato con `public/design/styles.css`. Se modifichi un token nel CSS, aggiorna `tokens.md`, poi i due `code.js` (cerca l'oggetto `COL` in cima al file).
