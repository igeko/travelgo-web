/**
 * POST /api/days/[id]/ai-organize
 *
 * Chiede a gpt-4o-mini di riordinare i blocchi del giorno corrente
 * in modo logico: orari, sequenza geografica, ponti di trasporto.
 * NON tocca altri giorni.
 *
 * Response: { blocks: Activity[] } con position aggiornato.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerClient } from "@/lib/dal/supabase";
import { requireDayEditor } from "@/lib/dal/auth";
import { ACTIVITY_SELECT } from "@/lib/dal/trips";

type Params = { params: Promise<{ id: string }> };

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `Sei un pianificatore di itinerari di viaggio esperto.
Ricevi la lista dei blocchi di un singolo giorno di viaggio in JSON.
Il tuo compito è riordinarli in modo logico: rispettare gli orari esistenti dove specificati,
raggruppare per slot (morning/afternoon/evening/night), e suggerire una sequenza geograficamente sensata.
Per ogni blocco di tipo "move" (spostamento/ponte), assicurati che sia tra i due blocchi che collega.

Rispondi SOLO con un array JSON dei blocchi riordinati, con position aggiornata da 1 in poi.
Non aggiungere o rimuovere blocchi. Non modificare nessun campo tranne position e slot.
Formato: [{ "id": "...", "position": 1, "slot": "morning" }, ...]`;

export async function POST(req: NextRequest, { params }: Params) {
  const { id: dayId } = await params;

  const auth = await requireDayEditor(dayId);
  if (!auth.ok) return auth.response;

  const supabase = await getServerClient();

  // Leggi i blocchi del giorno
  const { data: blocks, error } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("day_id", dayId)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!blocks || blocks.length === 0) {
    return NextResponse.json({ blocks: [] });
  }

  // cast through unknown — nuove colonne non ancora nelle Supabase generated types
  type Row = { id: string; type: string; title: string; time: string | null; slot: string | null; position: number; location: string | null; fuzzy: boolean; [k: string]: unknown };
  const rows = blocks as unknown as Row[];

  // Prepara payload minimale per il modello
  const payload = rows.map((b) => ({
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
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload, null, 2) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    // Il modello potrebbe wrappare in { blocks: [...] } o rispondere direttamente con array
    reordered = Array.isArray(parsed) ? parsed : (parsed.blocks ?? parsed.result ?? []);
  } catch (err) {
    console.error("[ai-organize] OpenAI error:", err);
    return NextResponse.json({ error: "AI organize failed" }, { status: 502 });
  }

  if (!reordered.length) {
    return NextResponse.json({ blocks });
  }

  // Applica le nuove position + slot in batch
  const updates = reordered.map((r) =>
    supabase
      .from("activities")
      .update({ position: r.position, slot: r.slot })
      .eq("id", r.id)
      .eq("day_id", dayId) // safety: non tocca altri giorni
  );

  await Promise.all(updates);

  // Rileggi i blocchi aggiornati
  const { data: updated } = await supabase
    .from("activities")
    .select(ACTIVITY_SELECT)
    .eq("day_id", dayId)
    .order("position", { ascending: true });

  return NextResponse.json({ blocks: updated ?? [] });
}
