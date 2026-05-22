import { route, ok, queryParam, requirePlatformAdmin } from "@/lib/api";
import { aiCostsConfigured, fetchOpenAICosts } from "@/lib/ai/provider";

/**
 * GET /api/ai/costs?days=30
 *
 * Costi reali OpenAI a livello di organizzazione (Costs API), aggregati
 * dai bucket giornalieri in: totale, breakdown per line item e per giorno.
 * Richiede OPENAI_ADMIN_KEY (vedi lib/ai/provider.ts). Solo platform admin:
 * espone dati di fatturazione dell'org. Usato dalla pagina /dev/costs.
 *
 * Nota: i costi sono a granularità giornaliera e possono avere qualche ora
 * di ritardo rispetto al consumo reale.
 */
export const GET = route(async ({ req }) => {
  await requirePlatformAdmin();

  if (!aiCostsConfigured()) {
    return ok({ configured: false } as const);
  }

  const raw = Number(queryParam(req, "days") ?? 30);
  const days = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 180) : 30;

  // Mezzanotte UTC di `days - 1` giorni fa → copre `days` bucket giornalieri,
  // incluso quello odierno.
  const now = new Date();
  const todayMidnightUtc =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
  const startTime = todayMidnightUtc - (days - 1) * 86_400;

  const buckets = await fetchOpenAICosts({ startTime, days });

  let total = 0;
  let currency = "usd";
  const byLineItem = new Map<string, number>();
  const byDay: Array<{ date: string; amount: number }> = [];

  for (const bucket of buckets) {
    let dayTotal = 0;
    for (const r of bucket.results) {
      const value = r.amount?.value ?? 0;
      total += value;
      dayTotal += value;
      currency = r.amount?.currency ?? currency;
      const key = r.line_item ?? "Altro";
      byLineItem.set(key, (byLineItem.get(key) ?? 0) + value);
    }
    byDay.push({
      date: new Date(bucket.start_time * 1000).toISOString().slice(0, 10),
      amount: dayTotal,
    });
  }

  return ok({
    configured: true as const,
    currency,
    days,
    total,
    byLineItem: [...byLineItem.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    byDay,
  });
});
