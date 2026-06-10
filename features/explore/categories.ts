/**
 * Explore category tree — the single, language-agnostic source of truth.
 *
 * No labels live here: only stable ids (used for selection, pinning, analytics
 * and persistence — none of which should change with the UI language), the
 * icon, and the OSM filter the host uses to query places. Labels are resolved
 * separately from the `ExploreCategories` message namespace via
 * `useExploreCategories()`.
 *
 * The `osm` filter is reserved for a future place-search layer; the
 * ExploreToolbar itself ignores it.
 */

import {
  IconBackpack,
  IconBed,
  IconBeer,
  IconBuildingBank,
  IconBuildingChurch,
  IconBuildingCommunity,
  IconBuildingCottage,
  IconBuildingMonument,
  IconBurger,
  IconCoffee,
  IconCompass,
  IconEye,
  IconHome,
  IconParking,
  IconShoppingBag,
  IconSoup,
  IconTent,
  IconToolsKitchen2,
  IconTree,
  type Icon,
} from "@/components/ui/icons";

export type ExploreSubcategoryDef = {
  id: string;
  icon: Icon;
  /** OSM tag filter for the (Overpass) place-search layer. */
  osm: string;
  /** Google Places Text Search term, used for the in-viewport category search. */
  google: string;
};

export type ExploreMacroCategoryDef = {
  id: string;
  icon: Icon;
  subs: ExploreSubcategoryDef[];
};

/**
 * Mappa ExploreToolbar sub-category id → STOP_ICONS key (cfr.
 * `features/activity/Timeline/stopIcons.tsx`). Quando l'utente aggiunge
 * un'attività a partire da un pin di categoria della mappa, l'icona
 * della sub viene salvata su `activities.icon` e la Timeline la riprende
 * come glifo della tappa. Le sub di "dormi" sono incluse per simmetria,
 * anche se il flusso accomodation segue di norma una strada parallela.
 */
export const EXPLORE_SUB_TO_ICON_KEY: Record<string, string> = {
  // Esplora
  musei: "museum",
  monumenti: "monument",
  culto: "monument",
  parchi: "park",
  viste: "view",
  parking: "car",
  // Mangia
  ristoranti: "food",
  caffe: "coffee",
  bar: "drink",
  street: "food",
  mercati: "market",
  // Dormi
  hotel: "rest",
  bnb: "rest",
  ostello: "rest",
  appartamenti: "rest",
  camping: "rest",
};

export const EXPLORE_CATEGORY_TREE: ExploreMacroCategoryDef[] = [
  {
    id: "dormi",
    icon: IconBed,
    subs: [
      { id: "hotel", icon: IconBuildingCottage, osm: '"tourism"="hotel"', google: "hotel" },
      { id: "bnb", icon: IconBuildingCommunity, osm: '"tourism"~"guest_house|bed_and_breakfast"', google: "bed and breakfast" },
      { id: "ostello", icon: IconBackpack, osm: '"tourism"="hostel"', google: "hostel" },
      { id: "appartamenti", icon: IconHome, osm: '"tourism"="apartment"', google: "apartment rental" },
      { id: "camping", icon: IconTent, osm: '"tourism"~"camp_site|caravan_site"', google: "campground" },
    ],
  },
  {
    id: "mangia",
    icon: IconSoup,
    subs: [
      { id: "ristoranti", icon: IconToolsKitchen2, osm: '"amenity"="restaurant"', google: "restaurant" },
      { id: "caffe", icon: IconCoffee, osm: '"amenity"="cafe"', google: "cafe" },
      { id: "bar", icon: IconBeer, osm: '"amenity"~"bar|pub"', google: "bar pub" },
      { id: "street", icon: IconBurger, osm: '"amenity"="fast_food"', google: "street food" },
      { id: "mercati", icon: IconShoppingBag, osm: '"amenity"="marketplace"', google: "market" },
    ],
  },
  {
    id: "esplora",
    icon: IconCompass,
    subs: [
      { id: "musei", icon: IconBuildingBank, osm: '"tourism"~"museum|gallery|artwork"', google: "museum" },
      { id: "monumenti", icon: IconBuildingMonument, osm: '"historic"~"castle|monument|ruins|memorial|fort|palace"', google: "monument landmark" },
      { id: "culto", icon: IconBuildingChurch, osm: '"historic"~"temple|shrine|cathedral|monastery"', google: "temple church place of worship" },
      { id: "parchi", icon: IconTree, osm: '"leisure"~"park|garden|nature_reserve"', google: "park" },
      { id: "viste", icon: IconEye, osm: '"tourism"="viewpoint"', google: "scenic viewpoint" },
      { id: "parking", icon: IconParking, osm: '"amenity"="parking"', google: "parking" },
    ],
  },
];
