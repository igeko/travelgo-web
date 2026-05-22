/**
 * Explore category tree — the single, language-agnostic source of truth.
 *
 * No labels live here: only stable ids (used for selection, pinning, analytics
 * and persistence — none of which should change with the UI language), the
 * icon, and the OSM filter the host uses to query places. Labels are resolved
 * separately from the `ExploreCategories` message namespace via
 * `useExploreCategories()`.
 *
 * The `osm` filter is consumed by the place-search layer (see lib/overpass.ts
 * `OSM_PRESETS`); the ExploreToolbar itself ignores it.
 */

import {
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
  /** OSM tag filter for the place-search layer. */
  osm: string;
};

export type ExploreMacroCategoryDef = {
  id: string;
  icon: Icon;
  subs: ExploreSubcategoryDef[];
};

export const EXPLORE_CATEGORY_TREE: ExploreMacroCategoryDef[] = [
  {
    id: "dormi",
    icon: IconBed,
    subs: [
      { id: "hotel", icon: IconBuildingCottage, osm: '"tourism"="hotel"' },
      { id: "bnb", icon: IconBuildingCommunity, osm: '"tourism"~"guest_house|bed_and_breakfast"' },
      { id: "ostello", icon: IconBed, osm: '"tourism"="hostel"' },
      { id: "appartamenti", icon: IconHome, osm: '"tourism"="apartment"' },
      { id: "camping", icon: IconTent, osm: '"tourism"~"camp_site|caravan_site"' },
    ],
  },
  {
    id: "mangia",
    icon: IconSoup,
    subs: [
      { id: "ristoranti", icon: IconToolsKitchen2, osm: '"amenity"="restaurant"' },
      { id: "caffe", icon: IconCoffee, osm: '"amenity"="cafe"' },
      { id: "bar", icon: IconBeer, osm: '"amenity"~"bar|pub"' },
      { id: "street", icon: IconBurger, osm: '"amenity"="fast_food"' },
      { id: "mercati", icon: IconShoppingBag, osm: '"amenity"="marketplace"' },
    ],
  },
  {
    id: "esplora",
    icon: IconCompass,
    subs: [
      { id: "musei", icon: IconBuildingBank, osm: '"tourism"~"museum|gallery|artwork"' },
      { id: "monumenti", icon: IconBuildingMonument, osm: '"historic"~"castle|monument|ruins|memorial|fort|palace"' },
      { id: "culto", icon: IconBuildingChurch, osm: '"historic"~"temple|shrine|cathedral|monastery"' },
      { id: "parchi", icon: IconTree, osm: '"leisure"~"park|garden|nature_reserve"' },
      { id: "viste", icon: IconEye, osm: '"tourism"="viewpoint"' },
    ],
  },
];
