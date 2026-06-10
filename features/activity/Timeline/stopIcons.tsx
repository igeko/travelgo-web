import { createElement, type ComponentType, type ReactNode } from "react";
import {
  IconCoffee, IconSoup, IconGlassFull, IconCake, IconCamera, IconMountain,
  IconBuildingMonument, IconBuildingBank, IconBed, IconShoppingBag,
  IconBuildingStore, IconTicket, IconWalk, IconBike, IconBus, IconCar,
  IconTrain, IconBeach, IconSwimming, IconTree, IconStar, IconMusic,
  IconInfoCircle, IconGift, IconTent, IconHome, IconBuildingCottage,
} from "@/components/ui/icons";
import { EXPLORE_CATEGORY_TREE } from "@/features/explore/categories";

/* ─────────────────────────────────────────────────────────────────
   Set fisso di icone per gli "stop" (attività + pernottamenti).
   La chiave viene salvata in activity.icon; la Timeline la risolve.
   `category` raggruppa le voci nel picker — `sleep` è dedicata
   ai pernottamenti, le altre alle activity.
───────────────────────────────────────────────────────────────── */

type IconCmp = ComponentType<{ size?: number; className?: string }>;

export type StopIconCategory =
  | "food"
  | "sights"
  | "shop"
  | "transport"
  | "nature"
  | "sleep"
  | "other";

/** Ordine canonico delle categorie nel picker (tab/sezioni). */
export const STOP_ICON_CATEGORIES: StopIconCategory[] = [
  "food", "sights", "shop", "transport", "nature", "sleep", "other",
];

/** Le label sono internazionalizzate a runtime (Timeline.stopIcons.<key>). */
export type StopIconOption = {
  key: string;
  Icon: IconCmp;
  category: StopIconCategory;
};

export const STOP_ICONS: StopIconOption[] = [
  // Food & drinks
  { key: "coffee",    Icon: IconCoffee,           category: "food" },
  { key: "food",      Icon: IconSoup,             category: "food" },
  { key: "drink",     Icon: IconGlassFull,        category: "food" },
  { key: "dessert",   Icon: IconCake,             category: "food" },
  // Sights / culture
  { key: "photo",     Icon: IconCamera,           category: "sights" },
  { key: "view",      Icon: IconMountain,         category: "sights" },
  { key: "monument",  Icon: IconBuildingMonument, category: "sights" },
  { key: "museum",    Icon: IconBuildingBank,     category: "sights" },
  // Shop
  { key: "shop",      Icon: IconShoppingBag,      category: "shop" },
  { key: "market",    Icon: IconBuildingStore,    category: "shop" },
  { key: "ticket",    Icon: IconTicket,           category: "shop" },
  // Transport
  { key: "walk",      Icon: IconWalk,             category: "transport" },
  { key: "bike",      Icon: IconBike,             category: "transport" },
  { key: "bus",       Icon: IconBus,              category: "transport" },
  { key: "car",       Icon: IconCar,              category: "transport" },
  { key: "train",     Icon: IconTrain,            category: "transport" },
  // Nature
  { key: "beach",     Icon: IconBeach,            category: "nature" },
  { key: "swim",      Icon: IconSwimming,         category: "nature" },
  { key: "park",      Icon: IconTree,             category: "nature" },
  // Sleep (legacy stop-icons; il nuovo IconPicker usa EXPLORE_CATEGORY_TREE)
  { key: "bed",       Icon: IconBed,              category: "sleep" },
  { key: "tent",      Icon: IconTent,             category: "sleep" },
  { key: "house",     Icon: IconHome,             category: "sleep" },
  { key: "ryokan",    Icon: IconBuildingCottage,  category: "sleep" },
  // Other
  { key: "rest",      Icon: IconBed,              category: "other" },
  { key: "star",      Icon: IconStar,             category: "other" },
  { key: "music",     Icon: IconMusic,            category: "other" },
  { key: "info",      Icon: IconInfoCircle,       category: "other" },
  { key: "gift",      Icon: IconGift,             category: "other" },
];

/** Index globale.
 *
 *  Il nuovo IconPicker persiste valori da `EXPLORE_CATEGORY_TREE`
 *  (es. `caffe`, `monumenti`, `hotel`) — quindi `getStopIcon` deve
 *  riuscire a risolverli. Ordine:
 *    1. STOP_ICONS legacy (back-compat: `coffee`, `view`, `bed`, …)
 *    2. EXPLORE_CATEGORY_TREE subs (la nuova fonte canonica)
 *
 *  Le chiavi LEGACY vincono in caso di clash sul nome (es. STOP `bed`
 *  → IconBed mentre EXPLORE non lo definisce: nessun conflitto). I sub
 *  EXPLORE riempiono le chiavi rimanenti (`caffe`, `ristoranti`, `bar`,
 *  `street`, `mercati`, `musei`, `monumenti`, `culto`, `parchi`, `viste`,
 *  `parking`, `hotel`, `bnb`, `ostello`, `appartamenti`, `camping`). */
const BY_KEY = new Map<string, IconCmp>();
for (const { key, Icon } of STOP_ICONS) BY_KEY.set(key, Icon);
for (const macro of EXPLORE_CATEGORY_TREE) {
  for (const sub of macro.subs) {
    if (!BY_KEY.has(sub.id)) BY_KEY.set(sub.id, sub.icon);
  }
}

/** Componente icona per una chiave (o null se sconosciuta). */
export function getStopIcon(key?: string | null): IconCmp | null {
  if (!key) return null;
  return BY_KEY.get(key) ?? null;
}

/** Nodo icona pronto da renderizzare (o null). Evita JSX con componente
 *  dinamico nelle render (regola react-hooks/static-components). */
export function stopIconNode(key?: string | null): ReactNode {
  const Icon = getStopIcon(key);
  return Icon ? createElement(Icon) : null;
}
