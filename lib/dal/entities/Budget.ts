/**
 * lib/dal/entities/Budget.ts
 * ─────────────────────────────────────────────────────────────────
 * The Budget entity — all DB access for `budget_items`.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { BudgetTable } from "../tables";
import {
  DalError,
  type DalResult,
  type DbBudgetItem,
  type BudgetStatus,
} from "../types";

export type CreateBudgetItemInput = {
  trip_id: string;
  description: string;
  amount: number;
  day_id?: string;
  activity_id?: string;
  category?: string;
  currency?: string;
  status?: BudgetStatus;
  paid_by?: string;
};

export type UpdateBudgetItemInput = Partial<Omit<CreateBudgetItemInput, "trip_id">>;

export type BudgetSummary = {
  total_planned: number;
  total_booked: number;
  total_paid: number;
  currency: string;
};

export class Budget {
  constructor(private readonly db: SupabaseClient) {}

  async listByTrip(tripId: string): Promise<DalResult<DbBudgetItem[]>> {
    const { data, error } = await this.db
      .from(BudgetTable.Items)
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbBudgetItem[], error: null };
  }

  async listByDay(dayId: string): Promise<DalResult<DbBudgetItem[]>> {
    const { data, error } = await this.db
      .from(BudgetTable.Items)
      .select("*")
      .eq("day_id", dayId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbBudgetItem[], error: null };
  }

  async listByActivity(activityId: string): Promise<DalResult<DbBudgetItem[]>> {
    const { data, error } = await this.db
      .from(BudgetTable.Items)
      .select("*")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbBudgetItem[], error: null };
  }

  async findById(id: string): Promise<DalResult<DbBudgetItem>> {
    const { data, error } = await this.db
      .from(BudgetTable.Items)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbBudgetItem, error: null };
  }

  async create(input: CreateBudgetItemInput): Promise<DalResult<DbBudgetItem>> {
    const { data, error } = await this.db
      .from(BudgetTable.Items)
      .insert(input)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbBudgetItem, error: null };
  }

  async update(
    id: string,
    input: UpdateBudgetItemInput,
  ): Promise<DalResult<DbBudgetItem>> {
    const { data, error } = await this.db
      .from(BudgetTable.Items)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as DbBudgetItem, error: null };
  }

  async delete(id: string): Promise<DalResult<true>> {
    const { error } = await this.db.from(BudgetTable.Items).delete().eq("id", id);
    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  /** Per-trip totals grouped by status. */
  async getSummary(tripId: string, currency: string): Promise<DalResult<BudgetSummary>> {
    const { data, error } = await this.db
      .from(BudgetTable.Items)
      .select("status, amount")
      .eq("trip_id", tripId)
      .eq("currency", currency);

    if (error) return { data: null, error: new DalError(error.message, error.code) };

    const items = data as Pick<DbBudgetItem, "status" | "amount">[];
    const sum = (status: BudgetStatus) =>
      items.filter((i) => i.status === status).reduce((acc, i) => acc + Number(i.amount), 0);

    return {
      data: {
        total_planned: sum("planned"),
        total_booked: sum("booked"),
        total_paid: sum("paid"),
        currency,
      },
      error: null,
    };
  }
}
