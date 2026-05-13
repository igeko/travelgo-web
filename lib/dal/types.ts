/**
 * lib/dal/types.ts
 * ─────────────────────────────────────────────────────────────────
 * TypeScript types derived from the Supabase schema.
 * These are the raw DB shapes — repositories expose richer domain
 * types built on top of these where needed.
 * ─────────────────────────────────────────────────────────────────
 */

// ── Enums / literals ─────────────────────────────────────────────

export type MemberRole = "owner" | "editor" | "viewer";
export type InviteRole = "editor" | "viewer";

export type DayType =
  | "city"
  | "village"
  | "roadtrip"
  | "nature"
  | "beach"
  | "rest";

export type AccommodationType =
  | "hotel"
  | "bb"
  | "campground"
  | "hostel"
  | "apartment"
  | "ryokan"
  | "other";

export type BudgetStatus = "planned" | "booked" | "paid";

export type ActivitySlot = "morning" | "afternoon" | "evening" | "night";

// ── Database row types ───────────────────────────────────────────

export type DbTrip = {
  id: string;
  title: string;
  subtitle: string | null;
  start_date: string | null;   // ISO date "YYYY-MM-DD"
  end_date: string | null;
  cover_image: string | null;
  budget_total: number | null;
  currency: string;
  local_currency: string;
  display_currency: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbDay = {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;         // ISO date "YYYY-MM-DD"
  city: string | null;
  label: string | null;
  notes: string | null;
  day_type: DayType | null;
  is_ghost: boolean;
  use_previous_accommodation: boolean | null;
  accommodation_type: AccommodationType | null;
  accommodation_name: string | null;
  accommodation_address: string | null;
  accommodation_url: string | null;
  accommodation_notes: string | null;
  accommodation_place_id: string | null;
  accommodation_lat: number | null;
  accommodation_lng: number | null;
  accommodation_cost_amount: number | null;
  accommodation_cost_currency: string | null;
  accommodation_cost_paid: boolean;
  created_at: string;
  updated_at: string;
};

export type DbActivity = {
  id: string;
  day_id: string;
  trip_id: string;
  slot: ActivitySlot | null;
  position: number;
  time: string | null;
  title: string;
  short_desc: string | null;
  details: string | null;
  notes: string | null;
  location: string | null;
  location_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  coords: string | null;       // Postgres point — serialised as "(x,y)"
  icon: string | null;
  category: string | null;
  hero_image: string | null;
  booking: string | null;
  url: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  budget_paid: boolean;
  budget_category: string | null;
  created_at: string;
  updated_at: string;
};

export type DbActivitySection = {
  id: string;
  activity_id: string;
  type: string;
  position: number;
  title: string | null;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DbActivitySidebar = {
  id: string;
  activity_id: string;
  type: string;
  position: number;
  content: Record<string, unknown>;
  created_at: string;
};

export type DbBudgetItem = {
  id: string;
  trip_id: string;
  day_id: string | null;
  activity_id: string | null;
  category: string | null;
  description: string;
  amount: number;
  currency: string;
  status: BudgetStatus | null;
  paid_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTripMember = {
  trip_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
};

export type DbTripInvite = {
  id: string;
  trip_id: string;
  email: string;
  role: InviteRole;
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type DbPhoto = {
  id: string;
  trip_id: string;
  day_id: string | null;
  activity_id: string | null;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  coords: string | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type DbJournalEntry = {
  id: string;
  trip_id: string;
  day_id: string | null;
  activity_id: string | null;
  body: string;
  mood: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTaxonomy = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DbTaxonomyTerm = {
  id: string;
  taxonomy_id: string;
  slug: string;
  label: string;
  icon: string | null;
  description: string | null;
  position: number;
  is_system: boolean | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// ── Generic DAL result type ───────────────────────────────────────

export type DalResult<T> =
  | { data: T; error: null }
  | { data: null; error: DalError };

export class DalError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DalError";
  }
}
