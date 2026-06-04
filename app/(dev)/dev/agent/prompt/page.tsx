import { buildSystemPrompt } from "@/app/api/go/agent/_prompt";

/**
 * /dev/agent/prompt — the exact system prompt the agent loop sends, plus a
 * note on the ephemeral per-turn context the route injects after history.
 */
export default function AgentPromptPage() {
  const today = new Date().toISOString().slice(0, 10);
  const system = buildSystemPrompt(today);

  return (
    <div className="px-10 py-12 max-w-4xl space-y-8">
      <div>
        <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-orange mb-1">GoAgent</div>
        <h1 className="text-2xl font-semibold text-ink">System prompt</h1>
        <p className="mt-2 text-sm text-ink-soft max-w-prose">
          Reso da <code className="text-[13px]">buildSystemPrompt</code> con la data di oggi
          (<span className="font-mono">{today}</span>). È il prefisso stabile e cacheabile del payload.
        </p>
      </div>

      <section>
        <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-faint mb-1.5">System</div>
        <pre className="text-[12px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface border border-border rounded-lg px-4 py-3">
          {system}
        </pre>
      </section>

      <section>
        <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-faint mb-1.5">
          Contesto per-turno (effimero, dopo la history)
        </div>
        <p className="text-mini text-ink-soft leading-relaxed mb-2">
          Iniettato subito prima del messaggio utente, mai persistito, così non invalida la cache:
        </p>
        <ul className="text-mini text-ink-soft leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <span className="font-medium text-ink">Giorno selezionato</span> — se la UI ha un giorno aperto:
            «L&apos;utente sta guardando il Giorno N. Se chiede di aggiungere/modificare senza indicare un giorno, intende questo.»
          </li>
          <li>
            <span className="font-medium text-ink">Trip context</span> — eventuale contesto fornito dal client,
            avvolto come dato non fidato.
          </li>
        </ul>
      </section>
    </div>
  );
}
