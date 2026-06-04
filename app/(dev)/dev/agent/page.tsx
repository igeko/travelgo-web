import Link from "next/link";
import { agentRegistry } from "./registry";

export default function AgentIndex() {
  return (
    <div className="px-10 py-12 max-w-4xl space-y-10">
      <div>
        <div className="text-[10px] font-medium tracking-[0.14em] uppercase text-orange mb-2">TravelGo</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Go Agent</h1>
        <p className="mt-2 text-ink-soft leading-relaxed max-w-prose">
          Banco di prova del loop dell&apos;assistente (<code className="text-[13px]">/api/go/agent</code>):
          flussi ripetibili, chat live, ispezione di tool e prompt, e il debug del loop turno per turno.
        </p>
      </div>

      <section>
        <h2 className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-4">Sezioni</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {agentRegistry.map((entry) => (
            <Link
              key={entry.slug}
              href={`/dev/agent/${entry.slug}`}
              className="group rounded-lg border border-border bg-surface p-4 hover:border-border-strong transition-colors no-underline"
            >
              <div className="text-sm font-medium text-ink group-hover:text-orange transition-colors">
                {entry.title}
              </div>
              <p className="mt-1 text-xs text-ink-soft leading-snug">{entry.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-4">Riferimento</h2>
        <p className="text-sm text-ink-soft leading-relaxed max-w-prose mb-4">
          In breve: ogni messaggio passa dal route, che sceglie se applicare una conferma o avviare il loop dell&apos;agent.
          Il loop chiama il modello (max 4 volte), esegue i tool read-only e propone i write da confermare; poi il turno viene persistito e mostrato in chat.
        </p>
        <a
          href="/design/go-flow.html"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-lg border border-border bg-surface p-4 hover:border-border-strong transition-colors no-underline"
        >
          <span className="text-2xl shrink-0 leading-none">🧭</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink group-hover:text-orange transition-colors">
              Schema del giro <span className="text-ink-faint text-[11px]">↗</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft leading-snug">
              Diagramma statico di come funziona tutto il giro di un turno: route → loop → persistenza →
              render, più il sotto-giro della conferma.
            </p>
          </div>
        </a>
      </section>
    </div>
  );
}
