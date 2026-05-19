export function SlotStation({
  label,
  count,
}: {
  label: string;
  /** Number of activities in this slot (rendered as "N acts") */
  count?: number;
}) {
  return (
    <div className="flex items-baseline gap-3.5 mt-6 mb-1.5 first:mt-2">
      <span className="text-xs font-medium tracking-eyebrow-wide uppercase text-orange">
        {label}
      </span>
      <span className="flex-1 h-px bg-orange/25" />
      {count !== undefined && (
        <span className="text-micro text-ink-soft tracking-[0.1em] uppercase">
          {count} acts
        </span>
      )}
    </div>
  );
}
