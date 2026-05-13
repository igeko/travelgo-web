/**
 * Sandbox component registry.
 * Add an entry here every time you create a new variants page.
 * The order is the one shown in the sidebar.
 */
export type SandboxEntry = {
  slug: string;
  title: string;
  group: "Atoms" | "Features";
  /** Optional subgroup label within a group (e.g. "Activity" inside Features) */
  subgroup?: string;
  description?: string;
};

export const sandboxRegistry: SandboxEntry[] = [
  // ── Atoms ────────────────────────────────────────────────────────
  {
    slug: "button",
    title: "Button",
    group: "Atoms",
    description: "Button system · 3 sizes, 5 variants, 4 tones, icon-only/label",
  },
  // Fields subgroup
  {
    slug: "address-field",
    title: "AddressField",
    group: "Atoms",
    subgroup: "Fields",
    description: "Google Places autocomplete · returns structured PlaceResult",
  },
  {
    slug: "budget-input",
    title: "BudgetInput",
    group: "Atoms",
    subgroup: "Fields",
    description: "Pill input · amount + currency cycle + optional conversion",
  },
  {
    slug: "cycle-pill",
    title: "CyclePill",
    group: "Atoms",
    subgroup: "Fields",
    description: "Ink pill with colored dot · cycles through options on click",
  },
  {
    slug: "period-bar",
    title: "PeriodBar",
    group: "Atoms",
    subgroup: "Fields",
    description: "Day-period segmented control · morning/afternoon/evening/night",
  },
  {
    slug: "soft-field",
    title: "SoftField",
    group: "Atoms",
    subgroup: "Fields",
    description: "Pill text input / textarea · floating label, prefix, suffix, counter",
  },
  // Map subgroup
  {
    slug: "map",
    title: "Map",
    group: "Atoms",
    subgroup: "Map",
    description: "Google Maps JS SDK wrapper · center + zoom, smooth pan, loading state",
  },
  {
    slug: "route-map",
    title: "RouteMap",
    group: "Atoms",
    subgroup: "Map",
    description: "Numbered orange markers + Routes API polyline · accepts PlaceResult[]",
  },
  // ── Features ─────────────────────────────────────────────────────
  // App subgroup
  {
    slug: "app-header",
    title: "AppHeader",
    group: "Features",
    subgroup: "App",
    description: "Two-row sticky header · brand + nav + trip context + tabs + edit mode chip",
  },
  // Activity subgroup
  {
    slug: "activity-row",
    title: "ActivityRow",
    group: "Features",
    subgroup: "Activity",
    description: "Timeline activity row · all state variants",
  },
  {
    slug: "activity-edit-form",
    title: "ActivityEditForm",
    group: "Features",
    subgroup: "Activity",
    description: "Activity edit form · title, status, period + time picker, address, budget",
  },
  // Day subgroup
  {
    slug: "day-list",
    title: "DayList",
    group: "Features",
    subgroup: "Day",
    description: "Trip days aside · clickable selection",
  },
  {
    slug: "hero-banner",
    title: "HeroBanner",
    group: "Features",
    subgroup: "Day",
    description: "Full-bleed hero image with text overlay + optional sub-banner",
  },
];
