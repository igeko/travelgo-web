/**
 * Mappa il modello reale `Yume` (DbActivity + shared_trip_ids + owner) sul
 * view-model `YumeListItem` consumato da YumeList. Mostriamo solo i campi che
 * abbiamo davvero: titolo, location, prezzo (da budget), immagine, owner.
 */
import type { Yume } from "@/lib/client";
import type { YumeListItem } from "./mockData";

const CURRENCY_SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", JPY: "¥" };

export function formatBudget(amount: number | null, currency: string | null): string | null {
  if (amount == null) return null;
  if (amount === 0) return "Gratis";
  const sym = currency ? (CURRENCY_SYMBOL[currency] ?? `${currency} `) : "";
  return `${sym}${amount}`;
}

export function yumeToListItem(y: Yume): YumeListItem {
  return {
    id: y.id,
    title: y.title,
    location: y.location,
    price: formatBudget(y.budget_amount, y.budget_currency),
    imageUrl: y.hero_image,
    owner: y.owner ? { name: y.owner.displayName ?? "", avatarUrl: y.owner.avatarUrl } : null,
  };
}
