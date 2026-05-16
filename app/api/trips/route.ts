import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/dal/supabase";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const supabase = await getServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("trips")
    .select("id, title, subtitle, start_date, end_date, days(count)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const trips = (data ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    start_date: t.start_date,
    end_date: t.end_date,
    day_count: t.days?.[0]?.count ?? 0,
  }));

  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  // Auth check con SSR client
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, subtitle, start_date, end_date, currency = "EUR" } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Service client per le scritture — bypassa RLS, sicuro perché abbiamo già verificato l'utente
  const db = getServiceClient();

  // 1. Crea il trip
  const { data: trip, error: tripErr } = await db
    .from("trips")
    .insert({
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      start_date: start_date || null,
      end_date: end_date || null,
      currency,
      local_currency: currency,
      display_currency: currency,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (tripErr || !trip) {
    return NextResponse.json({ error: tripErr?.message ?? "Failed to create trip" }, { status: 500 });
  }

  // 2. Aggiunge l'utente come owner
  await db
    .from("trip_members")
    .insert({ trip_id: trip.id, user_id: user.id, role: "owner" });

  // 3. Genera i days se entrambe le date sono presenti
  if (start_date && end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = [];
    let current = new Date(start);
    let dayNumber = 1;
    while (current <= end) {
      days.push({
        trip_id: trip.id,
        day_number: dayNumber++,
        date: current.toISOString().split("T")[0],
      });
      current.setDate(current.getDate() + 1);
    }
    if (days.length > 0) {
      await db.from("days").insert(days);
    }
  }

  return NextResponse.json({ id: trip.id }, { status: 201 });
}
