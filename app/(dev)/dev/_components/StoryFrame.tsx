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
      <div className="rounded-lg border border-border bg-surface p-6">
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
