import Link from "next/link";
import { sandboxRegistry } from "./registry";

export default function DevIndex() {
  return (
    <div className="px-10 py-12 max-w-4xl">
      <h1 className="text-3xl font-medium tracking-tight text-ink">
        Component sandbox
      </h1>
      <p className="mt-3 text-ink-soft leading-relaxed max-w-prose">
        A space to test design system components in isolation. Each item in
        the sidebar is a page with all state variants.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {sandboxRegistry.map((entry) => (
          <Link
            key={entry.slug}
            href={`/dev/${entry.slug}`}
            className="group rounded-lg border border-border bg-surface p-5 hover:border-border-strong transition-colors"
          >
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint">
              {entry.group}
            </div>
            <div className="mt-2 text-base font-medium text-ink group-hover:text-orange transition-colors">
              {entry.title}
            </div>
            {entry.description && (
              <p className="mt-1 text-sm text-ink-soft leading-snug">
                {entry.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
