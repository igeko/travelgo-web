import { GO_TOOLS } from "@/app/api/go/agent/_tools";

/**
 * /dev/agent/tools — static inspector of the agent's tool catalog (GO_TOOLS).
 * Server-rendered straight from the source of truth, so it never drifts.
 */
export default function AgentToolsPage() {
  const tools = Object.values(GO_TOOLS);

  return (
    <div className="px-10 py-12 max-w-4xl space-y-8">
      <div>
        <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-orange mb-1">GoAgent</div>
        <h1 className="text-2xl font-semibold text-ink">Tools</h1>
        <p className="mt-2 text-sm text-ink-soft max-w-prose">
          Il catalogo offerto all&apos;agent ad ogni chiamata. I tool con{" "}
          <code className="text-[13px]">requiresConfirm</code> non vengono eseguiti dal loop:
          tornano come proposta che l&apos;utente conferma nella UI.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {tools.map((tool) => (
          <section key={tool.def.name} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-mono font-semibold text-ink">{tool.def.name}</h2>
              {tool.requiresConfirm ? (
                <span className="rounded-pill bg-primary-soft text-primary-deep border border-primary-border px-2 py-0.5 text-micro font-medium">
                  {typeof tool.requiresConfirm === "function" ? "requiresConfirm (conditional)" : "requiresConfirm"}
                </span>
              ) : (
                <span className="rounded-pill bg-surface-soft text-ink-soft border border-border px-2 py-0.5 text-micro font-medium">
                  read-only
                </span>
              )}
            </div>
            <p className="mt-2 text-mini text-ink-soft leading-relaxed">{tool.def.description}</p>

            <div className="mt-3">
              <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-faint mb-1.5">
                Parameters (JSON schema)
              </div>
              <pre className="text-[11px] font-mono text-ink-soft leading-relaxed whitespace-pre-wrap bg-surface-soft rounded-lg px-3 py-2.5 overflow-x-auto">
                {JSON.stringify(tool.def.parameters, null, 2)}
              </pre>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
