/**
 * PlaceCard — compact destination card for the Trip Home.
 *
 * A landmark glyph, the city in serif italic, the country below, then a
 * dashed divider with a couple of facts (population · timezone) and a short
 * caption. Presentational: every value comes from props (resolved by country
 * tables / AI). Sits to the left of the boarding pass.
 */

import { IconBuildingMonument } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type PlaceCardProps = {
  /** City / place name — the hero. */
  city: string;
  /** Country name, shown under the city. */
  country?: string;
  /** Landmark glyph; defaults to a generic monument. */
  icon?: React.ReactNode;
  /** Compact facts line, e.g. "37 MLN · UTC+9". */
  facts?: string;
  /** One-line caption in serif italic, e.g. "Capitale dal 1868." */
  caption?: string;
  className?: string;
};

export function PlaceCard({ city, country, icon, facts, caption, className }: PlaceCardProps) {
  const hasFooter = Boolean(facts || caption);
  return (
    <section
      className={cn(
        "flex flex-col items-center rounded-md border border-border bg-surface px-6 py-7 text-center",
        className,
      )}
    >
      <span className="mb-4 text-primary [&>svg]:size-9" aria-hidden>
        {icon ?? <IconBuildingMonument size={36} />}
      </span>

      <p className="m-0 font-serif text-[26px] font-medium italic leading-none text-ink">{city}</p>
      {country && <p className="mt-2 text-meta text-ink-soft">{country}</p>}

      {hasFooter && (
        <>
          <span className="my-5 h-px w-full border-t border-dashed border-border" aria-hidden />
          {facts && (
            <p className="m-0 text-tiny font-medium uppercase tracking-eyebrow text-ink-faint">{facts}</p>
          )}
          {caption && (
            <p className="mt-2 font-serif text-meta italic leading-snug text-ink-soft">{caption}</p>
          )}
        </>
      )}
    </section>
  );
}
