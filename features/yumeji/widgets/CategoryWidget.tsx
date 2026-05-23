/**
 * CategoryWidget · the collection grouped by category, one row per group.
 * Each group shows a capped preview; `total` hints at the full count for a
 * future drill-down. Data is pre-resolved by the catalog builder
 * (selectByCategory).
 */

import { IconCategory } from "@/components/ui/icons";
import type { ByCategoryProps, CategoryGroup } from "@/lib/yumeji/types";
import { YumeCard } from "../YumeCard";
import { Section } from "./Section";

export function CategoryWidget({ props, data }: { props: ByCategoryProps; data: CategoryGroup[] }) {
  if (data.length === 0) return null;
  return (
    <Section title={props.title} subtitle={props.subtitle}>
      <div className="flex flex-col gap-7">
        {data.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <IconCategory size={15} className="text-ink-faint shrink-0" />
              <h3 className="text-meta font-medium text-ink capitalize">{group.category}</h3>
              <span className="text-mini text-ink-faint">· {group.total}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {group.items.map((yume) => (
                <YumeCard key={yume.id} yume={yume} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
