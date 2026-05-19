/**
 * lib/region-presets.ts
 *
 * Pre-configured import templates per regione/paese.
 * Consente agli admin di importare dati con una singola configurazione
 * ottimizzata per il tipo di turismo e la disponibilità di dati locali.
 *
 * Dati: © OpenStreetMap contributors (ODbL)
 */

export interface RegionPreset {
  id:          string;
  name:        string;
  description: string;
  location:    string;              // Destinazione Overpass (es. "Japan", "Italy")
  presetIds:   string[];            // Categorie OSM
  batchSize:   number;              // Elemento per batch
  notableOnly: boolean;             // Solo posti con Wikipedia/Wikidata
  enrichWiki:  boolean;             // Arricchisci da Wikipedia
  autoContinue: boolean;            // Continua automaticamente
  dataQuality: {
    expectedResults: number;        // Numero approssimativo di risultati
    notes:           string[];      // Note sulla qualità dei dati
  };
}

export const REGION_PRESETS: RegionPreset[] = [
  // ── Giappone ───────────────────────────────────────────────
  {
    id: 'japan-full',
    name: '🇯🇵 Giappone - Completo',
    description: 'Attrazioni, religione, storici, shopping',
    location: 'Japan',
    presetIds: ['attractions', 'historic', 'religion', 'shopping'],
    batchSize: 500,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: true,
    dataQuality: {
      expectedResults: 8500,
      notes: [
        'Dati OSM completi per il Giappone',
        'Buona copertura di templi, santuari, musei',
        'Wikipedia disponibile per posti notevoli',
        'Complementare con JNTO data per info turistiche',
      ],
    },
  },
  {
    id: 'japan-tokyo',
    name: '🏙️ Giappone - Tokyo',
    description: 'Attrazioni e storici nella prefettura di Tokyo',
    location: 'Tokyo, Japan',
    presetIds: ['attractions', 'historic', 'religion'],
    batchSize: 300,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: false,
    dataQuality: {
      expectedResults: 850,
      notes: [
        'Alta densità di posti in Tokyo',
        'Dati molto dettagliati per la capitale',
        'Wikipedia coverage eccellente',
      ],
    },
  },
  {
    id: 'japan-kyoto',
    name: '⛩️ Giappone - Kyoto',
    description: 'Templi, santuari e siti storici di Kyoto',
    location: 'Kyoto, Japan',
    presetIds: ['religion', 'historic', 'attractions'],
    batchSize: 300,
    notableOnly: true,
    enrichWiki: true,
    autoContinue: false,
    dataQuality: {
      expectedResults: 350,
      notes: [
        'Concentrazione di templi buddhisti e shintoisti',
        'Tutti i posti principali hanno Wikipedia',
        'Dati culturali molto ricchi',
      ],
    },
  },

  // ── Italia ──────────────────────────────────────────────────
  {
    id: 'italy-full',
    name: '🇮🇹 Italia - Completo',
    description: 'Tutto: arte, storia, cibo, natura',
    location: 'Italy',
    presetIds: ['attractions', 'historic', 'religion', 'shopping', 'recreation'],
    batchSize: 750,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: true,
    dataQuality: {
      expectedResults: 12000,
      notes: [
        'Dati OSM eccellenti per Italia',
        'Copertura completa di chiese, musei, piazze',
        'Wikipedia molto completo per posti storici',
      ],
    },
  },
  {
    id: 'italy-rome',
    name: '🏛️ Italia - Roma',
    description: 'Monumenti, chiese e siti storici di Roma',
    location: 'Rome, Italy',
    presetIds: ['attractions', 'historic', 'religion'],
    batchSize: 400,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: false,
    dataQuality: {
      expectedResults: 1200,
      notes: [
        'Dati molto dettagliati per la capitale',
        'Praticamente tutti i posti hanno Wikipedia',
        'Contiene UNESCO e siti storici principali',
      ],
    },
  },

  // ── Spagna ──────────────────────────────────────────────────
  {
    id: 'spain-full',
    name: '🇪🇸 Spagna - Completo',
    description: 'Attrazioni e storici in tutta la Spagna',
    location: 'Spain',
    presetIds: ['attractions', 'historic', 'religion', 'recreation'],
    batchSize: 600,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: true,
    dataQuality: {
      expectedResults: 9500,
      notes: [
        'Buona copertura OSM per città principali',
        'Wikipedia disponibile per siti notevoli',
        'Include castelli, chiese, musei',
      ],
    },
  },

  // ── Germania ────────────────────────────────────────────────
  {
    id: 'germany-full',
    name: '🇩🇪 Germania - Completo',
    description: 'Castelli, musei e siti storici',
    location: 'Germany',
    presetIds: ['attractions', 'historic', 'religion', 'recreation'],
    batchSize: 600,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: true,
    dataQuality: {
      expectedResults: 11000,
      notes: [
        'Dati OSM molto precisi per la Germania',
        'Eccellente copertura di castelli e musei',
        'Wikipedia completo per posti storici',
      ],
    },
  },

  // ── Francia ─────────────────────────────────────────────────
  {
    id: 'france-full',
    name: '🇫🇷 Francia - Completo',
    description: 'Monumenti, musei e siti storici',
    location: 'France',
    presetIds: ['attractions', 'historic', 'religion', 'shopping', 'recreation'],
    batchSize: 700,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: true,
    dataQuality: {
      expectedResults: 13000,
      notes: [
        'Dati OSM eccellenti',
        'Wikipedia molto completo',
        'Include UNESCO patrimonio mondiale',
      ],
    },
  },
  {
    id: 'france-paris',
    name: '🗼 Francia - Parigi',
    description: 'Monumenti e musei parigini',
    location: 'Paris, France',
    presetIds: ['attractions', 'historic', 'religion'],
    batchSize: 400,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: false,
    dataQuality: {
      expectedResults: 1500,
      notes: [
        'Dati molto dettagliati per Parigi',
        'Quasi tutti i posti hanno Wikipedia',
      ],
    },
  },

  // ── USA (New York) ──────────────────────────────────────────
  {
    id: 'usa-new-york',
    name: '🗽 USA - New York City',
    description: 'Attrazioni e musei di NYC',
    location: 'New York City, USA',
    presetIds: ['attractions', 'historic', 'recreation', 'shopping'],
    batchSize: 400,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: false,
    dataQuality: {
      expectedResults: 1800,
      notes: [
        'Dati OSM eccellenti per NYC',
        'Wikipedia coverage completo',
        'Include edifici storici e musei',
      ],
    },
  },

  // ── Inghilterra ─────────────────────────────────────────────
  {
    id: 'uk-london',
    name: '🇬🇧 UK - Londra',
    description: 'Monumenti e musei londinesi',
    location: 'London, United Kingdom',
    presetIds: ['attractions', 'historic', 'religion', 'recreation'],
    batchSize: 400,
    notableOnly: false,
    enrichWiki: true,
    autoContinue: false,
    dataQuality: {
      expectedResults: 1200,
      notes: [
        'Dati OSM precisi per Londra',
        'Wikipedia coverage ottimo',
        'Include castelli e siti storici',
      ],
    },
  },
];

/**
 * Trova un preset per ID.
 */
export function getPreset(id: string): RegionPreset | undefined {
  return REGION_PRESETS.find((p) => p.id === id);
}

/**
 * Filtra preset per parola chiave nel nome o descrizione.
 */
export function searchPresets(query: string): RegionPreset[] {
  const lower = query.toLowerCase();
  return REGION_PRESETS.filter((p) =>
    p.name.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower)
  );
}
