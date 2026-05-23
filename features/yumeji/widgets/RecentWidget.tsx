/**
 * RecentWidget · the most recently saved yume, as a card grid.
 * Data is pre-resolved by the catalog builder (selectRecent).
 */

import type { CatalogYume, RecentProps } from "@/lib/yumeji/types";
import { YumeCard } from "../YumeCard";
import { Section } from "./Section";

export function RecentWidget({ props, data }: { props: RecentProps; data: CatalogYume[] }) {
  if (data.length === 0) return null;
  return (
    <Section title={props.title} subtitle={props.subtitle}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.map((yume) => (
          <YumeCard key={yume.id} yume={yume} />
        ))}
      </div>
    </Section>
  );
}
