/**
 * Tool definitions — solo i metadati JSON per il function calling OpenAI.
 *
 * Questo file NON importa componenti React: è importabile lato server
 * (API route) senza violare i vincoli dei Server Components.
 *
 * Per aggiungere un nuovo widget:
 *   1. Aggiungi la toolDescription qui
 *   2. Crea il componente in mio-widget.widget.tsx
 *   3. Registra nel registry in widgets/index.ts
 */

import type { OpenAITool } from "../prompt";

export const WIDGET_TOOL_DEFINITIONS: OpenAITool[] = [
  {
    type: "function",
    function: {
      name: "quick-reply",
      description:
        "Propone all'utente 3-4 opzioni di scelta singola come primo passo della conversazione. " +
        "Usare SOLO come risposta al primo saluto, per capire cosa vuole fare l'utente. " +
        "Le opzioni devono essere contestuali alla destinazione e ai temi del viaggio. " +
        "Scegli le 3-4 più rilevanti tra: 'Un posto da vedere', 'Un food spot', " +
        "'Un'esperienza locale', 'Un'attività per oggi', 'Qualcosa di insolito', " +
        "'Riempi un giorno', 'Come muoversi', 'Dove dormire'.",
      parameters: {
        type: "object",
        required: ["options"],
        properties: {
          options: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              required: ["value", "label"],
              properties: {
                value: { type: "string", description: "Identificatore interno (snake_case)" },
                label: { type: "string", description: "Testo mostrato all'utente" },
                emoji: { type: "string", description: "Emoji opzionale" },
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggestions",
      description:
        "Lista espandibile di suggerimenti (luoghi, attività, ristoranti). " +
        "Ogni item può avere descrizione, bullets, fatti chiave (orari, costo, fatica) e distanza. " +
        "Usare quando l'utente cerca idee concrete da aggiungere al giorno o alla wishlist.",
      parameters: {
        type: "object",
        required: ["title", "items"],
        properties: {
          title: { type: "string", description: "Titolo del gruppo (es. 'Food spot · Tokyo')" },
          subtitle: { type: "string", description: "Sottotitolo contestuale" },
          primaryAction: {
            type: "string",
            enum: ["add_to_day", "add_to_wishlist", "select"],
            description: "Azione primaria per ogni item",
          },
          items: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: {
              type: "object",
              required: ["id", "title"],
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                subtitle: { type: "string", description: "Quartiere o breve info (es. 'Shinjuku · aperto 24h')" },
                tag: { type: "string", description: "Categoria (es. 'Caffè · Libreria')" },
                emoji: { type: "string", description: "Emoji rappresentativa" },
                placeholderColor: { type: "string", description: "Hex del colore placeholder thumb" },
                distance: { type: "string", description: "Distanza testuale (es. '480 m')" },
                description: {
                  type: "string",
                  description: "Prosa Go — perché è consigliato, 1-2 frasi in stile serif/italico",
                },
                bullets: {
                  type: "array",
                  items: { type: "string" },
                  description: "Lista 'cosa aspettarsi' (max 3-4 voci)",
                },
                facts: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["label"],
                    properties: {
                      icon: { type: "string", enum: ["clock", "coin", "walk", "map-pin", "train", "star"] },
                      label: { type: "string", description: "Es. '11:00–20:00', '¥1500', 'Bassa fatica'" },
                    },
                  },
                  description: "Fatti chiave: orari, costo, fatica fisica",
                },
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "carousel",
      description:
        "Carousel orizzontale di card visive (luoghi, hotel, esperienze). " +
        "Preferire per contenuti visivi dove l'immagine/thumbnail è importante. " +
        "Supporta selezione singola o multipla.",
      parameters: {
        type: "object",
        required: ["title", "items"],
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          multiSelect: { type: "boolean", description: "Se true, l'utente può selezionare più item" },
          confirmLabel: { type: "string", description: "Label del bottone conferma in multi-select" },
          items: {
            type: "array",
            minItems: 2,
            maxItems: 8,
            items: {
              type: "object",
              required: ["id", "title"],
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                tag: { type: "string" },
                badge: { type: "string", description: "Es. '⭐ 4.9'" },
                placeholderColor: { type: "string", description: "Hex colore card placeholder" },
                imageUrl: { type: "string", description: "URL immagine (opzionale)" },
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm",
      description:
        "Dialogo di conferma binario (Sì/No) per azioni concrete. " +
        "Usare solo per azioni specifiche come assegnare un elemento al giorno, confermare una scelta.",
      parameters: {
        type: "object",
        required: ["question", "labelYes", "labelNo"],
        properties: {
          question: { type: "string", description: "La domanda principale" },
          detail: { type: "string", description: "Dettaglio contestuale opzionale" },
          labelYes: { type: "string" },
          labelNo: { type: "string" },
          field: { type: "string", description: "Campo dati opzionale associato all'azione" },
          tone: { type: "string", enum: ["default", "danger"], description: "'danger' rende il pulsante Sì rosso" },
        },
      },
    },
  },
];
