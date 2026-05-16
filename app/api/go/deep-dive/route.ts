import { NextRequest, NextResponse } from "next/server";
import { runDeepDive } from "../_deepDive";

/**
 * POST /api/go/deep-dive
 * Body: { title, category?, location?, why?, tripContext? }
 * Response: DeepDiveResult
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    title?: string;
    category?: string;
    location?: string;
    why?: string;
    tripContext?: string;
  };

  if (!body.title)
    return NextResponse.json({ error: "title is required" }, { status: 400 });

  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const result = await runDeepDive(body as Parameters<typeof runDeepDive>[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[go/deep-dive]", err);
    return NextResponse.json({ error: "Deep dive failed" }, { status: 500 });
  }
}
