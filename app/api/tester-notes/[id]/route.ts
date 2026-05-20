import { NextRequest, NextResponse } from "next/server";
import { serverDal, serviceDal } from "@/lib/dal";
import { ADMIN_ROLES } from "@/lib/dal/auth";

const VALID_STATUSES = ["proposed", "approved", "in_progress", "to_be_tested", "done", "archived"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dal = await serverDal();
  const { data: user } = await dal.users.getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = serviceDal();

  const body = await req.json();
  const { status, note, fix_notes } = body;

  const updates: Record<string, unknown> = {};

  // status e fix_notes: solo admin/dev
  if (status !== undefined || fix_notes !== undefined) {
    const isAdmin = await svc.users.hasPlatformRole(user.id, ADMIN_ROLES);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }

    if (fix_notes !== undefined) {
      updates.fix_notes = fix_notes?.trim() || null;
    }
  }

  // note: autore oppure admin/dev
  if (note !== undefined) {
    if (!note?.trim()) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

    const authorId = await svc.feedback.getAuthorId(id);
    if (!authorId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAuthor = authorId === user.id;
    if (!isAuthor) {
      const isAdmin = await svc.users.hasPlatformRole(user.id, ADMIN_ROLES);
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    updates.note = note.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await svc.feedback.update(id, updates);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
