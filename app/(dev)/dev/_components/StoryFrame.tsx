import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────
   PropsTable · API reference table for developer docs.
   Usage:
     <PropsTable rows={[
       { prop: "lead", type: "string", required: true, description: "Main quote text" },
       { prop: "note", type: "string", description: "Optional secondary line" },
       { prop: "accent", type: '"orange" | "lime" | "ink"', defaultValue: '"orange"', description: "Border color" },
     ]} />
─────────────────────────────────────────────────────────────────── */

export type PropRow = {
  prop: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description: string;
};

export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 font-medium text-ink-soft whitespace-nowrap">Prop</th>
            <th className="text-left py-2 pr-4 font-medium text-ink-soft whitespace-nowrap">Type</th>
            <th className="text-left py-2 pr-4 font-medium text-ink-soft whitespace-nowrap">Default</th>
            <th className="text-left py-2 font-medium text-ink-soft">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.prop} className="border-b border-border last:border-0">
              <td className="py-2.5 pr-4 align-top whitespace-nowrap">
                <code className="font-mono text-orange-deep font-medium">{row.prop}</code>
                {row.required && (
                  <span className="ml-1 text-[10px] text-orange font-medium">*</span>
                )}
              </td>
              <td className="py-2.5 pr-4 align-top whitespace-nowrap">
                <code className="font-mono text-ink-soft">{row.type}</code>
              </td>
              <td className="py-2.5 pr-4 align-top whitespace-nowrap">
                {row.defaultValue
                  ? <code className="font-mono text-ink-faint">{row.defaultValue}</code>
                  : <span className="text-ink-faint">—</span>}
              </td>
              <td className="py-2.5 align-top text-ink-soft leading-relaxed">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CodeBlock · syntax-highlighted-ish inline code snippet
─────────────────────────────────────────────────────────────────── */

export function CodeBlock({ code, language = "tsx" }: { code: string; language?: string }) {
  return (
    <pre className={cn(
      "rounded-lg bg-ink text-[12px] leading-relaxed overflow-x-auto p-4",
      "font-mono text-[#e8e8e0] whitespace-pre",
    )}>
      <code>{code.trim()}</code>
    </pre>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DocsFrame · container for developer documentation sections
─────────────────────────────────────────────────────────────────── */

export function DocsFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-8">
      <header className="mb-4">
        <h3 className="text-sm font-medium tracking-tight text-ink">Developer reference</h3>
        <p className="mt-1 text-xs text-ink-soft">Props, types and usage examples.</p>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

/**
 * Wrapper for a "story": title + description + render area.
 * Used inside variant pages to give context to each state.
 */
export function StoryFrame({
  name,
  description,
  children,
}: {
  name: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8 first:border-t-0 first:pt-0">
      <header className="mb-4">
        <h3 className="text-sm font-medium tracking-tight text-ink">{name}</h3>
        {description && (
          <p className="mt-1 text-xs text-ink-soft leading-relaxed max-w-prose">
            {description}
          </p>
        )}
      </header>
      <div className="rounded-lg border border-border p-6">
        {children}
      </div>
    </section>
  );
}

export function StoryPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-10 py-10 max-w-4xl">
      <header className="mb-10">
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-ink-soft leading-relaxed max-w-prose">
            {description}
          </p>
        )}
      </header>
      <div className="flex flex-col gap-10">{children}</div>
    </div>
  );
}
