import { NextRequest, NextResponse } from "next/server";
import { serverDal, serviceDal } from "@/lib/dal";
import { isCurrencyCode, parseJsonBody } from "@/lib/api/validation";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function safeIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : value;
}

export async function GET() {
  const dal = await serverDal();

  const { data: user } = await dal.users.getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: trips, error } = await dal.trips.listSummaries();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const dal = await serverDal();
  const { data: user } = await dal.users.getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const raw = parsed.body as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  const subtitle = typeof raw.subtitle === "string" ? raw.subtitle.trim().slice(0, 500) : "";
  const startDate = raw.start_date ? safeIsoDate(raw.start_date) : null;
  const endDate = raw.end_date ? safeIsoDate(raw.end_date) : null;
  if (raw.start_date && !startDate) {
    return NextResponse.json({ error: "Invalid start_date (expected YYYY-MM-DD)" }, { status: 400 });
  }
  if (raw.end_date && !endDate) {
    return NextResponse.json({ error: "Invalid end_date (expected YYYY-MM-DD)" }, { status: 400 });
  }
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: "end_date precedes start_date" }, { status: 400 });
  }

  const currency = isCurrencyCode(raw.currency) ? raw.currency : "EUR";

  const db = serviceDal();

  const { data: trip, error: tripErr } = await db.trips.create({
    title,
    subtitle: subtitle || null,
    start_date: startDate,
    end_date: endDate,
    currency,
    local_currency: currency,
    display_currency: currency,
    created_by: user.id,
  });

  if (tripErr || !trip) {
    return NextResponse.json({ error: tripErr?.message ?? "Failed to create trip" }, { status: 500 });
  }

  // 2. Aggiunge l'utente come owner
  await db.members.add({ trip_id: trip.id, user_id: user.id, role: "owner" });

  // 3. Genera i days se entrambe le date sono presenti
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    const current = new Date(start);
    let dayNumber = 1;
    // Hard cap at 366 to prevent generating thousands of rows.
    while (current <= end && dayNumber <= 366) {
      days.push({
        trip_id: trip.id,
        day_number: dayNumber++,
        date: current.toISOString().split("T")[0],
      });
      current.setDate(current.getDate() + 1);
    }
    if (days.length > 0) {
      await db.trips.createDays(days);
    }
  }

  return NextResponse.json({ id: trip.id }, { status: 201 });
}
