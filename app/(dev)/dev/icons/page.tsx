"use client";

/**
 * Sandbox · Icons
 * URL: /dev/icons
 *
 * Gallery of every icon re-exported from the @/components/ui/icons barrel
 * (Tabler Icons). Read dynamically from the module namespace, so it stays in
 * sync as the barrel grows — no manual list to maintain. Search by name,
 * click a tile to copy its import name.
 */

import { useMemo, useState, type ComponentType } from "react";
import * as Icons from "@/components/ui/icons";
import { IconCheck, IconSearch, type IconProps } from "@/components/ui/icons";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { cn } from "@/lib/cn";

type IconComponent = ComponentType<IconProps>;

const ALL_ICONS: { name: string; Cmp: IconComponent }[] = Object.entries(Icons)
  .filter(([name, value]) => name.startsWith("Icon") && typeof value !== "undefined")
  .map(([name, value]) => ({ name, Cmp: value as IconComponent }))
  .sort((a, b) => a.name.localeCompare(b.name));

const SIZES = [20, 24, 28] as const;
type Size = (typeof SIZES)[number];

export default function IconsSandboxPage() {
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<Size>(24);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ICONS;
    return ALL_ICONS.filter((i) => i.name.toLowerCase().includes(q));
  }, [query]);

  async function copy(name: string) {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(name);
      setTimeout(() => setCopied((c) => (c === name ? null : c)), 1200);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div className="min-h-screen bg-bg p-8">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-ink">Icons</h1>
        <p className="mb-6 max-w-2xl text-sm text-ink-soft">
          Tutte le icone ri-esportate dal barrel{" "}
          <code className="rounded-sm bg-surface-soft px-1 py-0.5 text-mini">
            @/components/ui/icons
          </code>{" "}
          (Tabler Icons). Lette dinamicamente dal modulo, quindi sempre allineate
          al set in uso. Click su un&apos;icona per copiarne il nome.
        </p>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-pill border border-border bg-surface px-3">
            <IconSearch size={16} className="text-ink-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca icona (es. Bed, Arrow, Pin)…"
              className="h-full flex-1 bg-transparent text-mini text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
          <span className="text-mini tabular-nums text-ink-soft">
            {filtered.length}/{ALL_ICONS.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-meta italic text-ink-faint">
            Nessuna icona corrisponde a “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
            {filtered.map(({ name, Cmp }) => {
              const isCopied = copied === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => copy(name)}
                  title={`Copy "${name}"`}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-2 py-4 transition-colors",
                    isCopied ? "border-primary-border bg-primary-soft" : "hover:bg-surface-soft",
                  )}
                >
                  <span className="text-ink">
                    {isCopied ? (
                      <IconCheck size={size} className="text-primary-deep" />
                    ) : (
                      <Cmp size={size} stroke={1.75} />
                    )}
                  </span>
                  <span className="line-clamp-2 text-center text-micro leading-tight text-ink-soft">
                    {isCopied ? "Copiato!" : name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <SandboxRightPanel>
        <div className="flex flex-col gap-6 p-5">
          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Set
            </h3>
            <p className="text-mini text-ink-soft">
              Tabler Icons ·{" "}
              <code className="text-ink">@tabler/icons-react</code>
            </p>
            <p className="mt-1 text-tiny text-ink-faint">
              {ALL_ICONS.length} icone nel barrel
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-mini font-semibold uppercase tracking-eyebrow text-ink-soft">
              Preview size
            </h3>
            <div className="inline-flex gap-1 rounded-pill bg-surface-soft p-1">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "rounded-pill px-3 py-1 text-mini tabular-nums transition-colors",
                    size === s ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        </div>
      </SandboxRightPanel>
    </div>
  );
}
