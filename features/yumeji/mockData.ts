/**
 * Dati di prova per la sezione Yume.
 *
 * ⚠️ PLACEHOLDER · da sostituire con il data layer reale (DAL `lib/dal/yumeji.ts`
 * + hook `useYumeji` / `useYumejiForTrip`) descritto in docs/design/yumeji.md.
 * I `thumb` sono gradienti finché non colleghiamo le immagini reali delle activity.
 */

export type YumeItem = {
  id: string;
  /** Nome dell'activity */
  name: string;
  /** Zona / quartiere — prima parte dell'eyebrow operativo */
  zone: string;
  /** Durata stimata, es. "1h", "1h 30" */
  duration: string;
  /** Prezzo display, es. "free", "€32" */
  price: string;
  /** Gradiente placeholder al posto della foto */
  thumb: string;
  /** Marcato come tappa imperdibile */
  priority: "must" | null;
  /** Se schedulato in un giorno del trip corrente */
  scheduled: { day: string; time: string } | null;
};

/** Yume con match geografico sul trip Tokyo (vista in trip-context). */
export const MOCK_YUME_TOKYO: YumeItem[] = [
  { id: "sensoji",   name: "Sensō-ji",        zone: "Asakusa",  duration: "1h",    price: "free", thumb: "linear-gradient(160deg,#c4744a,#4c1f0a)", priority: "must", scheduled: null },
  { id: "teamlab",   name: "teamLab Planets", zone: "Toyosu",   duration: "3h",    price: "€32",  thumb: "linear-gradient(160deg,#a8c5d6,#475565)", priority: null,   scheduled: null },
  { id: "tsukiji",   name: "Mercato Tsukiji", zone: "Chuo",     duration: "2h",    price: "€20",  thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)", priority: "must", scheduled: { day: "D2", time: "8:00" } },
  { id: "goldengai", name: "Golden Gai bars", zone: "Shinjuku", duration: "2h",    price: "€40",  thumb: "linear-gradient(160deg,#e8c179,#84571c)", priority: null,   scheduled: null },
  { id: "yoyogi",    name: "Yoyogi park",     zone: "Shibuya",  duration: "2h",    price: "€10",  thumb: "linear-gradient(160deg,#9bbf9a,#557a45)", priority: null,   scheduled: null },
  { id: "skytree",   name: "Tokyo Skytree",   zone: "Sumida",   duration: "1h 30", price: "€25",  thumb: "linear-gradient(160deg,#7a8aa3,#1a2840)", priority: null,   scheduled: null },
];

/** Yume di altre destinazioni — visibili nella vista global (fuori trip). */
export const MOCK_YUME_GLOBAL: YumeItem[] = [
  { id: "guell",    name: "Park Güell",        zone: "Barcellona", duration: "2h", price: "€25", thumb: "linear-gradient(160deg,#b8a8c9,#5d4a7a)", priority: null,   scheduled: null },
  { id: "coloss",   name: "Colosseo",          zone: "Roma",       duration: "2h", price: "€18", thumb: "linear-gradient(160deg,#c4744a,#4c1f0a)", priority: "must", scheduled: null },
  { id: "sintra",   name: "Palácio Sintra",    zone: "Sintra",     duration: "3h", price: "€20", thumb: "linear-gradient(160deg,#a8d6d2,#5f9e9a)", priority: null,   scheduled: null },
  { id: "trastev",  name: "Cena a Trastevere", zone: "Roma",       duration: "2h", price: "€35", thumb: "linear-gradient(160deg,#d4a674,#4c3a2a)", priority: null,   scheduled: null },
];

export const MOCK_YUME_ALL: YumeItem[] = [...MOCK_YUME_TOKYO, ...MOCK_YUME_GLOBAL];

export type YumeChip = {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
};

/** Chip di default in trip-context (filtraggio reale = parte dati). */
export const MOCK_TRIP_CHIPS: YumeChip[] = [
  { id: "geo", label: "Per Tokyo", count: 5, active: true },
  { id: "unscheduled", label: "Da schedulare", count: 5, active: true },
];
