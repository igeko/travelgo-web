"use client";

/**
 * Costi reali OpenAI — consuma GET /api/ai/costs e mostra il consumo
 * effettivo dell'organizzazione (totale + breakdown per line item).
 * I prezzi di listino sopra restano la stima; questo è l'addebito reale.
 *
 * Granularità giornaliera, con possibile ritardo di qualche ora.
 */

import { useEffect, useState } from "react";

type CostsData = {
  configured: true;
  currency: string;
  days: number;
  total: number;
  byLineItem: Array<{ name: string; amount: number }>;
  byDay: Array<{ date: string; amount: number }>;
};

type Response =
  | { data: { configured: false } | CostsData }
  // Guard/route failures use { error: { code, message } }; the auth
  // middleware short-circuits unauthenticated calls with a plain string.
  | { error: string | { code: string; message: string } };

function errorMessage(error: string | { message?: string }): string {
  return typeof error === "string" ? error : error.message ?? "Richiesta non autorizzata";
}

type State =
  | { status: "loading" }
  | { status: "not-configured" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CostsData };

const DAYS = 30;

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function OpenAiActuals() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(`/api/ai/costs?days=${DAYS}`)
      .then(async (res) => (await res.json()) as Response)
      .then((json) => {
        if (!alive) return;
        if ("error" in json) {
          setState({ status: "error", message: errorMessage(json.error) });
          return;
        }
        if (!json.data.configured) {
          setState({ status: "not-configured" });
          return;
        }
        setState({ status: "ready", data: json.data });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Errore di rete",
        });
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-meta font-medium text-ink">Costi reali OpenAI</h2>
        <span className="text-tiny text-ink-faint">ultimi {DAYS} giorni</span>
      </div>

      {state.status === "loading" && (
        <div className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-ink-faint">
          Carico i costi reali…
        </div>
      )}

      {state.status === "not-configured" && (
        <div className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3">
          <div className="text-warning-deep font-medium text-sm">
            Costs API non configurata
          </div>
          <p className="mt-1 text-tiny text-warning-fg leading-relaxed">
            Imposta <span className="font-mono">OPENAI_ADMIN_KEY</span> (una{" "}
            <span className="font-medium">admin key</span> di organizzazione, diversa
            dalla normale API key) per vedere qui l&apos;addebito reale. La generi da{" "}
            <span className="font-mono">platform.openai.com/settings/organization/admin-keys</span>.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3">
          <div className="text-danger-deep font-medium text-sm">
            Impossibile leggere i costi
          </div>
          <p className="mt-1 text-tiny text-danger-fg leading-relaxed break-words">
            {state.message}
          </p>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-baseline justify-between px-4 py-4 border-b border-border bg-surface-soft">
              <span className="text-tiny font-medium tracking-meta uppercase text-ink-faint">
                Totale periodo
              </span>
              <span className="text-2xl font-semibold text-ink tabular-nums">
                {money(state.data.total, state.data.currency)}
              </span>
            </div>

            {state.data.byLineItem.length === 0 ? (
              <div className="px-4 py-4 text-sm text-ink-faint">
                Nessun consumo registrato nel periodo.
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {state.data.byLineItem.map((r) => (
                    <tr key={r.name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 align-top text-ink">{r.name}</td>
                      <td className="px-4 py-2.5 align-top text-right whitespace-nowrap font-medium text-ink tabular-nums">
                        {money(r.amount, state.data.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="mt-2 text-tiny text-ink-faint leading-relaxed">
            Addebito reale dalla Costs API di OpenAI (granularità giornaliera, possibile
            ritardo di qualche ora). Le voci riflettono modello e tipo di token così come
            li fattura OpenAI.
          </p>
        </>
      )}
    </section>
  );
}
