/**
 * lib/services/FeedbackService.ts
 * ─────────────────────────────────────────────────────────────────
 * Tester / QA notes: submission, role-scoped listing (with author
 * names) and policy-checked updates. Build with a service-scoped DAL.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Dal } from "@/lib/dal";
import { getServiceClient } from "@/lib/dal";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { isUuid, safeHttpUrl } from "@/lib/api/validation";
import { unwrap } from "./util";

const NOTE_TYPES = new Set(["bug", "suggestion", "other"]);
const VALID_STATUSES = ["proposed", "approved", "in_progress", "to_be_tested", "done", "archived"];

export class FeedbackService {
  constructor(private readonly dal: Dal) {}

  async submit(userId: string, body: Record<string, unknown>): Promise<{ id: string }> {
    const type = typeof body.type === "string" ? body.type : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) throw badRequest("Note required");
    if (!NOTE_TYPES.has(type)) throw badRequest("Invalid type");

    let pageUrl: string | null = null;
    if (body.page_url) {
      const safe = safeHttpUrl(body.page_url, { maxLength: 1000 });
      if (!safe) throw badRequest("Invalid page_url");
      pageUrl = safe;
    }

    let tripId: string | null = null;
    if (body.trip_id) {
      if (!isUuid(body.trip_id)) throw badRequest("Invalid trip_id");
      tripId = body.trip_id;
    }

    const { id } = unwrap(
      await this.dal.feedback.create({
        user_id: userId,
        type,
        note: note.slice(0, 4000),
        page_url: pageUrl,
        trip_id: tripId,
      }),
    );
    return { id };
  }

  /** Notes the viewer may see, enriched with author display names. */
  async list(opts: { userId: string; isAdmin: boolean }): Promise<Record<string, unknown>[]> {
    const notes = unwrap(await this.dal.feedback.listForViewer(opts)) as {
      user_id: string;
      [k: string]: unknown;
    }[];

    const adminAuth = getServiceClient().auth.admin;
    const userIds = [...new Set(notes.map((n) => n.user_id).filter((id): id is string => !!id))];
    const names: Record<string, string> = {};
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await adminAuth.getUserById(id);
        const fullName = data?.user?.user_metadata?.full_name;
        names[id] = typeof fullName === "string" && fullName ? fullName : "Unknown";
      }),
    );

    return notes.map((n) => ({ ...n, author_name: names[n.user_id] ?? "Unknown" }));
  }

  /** Update a note. status/fix_notes are admin-only; note edit is author-or-admin. */
  async update(
    id: string,
    body: Record<string, unknown>,
    actor: { userId: string; isAdmin: boolean },
  ): Promise<void> {
    const { status, note, fix_notes } = body as {
      status?: unknown;
      note?: unknown;
      fix_notes?: unknown;
    };
    const updates: Record<string, unknown> = {};

    if (status !== undefined || fix_notes !== undefined) {
      if (!actor.isAdmin) throw forbidden();
      if (status !== undefined) {
        if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
          throw badRequest("Invalid status");
        }
        updates.status = status;
      }
      if (fix_notes !== undefined) {
        updates.fix_notes = typeof fix_notes === "string" && fix_notes.trim() ? fix_notes.trim() : null;
      }
    }

    if (note !== undefined) {
      if (typeof note !== "string" || !note.trim()) throw badRequest("Note cannot be empty");
      const authorId = await this.dal.feedback.getAuthorId(id);
      if (!authorId) throw notFound();
      if (authorId !== actor.userId && !actor.isAdmin) throw forbidden();
      updates.note = note.trim();
    }

    if (Object.keys(updates).length === 0) throw badRequest("Nothing to update");
    unwrap(await this.dal.feedback.update(id, updates));
  }
}
