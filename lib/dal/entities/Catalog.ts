/**
 * lib/dal/entities/Catalog.ts
 * ─────────────────────────────────────────────────────────────────
 * The place-catalog import pipeline: import jobs (`import_jobs`) and
 * imported places (`catalog_places`).
 *
 * These operations run with the service-role client (admin-only),
 * so build this through `serviceDal()`.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "../supabase";
import { CatalogTable } from "../tables";
import { DalError, type DalResult } from "../types";

type Row = Record<string, unknown>;

export class Catalog {
  constructor(private readonly db: SupabaseClient) {}

  // ── Import jobs ──────────────────────────────────────────────────

  async listJobs(limit = 50): Promise<DalResult<Row[]>> {
    const { data, error } = await this.db
      .from(CatalogTable.ImportJobs)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: (data ?? []) as Row[], error: null };
  }

  async getJob(id: string): Promise<DalResult<Row>> {
    const { data, error } = await this.db
      .from(CatalogTable.ImportJobs)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as Row, error: null };
  }

  async createJob(values: Row): Promise<DalResult<Row>> {
    const { data, error } = await this.db
      .from(CatalogTable.ImportJobs)
      .insert(values)
      .select("*")
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as Row, error: null };
  }

  async updateJob(id: string, patch: Row): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(CatalogTable.ImportJobs)
      .update(patch)
      .eq("id", id);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  async getJobTotals(
    id: string,
  ): Promise<DalResult<{ total_saved: number | null; total_embedded: number | null }>> {
    const { data, error } = await this.db
      .from(CatalogTable.ImportJobs)
      .select("total_saved,total_embedded")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return {
      data: data as { total_saved: number | null; total_embedded: number | null },
      error: null,
    };
  }

  /** Delete a job, but never one that is currently running. */
  async deleteJob(id: string): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(CatalogTable.ImportJobs)
      .delete()
      .eq("id", id)
      .neq("status", "running");

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }

  // ── Places ───────────────────────────────────────────────────────

  async upsertPlace(values: Row): Promise<DalResult<{ id: string }>> {
    const { data, error } = await this.db
      .from(CatalogTable.Places)
      .upsert(values, { onConflict: "source,source_id" })
      .select("id")
      .single();

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: data as { id: string }, error: null };
  }

  async setPlaceEmbedding(id: string, embedding: number[]): Promise<DalResult<true>> {
    const { error } = await this.db
      .from(CatalogTable.Places)
      .update({ embedding, embedded_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { data: null, error: new DalError(error.message, error.code) };
    return { data: true, error: null };
  }
}
