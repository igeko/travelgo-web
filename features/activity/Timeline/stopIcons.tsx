import { createElement, type ComponentType, type ReactNode } from "react";
import {
  IconCoffee, IconSoup, IconGlassFull, IconCake, IconCamera, IconMountain,
  IconBuildingMonument, IconBuildingBank, IconBed, IconShoppingBag,
  IconBuildingStore, IconTicket, IconWalk, IconBike, IconBus, IconCar,
  IconTrain, IconBeach, IconSwimming, IconTree, IconStar, IconMusic,
  IconInfoCircle, IconGift,
} from "@/components/ui/icons";

/* ─────────────────────────────────────────────────────────────────
   Set fisso di icone per gli "stop" (attività fuzzy).
   La chiave viene salvata in activity.icon; il timeline la risolve.
───────────────────────────────────────────────────────────────── */

type IconCmp = ComponentType<{ size?: number; className?: string }>;

/** Le label sono internazionalizzate a runtime (Timeline.stopIcons.<key>). */
export type StopIconOption = { key: string; Icon: IconCmp };

export const STOP_ICONS: StopIconOption[] = [
  { key: "coffee",    Icon: IconCoffee },
  { key: "food",      Icon: IconSoup },
  { key: "drink",     Icon: IconGlassFull },
  { key: "dessert",   Icon: IconCake },
  { key: "photo",     Icon: IconCamera },
  { key: "view",      Icon: IconMountain },
  { key: "monument",  Icon: IconBuildingMonument },
  { key: "museum",    Icon: IconBuildingBank },
  { key: "rest",      Icon: IconBed },
  { key: "shop",      Icon: IconShoppingBag },
  { key: "market",    Icon: IconBuildingStore },
  { key: "ticket",    Icon: IconTicket },
  { key: "walk",      Icon: IconWalk },
  { key: "bike",      Icon: IconBike },
  { key: "bus",       Icon: IconBus },
  { key: "car",       Icon: IconCar },
  { key: "train",     Icon: IconTrain },
  { key: "beach",     Icon: IconBeach },
  { key: "swim",      Icon: IconSwimming },
  { key: "park",      Icon: IconTree },
  { key: "star",      Icon: IconStar },
  { key: "music",     Icon: IconMusic },
  { key: "info",      Icon: IconInfoCircle },
  { key: "gift",      Icon: IconGift },
];

const BY_KEY = new Map(STOP_ICONS.map((o) => [o.key, o.Icon]));

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
