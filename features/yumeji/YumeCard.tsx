/**
 * YumeCard · presentational grid card for the Yumeji catalog.
 *
 * One saved yume as an image tile with title and a location · price eyebrow.
 * Pure: takes the activity entity, derives its display fields. Used by every
 * catalog widget so the visual stays consistent across sections.
 */

import { cn } from "@/lib/cn";
import { AddressLabel } from "@/components/ui/AddressLabel";
import type { CatalogYume } from "@/lib/yumeji/types";
import { formatBudget } from "./toListItem";

/** Shared with YumeList / ActivityList for image-less rows. */
const PLACEHOLDER_THUMB = "/media/day-default-banner.png";

export function YumeCard({ yume, className }: { yume: CatalogYume; className?: string }) {
  const price = formatBudget(yume.budget_amount, yume.budget_currency);
  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-surface overflow-hidden",
        className,
      )}
    >
      <div
        style={{ backgroundImage: `url(${yume.hero_image ?? PLACEHOLDER_THUMB})` }}
        className="aspect-[4/3] w-full bg-cover bg-center"
      />
      <div className="px-3 py-2.5">
        <div className="text-meta font-medium text-ink leading-tight truncate">{yume.title}</div>
        {(yume.location || price) && (
          <div className="mt-1 flex items-center gap-1.5 min-w-0 leading-tight">
            <AddressLabel
              address={yume.location}
              className="min-w-0 flex-1 text-mini text-ink-soft"
            />
            {price && <span className="shrink-0 text-mini font-medium text-orange">{price}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
