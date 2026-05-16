/**
 * POST /api/go
 *
 * Body: { context: GoContext, step: 1 | 2, userChoice?: string }
 *
 * Costruisce il prompt e interpella l'LLM con function calling forzato
 * verso uno dei widget registrati.
 * Restituisce GoApiResponse { text: string, widget: GoResponse }.
 */

import { NextResponse } from "next/server";
import type { GoContext, GoResponse } from "@/features/go/types";
import { WIDGET_TOOL_DEFINITIONS } from "@/features/go/widgets/tool-definitions";
import { buildPromptPayload } from "@/features/go/prompt";

export type GoApiResponse = {
  text: string;
  widget: GoResponse;
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: { context: GoContext; step: 1 | 2; userChoice?: string };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { context, step = 1, userChoice } = body;

  // Costruisce il prompt (visibile anche nel debug panel della sandbox)
  const promptPayload = buildPromptPayload(
    context,
    WIDGET_TOOL_DEFINITIONS,
    step,
    userChoice,
  );

  // ── TODO: sostituire il mock con la chiamata OpenAI reale ──────
  //
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const completion = await openai.chat.completions.create({
  //   model: "gpt-4o-mini",
  //   messages: [
  //     { role: "system", content: promptPayload.system },
  //     { role: "user",   content: promptPayload.userMessage },
  //   ],
  //   tools: promptPayload.tools,
  //   tool_choice: promptPayload.tool_choice,
  // });
  // const call = completion.choices[0].message.tool_calls?.[0];
  // const response: GoApiResponse = {
  //   text: completion.choices[0].message.content ?? "",
  //   widget: {
  //     widget: call.function.name,
  //     payload: JSON.parse(call.function.arguments),
  //   },
  // };
  // return NextResponse.json(response);
  // ──────────────────────────────────────────────────────────────

  const response = await mockGoResponse(context, step, userChoice);
  return NextResponse.json(response);
}

/* ─────────────────────────────────────────────────────────────────
   Mock — da rimuovere quando si integra OpenAI
───────────────────────────────────────────────────────────────── */

async function mockGoResponse(
  context: GoContext,
  step: 1 | 2,
  userChoice?: string,
): Promise<GoApiResponse> {
  await new Promise((r) => setTimeout(r, 900));

  const { trip } = context;
  const dest = trip.destination || "Japan";

  // Step 1: saluto + quick-reply
  if (step === 1) {
    return {
      text: `Ciao! Sono Go, il tuo assistente di viaggio. Cosa ti serve per il tuo viaggio a ${dest}?`,
      widget: {
        widget: "quick-reply",
        payload: {
          options: [
            { value: "posto_da_vedere", label: "Un posto da vedere", emoji: "🏛️" },
            { value: "food_spot",       label: "Un food spot",       emoji: "🍜" },
            { value: "esperienza",      label: "Un'esperienza locale", emoji: "🎋" },
            { value: "insolito",        label: "Qualcosa di insolito", emoji: "✨" },
          ],
        },
      },
    };
  }

  // Step 2: risultati dopo la scelta
  const choice = userChoice ?? "";

  if (choice.includes("food") || choice === "food_spot") {
    return {
      text: `Perfetto! Ecco i food spot migliori a ${dest} che non puoi perderti.`,
      widget: {
        widget: "suggestions",
        payload: {
          title: `Food spot · ${dest}`,
          subtitle: "Selezionati per te",
          primaryAction: "add_to_wishlist",
          items: [
            {
              id: "f1", title: "Ichiran Ramen", tag: "Ramen", emoji: "🍜", subtitle: "Shinjuku · aperto 24h",
              distance: "350 m",
              description: "Ramen in box individuali, dove ogni ciotola è un momento privato. Il brodo tonkotsu è una delle grandi costanti di Tokyo — nessun cameriere, nessuna distrazione.",
              bullets: ["Ordine via scheda cartacea", "Aperto 24 ore", "Attesa max 15 min"],
              facts: [{ icon: "clock", label: "24h" }, { icon: "coin", label: "¥1200" }, { icon: "walk", label: "Bassa fatica" }],
            },
            {
              id: "f2", title: "Tsukiji Outer Market", tag: "Street food", emoji: "🐟", subtitle: "Chūō · solo mattina",
              distance: "180 m",
              description: "Il mercato esterno di Tsukiji è rimasto vivo dopo il trasferimento all'ingrosso. Sushi freschissimo, tamagoyaki caldi e granchi al vapore — meglio prima di mezzogiorno.",
              bullets: ["Arriva entro le 11:00", "Coda ai banchi più famosi", "Cash only in molti stand"],
              facts: [{ icon: "clock", label: "6:00–14:00" }, { icon: "coin", label: "¥500–2000" }, { icon: "map-pin", label: "Chūō" }],
            },
            {
              id: "f3", title: "Afuri Ramen", tag: "Yuzu ramen", emoji: "🍋", subtitle: "Harajuku · consigliato",
              distance: "620 m",
              description: "Ramen leggero al yuzu — un'alternativa più fresca e agrumata ai soliti brodi pesanti. La sede di Harajuku è piccola ma con buona rotazione.",
              bullets: ["Prova lo shio al yuzu", "Porzioni medie", "Possibile coda all'ora di punta"],
              facts: [{ icon: "clock", label: "11:00–23:00" }, { icon: "coin", label: "¥1000" }, { icon: "walk", label: "Media fatica" }],
            },
            {
              id: "f4", title: "Depachika Isetan", tag: "Basement gourmet", emoji: "🧁", subtitle: "Shinjuku · B1-B2",
              distance: "900 m",
              description: "Il piano interrato di Isetan è un pellegrinaggio obbligatorio. Dolci di pasticceria, bentō artigianali, formaggi importati e tutto quello che non ti aspetti in un grande magazzino.",
              bullets: ["Senza fretta, prendi un vassoio", "Ottimo per i bentō della sera", "B1 dolci, B2 salati"],
              facts: [{ icon: "clock", label: "10:00–20:00" }, { icon: "coin", label: "¥300–3000" }, { icon: "map-pin", label: "Shinjuku" }],
            },
          ],
        },
      },
    };
  }

  if (choice.includes("esperienza") || choice === "esperienza") {
    return {
      text: `Hai scelto bene! Ecco alcune esperienze locali autentiche a ${dest}.`,
      widget: {
        widget: "carousel",
        payload: {
          title: `Esperienze · ${dest}`,
          items: [
            { id: "e1", title: "Cerimonia del tè", tag: "Cultura", badge: "⭐ 4.9", placeholderColor: "#c5b0a0" },
            { id: "e2", title: "Foresta di bambù · Arashiyama", tag: "Natura", badge: "⭐ 4.7", placeholderColor: "#a0c5a8" },
            { id: "e3", title: "Calligrafia tradizionale", tag: "Arte", badge: "⭐ 4.8", placeholderColor: "#b0b0c5" },
            { id: "e4", title: "Mercato di Nishiki", tag: "Cibo", badge: "⭐ 4.6", placeholderColor: "#c5c0a0" },
          ],
        },
      },
    };
  }

  if (choice.includes("insolito") || choice === "insolito") {
    return {
      text: `Off the beaten path! Ecco le gemme nascoste di ${dest}.`,
      widget: {
        widget: "suggestions",
        payload: {
          title: `Cose insolite · ${dest}`,
          subtitle: "Pochi turisti, molto fascino",
          primaryAction: "add_to_wishlist",
          items: [
            {
              id: "i1", title: "Yanaka · il vecchio Tokyo", tag: "Quartiere", emoji: "🏮", subtitle: "Taitō · anni '30",
              distance: "2.1 km",
              description: "Un quartiere sfuggito alle bombe e alla speculazione. Vicoli stretti, tofu artigianale, gatti ovunque — Tokyo come non ti aspetti.",
              bullets: ["Yanaka Ginza: mercatino pedonale", "Cimitero con sakura in primavera", "Musei di quartiere gratuiti"],
              facts: [{ icon: "clock", label: "Tutto il giorno" }, { icon: "coin", label: "Gratis" }, { icon: "walk", label: "Media fatica" }],
            },
            {
              id: "i2", title: "Koenji · vintage e punk", tag: "Controcultura", emoji: "🎸", subtitle: "Suginami · underground",
              distance: "4.8 km",
              description: "Il quartiere che non si vende ai turisti. Negozi di vinili, punk bars, mercatini di seconda mano — il vero Tokyo alternativo.",
              bullets: ["Record shops nel sottopassaggio", "Locali live ogni sera", "Ottimi izakaya economici"],
              facts: [{ icon: "clock", label: "Da pomeriggio" }, { icon: "coin", label: "¥0–2000" }, { icon: "train", label: "Koenji station" }],
            },
            {
              id: "i3", title: "Museo dei parassiti", tag: "Bizzarro", emoji: "🔬", subtitle: "Meguro · gratuito",
              distance: "3.2 km",
              description: "Uno dei musei più piccoli e specifici al mondo — 45.000 esemplari di parassiti conservati. Fa ridere, disgusta, e insegna più di quanto pensi.",
              bullets: ["Due piani, 1 ora bastano", "Ingresso gratuito", "Il verme da 8,8 m è il highlight"],
              facts: [{ icon: "clock", label: "10:00–17:00" }, { icon: "coin", label: "Gratis" }, { icon: "walk", label: "Bassa fatica" }],
            },
          ],
        },
      },
    };
  }

  // Default: posti da vedere o fallback
  return {
    text: `Ecco i luoghi più belli di ${dest} da non perdere assolutamente.`,
    widget: {
      widget: "carousel",
      payload: {
        title: `Luoghi imperdibili · ${dest}`,
        items: [
          { id: "p1", title: "Tempio Fushimi Inari", tag: "Cultura", badge: "⭐ 4.9", placeholderColor: "#c5b0a0" },
          { id: "p2", title: "Arashiyama · Foresta di bambù", tag: "Natura", badge: "⭐ 4.7", placeholderColor: "#a0c5a8" },
          { id: "p3", title: "Kinkaku-ji · Padiglione d'oro", tag: "Cultura", badge: "⭐ 4.8", placeholderColor: "#d4c88a" },
          { id: "p4", title: "Gion · Quartiere geisha", tag: "Tradizione", badge: "⭐ 4.6", placeholderColor: "#c5a8b0" },
        ],
      },
    },
  };
}
