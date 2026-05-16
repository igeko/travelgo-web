/**
 * Tool definitions in formato OpenAI Chat Completions.
 *
 * Le firme dei `parameters` qui sotto DEVONO matchare le funzioni TS
 * esportate da `lib/ai/tools.ts` — è un contratto.
 */

import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_day_context",
      description:
        "Legge il contesto del giorno corrente: numero, data, zona, meteo, attività già pianificate, pernottamento, e l'incipit scritto dall'utente. Chiamala SEMPRE per prima cosa.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_trip_context",
      description:
        "Legge il contesto generale del viaggio: nome, durata, giorni pianificati, mood ricorrenti, budget medio.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_places",
      description:
        "Cerca luoghi (caffè, librerie, ristoranti, musei…) vicino a un punto. Usa quando devi proporre destinazioni concrete.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Testo libero, es. 'libreria con dolci'.",
          },
          near: {
            description:
              "Punto di partenza: o un oggetto { lat, lng }, o una stringa con il nome dell'area.",
            anyOf: [
              {
                type: "object",
                properties: {
                  lat: { type: "number" },
                  lng: { type: "number" },
                },
                required: ["lat", "lng"],
              },
              { type: "string" },
            ],
          },
          radius_km: {
            type: "number",
            description: "Raggio di ricerca in km. Default 1.",
          },
          category: {
            type: "string",
            description:
              "Filtro categoria opzionale (es. 'Caffè', 'Libreria', 'Ristorante').",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_activities",
      description:
        "Trasforma una lista di place in suggerimenti completi (why_text serif, bullet 'cosa aspettarsi', fact-strip).",
      parameters: {
        type: "object",
        properties: {
          seeds: {
            type: "array",
            description: "I place restituiti da search_places.",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                category: { type: "string" },
                lat: { type: "number" },
                lng: { type: "number" },
                photo_url: { type: "string" },
                distance_m: { type: "number" },
                rating: { type: "number" },
                price_level: { type: "number" },
                address: { type: "string" },
              },
              required: [
                "id",
                "name",
                "category",
                "lat",
                "lng",
                "photo_url",
                "distance_m",
              ],
            },
          },
          style: {
            type: "string",
            description:
              "Carattere desiderato: 'tranquillo', 'energico', 'veloce', ecc.",
          },
          context: {
            type: "string",
            description:
              "Testo libero col contesto del giorno (così il why_text è coerente).",
          },
        },
        required: ["seeds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_activity_to_day",
      description:
        "Aggiunge un place come nuova attività di un giorno specifico.",
      parameters: {
        type: "object",
        properties: {
          day_num: { type: "number" },
          place_id: { type: "string" },
        },
        required: ["day_num", "place_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_wishlist",
      description: "Salva un place nella wishlist generica del viaggio.",
      parameters: {
        type: "object",
        properties: { place_id: { type: "string" } },
        required: ["place_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_stay",
      description: "Imposta o cambia il pernottamento di un giorno.",
      parameters: {
        type: "object",
        properties: {
          day_num: { type: "number" },
          stay: { type: "string" },
        },
        required: ["day_num", "stay"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_on_map",
      description: "Centra la mappa su un place specifico.",
      parameters: {
        type: "object",
        properties: { place_id: { type: "string" } },
        required: ["place_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_user_preferences",
      description:
        "Chiede all'utente una preferenza concreta con opzioni rapide (chip). Usa per scegliere fra 2-4 alternative chiare.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["question"],
      },
    },
  },
];
