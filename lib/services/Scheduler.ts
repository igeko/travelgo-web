/**
 * lib/services/Scheduler.ts
 * ─────────────────────────────────────────────────────────────────
 * The single, canonical way to SCHEDULE activities onto days.
 *
 * Model: an activity is an entity (`activities`, owned & edited via
 * YumeService); putting it on a day is a scheduled instance
 * (`scheduled_activities`). This service touches ONLY scheduling/
 * timeline state — it never creates, edits or searches entities
 * (those live in YumeService). For a brand-new activity added to a
 * day it delegates entity creation to YumeService.
 * ─────────────────────────────────────────────────────────────────
 */

import { getAI, AI_MODELS } from "@/lib/ai/provider";
import type { Dal, Activity } from "@/lib/dal";
import { notFound, badRequest, upstream } from "@/lib/api/errors";
import { pickFields } from "@/lib/api/validation";
import { unwrap } from "./util";
import type { YumeService } from "./YumeService";

const INSTANCE_FIELDS = [
  "slot", "time", "position",
  "type", "fuzzy", "instance_note", "booking_status",
  "bridge_in_json", "bridge_out_json",
] as const;

const ORGANIZE_PROMPT = `Sei un pianificatore di itinerari di viaggio esperto.
Ricevi la lista delle attività di un singolo giorno in JSON.
Riordinale in modo logico: rispetta gli orari esistenti dove specificati,
raggruppa per slot (morning/afternoon/evening/night), sequenza geografica sensata.
Per ogni attività di tipo "move" (spostamento), mettila tra i due blocchi che collega.
Rispondi SOLO con un array JSON delle attività riordinate, con position da 1 in poi.
Non aggiungere o rimuovere attività. Non modificare campi diversi da position e slot.
Formato: [{ "id": "...", "position": 1, "slot": "morning" }, ...]`;

export class Scheduler {
  constructor(
    private readonly dal: Dal,
    /** Entity service — owns activity create/edit; used to add new entities. */
    private readonly yumes: YumeService,
  ) {}

  /** All activities scheduled on a day (entity + instance merged). */
  listForDay(dayId: string): Promise<Activity[]> {
    return this.dal.trips.getDayActivities(dayId);
  }

  /**
   * Schedule an activity on a day. If `entity_id` (or `activity_id`) is
   * given, the existing entity is scheduled; otherwise a NEW entity is
   * created via YumeService and rolled back if scheduling fails.
   * Returns the merged block.
   */
  async addToDay(dayId: string, body: Record<string, unknown>): Promise<Activity> {
    const tripId = await this.dal.trips.tripIdForDay(dayId);
    if (!tripId) throw notFound("Day not found");

    const existingId =
      typeof body.entity_id === "string" ? body.entity_id
      : typeof body.activity_id === "string" ? body.activity_id
      : null;

    let activityId: string;
    let createdEntityId: string | null = null;

    if (existingId) {
      // Idempotent: an entity already scheduled on this day (UNIQUE
      // activity_id+day_id) must not be inserted twice — return the
      // existing occurrence so the caller can open/edit it instead.
      const existing = (await this.listForDay(dayId)).find(
        (b) => b.activity_id === existingId,
      );
      if (existing) return existing;
      activityId = existingId;
    } else {
      // New activity → delegate entity creation to the entity service.
      const activity = await this.yumes.create(body);
      activityId = activity.id;
      createdEntityId = activity.id;
    }

    try {
      const scheduled = unwrap(
        await this.dal.trips.scheduleActivity({
          activity_id: activityId,
          day_id: dayId,
          ...pickFields(body, INSTANCE_FIELDS),
        } as Record<string, unknown>),
      );
      const block = (await this.listForDay(dayId)).find((a) => a.id === scheduled.id);
      if (!block) throw notFound("Scheduled activity not found after creation");
      return block;
    } catch (err) {
      if (createdEntityId) await this.yumes.remove(createdEntityId);
      throw err;
    }
  }

  /** Update instance/timeline fields for one scheduled occurrence. */
  async updateInstance(scheduledId: string, body: Record<string, unknown>): Promise<void> {
    const patch = pickFields(body, INSTANCE_FIELDS);
    if (Object.keys(patch).length === 0) throw badRequest("No valid fields to update");
    unwrap(await this.dal.trips.updateSchedule(scheduledId, patch as Record<string, unknown>));
  }

  /** Set a transport bridge (in/out) on a scheduled occurrence. */
  async setBridge(
    scheduledId: string,
    direction: "in" | "out",
    bridge: Record<string, unknown> | null,
  ): Promise<void> {
    if (direction !== "in" && direction !== "out") throw badRequest("direction must be 'in' or 'out'");
    const field = direction === "in" ? "bridge_in_json" : "bridge_out_json";
    unwrap(await this.dal.trips.updateSchedule(scheduledId, { [field]: bridge ?? null }));
  }

  /** Remove an occurrence from its day. The entity is left intact. */
  async removeFromDay(scheduledId: string): Promise<void> {
    unwrap(await this.dal.trips.unscheduleActivity(scheduledId));
  }

  /** Apply position/slot changes for several occurrences on a day. */
  async reorder(
    dayId: string,
    items: { id: string; position: number; slot?: string | null }[],
  ): Promise<Activity[]> {
    await Promise.all(
      items.map((it) =>
        this.dal.trips.updateSchedule(it.id, {
          position: it.position,
          slot: (it.slot ?? null) as Activity["slot"],
        }),
      ),
    );
    return this.listForDay(dayId);
  }

  /** Ask the model to reorder a day, then persist the new positions. */
  async organize(dayId: string): Promise<Activity[]> {
    const blocks = await this.listForDay(dayId);
    if (blocks.length === 0) return [];

    const payload = blocks.map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title,
      time: b.time,
      slot: b.slot,
      position: b.position,
      location: b.location,
      fuzzy: b.fuzzy,
    }));

    let reordered: { id: string; position: number; slot: string }[] = [];
    try {
      const openai = getAI();
      const completion = await openai.chat.completions.create({
        model: AI_MODELS.fast,
        temperature: 0.2,
        messages: [
          { role: "system", content: ORGANIZE_PROMPT },
          { role: "user", content: JSON.stringify(payload, null, 2) },
        ],
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0].message.content ?? "{}";
      const parsed = JSON.parse(raw);
      reordered = Array.isArray(parsed) ? parsed : (parsed.blocks ?? parsed.result ?? []);
    } catch (err) {
      console.error("[Scheduler.organize] OpenAI error:", err);
      throw upstream("AI organize failed");
    }

    if (reordered.length === 0) return blocks;
    return this.reorder(dayId, reordered);
  }
}
