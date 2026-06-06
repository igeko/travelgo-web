/**
 * /dev/costs — Riepilogo costi servizi esterni (Google Maps Platform + OpenAI).
 *
 * Pagina informativa, NON registrata nel menu della sandbox (registry.ts):
 * è raggiungibile solo dal link nella home /dev.
 *
 * I prezzi sono INDICATIVI (listino pubblico, USD) e vanno verificati sulle
 * pagine ufficiali — vedi i link in fondo. Mappiamo ogni SKU/modello al punto
 * d'uso reale nel codice così è chiaro cosa genera consumo.
 *
 * Il blocco "Costi reali OpenAI" (OpenAiActuals) consuma invece la Costs API
 * e mostra l'addebito effettivo dell'organizzazione, non la stima di listino.
 */

import { OpenAiActuals } from "./OpenAiActuals";

type Row = {
  name: string;
  usage: string;
  /** Prezzo già formattato (stringa) per stare comodi con unità diverse. */
  price: string;
  unit: string;
};

/* ── Google Maps Platform ───────────────────────────────────────── */
const GOOGLE_ROWS: Row[] = [
  {
    name: "Places · Autocomplete (per request)",
    usage: "AddressField / DestinationField — ricerca indirizzi e destinazioni",
    price: "$2.83",
    unit: "/ 1.000 richieste",
  },
  {
    name: "Places · Place Details",
    usage: "Idratazione info luogo (orari, indirizzo, coordinate)",
    price: "$17.00",
    unit: "/ 1.000 richieste",
  },
  {
    name: "Places · Text Search",
    usage: "Discover / Explore — ricerca luoghi per query testuale",
    price: "$32.00",
    unit: "/ 1.000 richieste",
  },
  {
    name: "Places · Place Photo",
    usage: "Foto luoghi (immagini lazy nelle card)",
    price: "$7.00",
    unit: "/ 1.000 richieste",
  },
  {
    name: "Routes API · Compute Routes",
    usage: "TransitVerifier / ActivityRouteMap — tratte e bridge tra attività",
    price: "$5.00",
    unit: "/ 1.000 richieste (Basic)",
  },
  {
    name: "Maps JavaScript · Dynamic Maps",
    usage: "Map / ActivityRouteMap — rendering mappa lato client",
    price: "$7.00",
    unit: "/ 1.000 caricamenti",
  },
];

/* ── OpenAI ──────────────────────────────────────────────────────── */
type AiRow = {
  model: string;
  usage: string;
  input: string;
  output: string;
};

const OPENAI_ROWS: AiRow[] = [
  {
    model: "gpt-4o-mini",
    usage: "Go chat (streaming), classificazione intent, note brevi",
    input: "$0.15",
    output: "$0.60",
  },
  {
    model: "gpt-4o",
    usage: "Suggestions, deep dive, enrichment ricco",
    input: "$2.50",
    output: "$10.00",
  },
];

const LINKS = [
  { label: "Google Maps Platform — pricing", href: "https://mapsplatform.google.com/pricing/" },
  { label: "OpenAI — pricing", href: "https://openai.com/api/pricing/" },
  { label: "Google Cloud Console", href: "https://console.cloud.google.com/" },
  { label: "OpenAI usage dashboard", href: "https://platform.openai.com/usage" },
];

export default function CostsPage() {
  return (
    <div className="px-10 py-12 max-w-4xl space-y-12">
      {/* ── Hero ── */}
      <div>
        <div className="text-micro font-medium tracking-eyebrow-wide uppercase text-orange mb-2">
          TravelGo · dev
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Costi servizi esterni
        </h1>
        <p className="mt-2 text-ink-soft leading-relaxed max-w-prose">
          Riepilogo dei servizi a consumo che l&apos;app usa in produzione, con il
          punto d&apos;uso nel codice. Prezzi di listino pubblico in USD —{" "}
          <span className="text-ink">indicativi</span>, da verificare sulle pagine
          ufficiali (link in fondo).
        </p>
      </div>

      {/* ── Google Maps Platform ── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-meta font-medium text-ink">Google Maps Platform</h2>
          <span className="text-tiny text-ink-faint">prezzo oltre la quota gratuita</span>
        </div>

        {/* Free tier callout */}
        <div className="mb-4 rounded-xl border border-success-border bg-success-bg px-4 py-3">
          <div className="flex items-center gap-2 text-success-deep font-medium text-sm">
            <span>✓</span>
            Soglia gratuita mensile per ogni SKU
          </div>
          <p className="mt-1 text-tiny text-success-fg leading-relaxed">
            Dal nuovo modello (marzo 2025) ogni servizio ha una quota di chiamate
            gratuite al mese: <span className="font-medium">sotto questa soglia non si paga nulla</span>,
            si addebita solo l&apos;eccedenza alle tariffe sotto. Le soglie dipendono dal tier dello SKU —
            indicativamente <span className="font-medium tabular-nums">10.000/mese</span> (Essentials),{" "}
            <span className="font-medium tabular-nums">5.000/mese</span> (Pro),{" "}
            <span className="font-medium tabular-nums">1.000/mese</span> (Enterprise).
            Ha sostituito il vecchio credito unico da $200/mese.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft text-left">
                <th className="px-4 py-2.5 text-tiny font-medium tracking-meta uppercase text-ink-faint">
                  Servizio
                </th>
                <th className="px-4 py-2.5 text-tiny font-medium tracking-meta uppercase text-ink-faint">
                  Uso nell&apos;app
                </th>
                <th className="px-4 py-2.5 text-tiny font-medium tracking-meta uppercase text-ink-faint text-right whitespace-nowrap">
                  Prezzo
                </th>
              </tr>
            </thead>
            <tbody>
              {GOOGLE_ROWS.map((r) => (
                <tr key={r.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 align-top text-ink-soft leading-snug">{r.usage}</td>
                  <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                    <div className="font-medium text-ink tabular-nums">{r.price}</div>
                    <div className="text-tiny text-ink-faint">{r.unit}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-tiny text-ink-faint leading-relaxed">
          Le tariffe sopra valgono per i tier base e si applicano solo alle chiamate
          oltre la quota gratuita; field mask avanzati o traffico in tempo reale
          possono spostarle. Per i volumi attuali dell&apos;app è plausibile restare
          dentro la soglia gratuita di molti SKU.
        </p>
      </section>

      {/* ── OpenAI ── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-meta font-medium text-ink">OpenAI</h2>
          <span className="text-tiny text-ink-faint">prezzo per 1M token</span>
        </div>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft text-left">
                <th className="px-4 py-2.5 text-tiny font-medium tracking-meta uppercase text-ink-faint">
                  Modello
                </th>
                <th className="px-4 py-2.5 text-tiny font-medium tracking-meta uppercase text-ink-faint">
                  Uso nell&apos;app
                </th>
                <th className="px-4 py-2.5 text-tiny font-medium tracking-meta uppercase text-ink-faint text-right whitespace-nowrap">
                  Input
                </th>
                <th className="px-4 py-2.5 text-tiny font-medium tracking-meta uppercase text-ink-faint text-right whitespace-nowrap">
                  Output
                </th>
              </tr>
            </thead>
            <tbody>
              {OPENAI_ROWS.map((r) => (
                <tr key={r.model} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top font-medium text-ink font-mono text-[13px]">
                    {r.model}
                  </td>
                  <td className="px-4 py-3 align-top text-ink-soft leading-snug">{r.usage}</td>
                  <td className="px-4 py-3 align-top text-right whitespace-nowrap font-medium text-ink tabular-nums">
                    {r.input}
                  </td>
                  <td className="px-4 py-3 align-top text-right whitespace-nowrap font-medium text-ink tabular-nums">
                    {r.output}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-tiny text-ink-faint leading-relaxed">
          Prezzi per 1.000.000 di token (≈ 750k parole). Le risposte in streaming
          della chat usano il modello fast; suggestions e deep dive usano il modello
          smart, quindi pesano di più sul costo per richiesta.
        </p>
      </section>

      {/* ── Costi reali OpenAI (Costs API) ── */}
      <OpenAiActuals />

      {/* ── Link ufficiali ── */}
      <section>
        <h2 className="text-micro font-medium tracking-eyebrow-wide uppercase text-ink-faint mb-3">
          Listini e dashboard
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-ink hover:border-border-strong hover:text-orange transition-colors no-underline"
            >
              {l.label}
              <span className="text-ink-faint text-tiny">↗</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
