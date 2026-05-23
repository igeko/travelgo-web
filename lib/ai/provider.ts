/**
 * lib/ai/provider.ts
 * ─────────────────────────────────────────────────────────────────
 * Single entry point for the server-side LLM provider (currently
 * OpenAI). Centralizes client construction, the API-key check and the
 * model registry so the rest of the app never touches `new OpenAI` or
 * hardcoded model strings.
 *
 * Swapping provider (Azure OpenAI, a gateway, …) or bumping a model
 * happens here only — call sites stay untouched. This is a thin adapter:
 * it still exposes the OpenAI SDK client and its types; it does not
 * invent a provider-neutral request shape.
 *
 * Server-only. Do not import from client components.
 * ─────────────────────────────────────────────────────────────────
 */

import OpenAI from "openai";

/**
 * Model registry — the only place model names live. Keyed by capability
 * tier so call sites express intent ("fast" vs "smart") instead of a
 * literal that has to be grepped-and-replaced on every change.
 */
export const AI_MODELS = {
  /** Cheap/low-latency: classification, chat, short notes. */
  fast: "gpt-4o-mini",
  /** Higher quality: suggestions, deep dive, rich enrichment. */
  smart: "gpt-4o",
} as const;

let client: OpenAI | null = null;

/**
 * Whether the provider is configured. Check this where a graceful
 * fallback exists (scripted reply, Google editorial summary, …) before
 * calling `getAI()`.
 */
export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * The shared LLM client, constructed once per runtime. Throws when the
 * key is missing — guard with `aiConfigured()` wherever a fallback path
 * is expected.
 */
export function getAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

/* ── Billing / Costs API ─────────────────────────────────────────
 * The org-level Costs API lives outside the SDK's project surface and
 * needs an *admin* key (different scope from OPENAI_API_KEY). Kept as a
 * thin REST adapter here so call sites never hold the admin key or know
 * the endpoint shape. Generate the key at:
 *   https://platform.openai.com/settings/organization/admin-keys
 * ──────────────────────────────────────────────────────────────── */

/** One daily bucket of org spend, optionally split by line item. */
export type CostBucket = {
  start_time: number;
  end_time: number;
  results: Array<{
    amount: { value: number; currency: string };
    line_item: string | null;
    project_id: string | null;
  }>;
};

/** Whether the admin key for the Costs API is configured. */
export function aiCostsConfigured(): boolean {
  return Boolean(process.env.OPENAI_ADMIN_KEY);
}

/**
 * Fetch daily org costs from OpenAI's Costs API, following pagination.
 * `startTime` is a unix timestamp (seconds); `days` caps both the page
 * size and is clamped to the API's 1–180 range. Throws if the admin key
 * is missing — guard with `aiCostsConfigured()`.
 */
export async function fetchOpenAICosts(opts: {
  startTime: number;
  days: number;
}): Promise<CostBucket[]> {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) throw new Error("OPENAI_ADMIN_KEY is not set");

  const limit = Math.min(Math.max(Math.trunc(opts.days), 1), 180);
  const buckets: CostBucket[] = [];
  let page: string | undefined;

  // Pagination is bounded by `limit` buckets; cap loops as a safety net.
  for (let i = 0; i < 20; i++) {
    const url = new URL("https://api.openai.com/v1/organization/costs");
    url.searchParams.set("start_time", String(Math.trunc(opts.startTime)));
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", String(limit));
    url.searchParams.append("group_by", "line_item");
    if (page) url.searchParams.set("page", page);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${adminKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI Costs API ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      data: CostBucket[];
      has_more: boolean;
      next_page: string | null;
    };
    buckets.push(...json.data);
    if (!json.has_more || !json.next_page) break;
    page = json.next_page;
  }

  return buckets;
}
