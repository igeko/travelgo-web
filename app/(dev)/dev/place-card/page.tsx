"use client";

import { PlaceCard } from "@/features/trip/PlaceCard";
import { IconTorii, IconBuildingMonument } from "@/components/ui/icons";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";

export default function PlaceCardStories() {
  return (
    <StoryPage
      title="PlaceCard"
      description="Compact destination card for the Trip Home — landmark glyph, city, country, and a couple of place facts. Sits to the left of the boarding pass. Presentational; values come from country tables / AI."
    >
      <StoryFrame name="Full" description="Landmark + city + country + facts + caption (Tokyo).">
        <div className="max-w-[280px]">
          <PlaceCard
            icon={<IconTorii size={36} />}
            city="Tokyo"
            country="Giappone"
            facts="37 MLN · UTC+9"
            caption="Capitale dal 1868."
          />
        </div>
      </StoryFrame>

      <StoryFrame name="Default icon" description="Without a curated glyph it falls back to a generic monument.">
        <div className="max-w-[280px]">
          <PlaceCard city="Lisbona" country="Portogallo" facts="500 K · UTC+0" caption="Sette colli sul Tago." />
        </div>
      </StoryFrame>

      <StoryFrame name="Minimal" description="Only city + country — the divider and facts are hidden.">
        <div className="max-w-[280px]">
          <PlaceCard icon={<IconBuildingMonument size={36} />} city="Reykjavík" country="Islanda" />
        </div>
      </StoryFrame>

      <DocsFrame>
        <PropsTable rows={[
          { prop: "city", type: "string", required: true, description: "City / place name — the serif hero." },
          { prop: "country", type: "string", description: "Country, shown under the city." },
          { prop: "icon", type: "ReactNode", defaultValue: "<IconBuildingMonument/>", description: "Landmark glyph." },
          { prop: "facts", type: "string", description: "Compact facts line, e.g. \"37 MLN · UTC+9\"." },
          { prop: "caption", type: "string", description: "One-line caption in serif italic." },
          { prop: "className", type: "string", description: "Extra classes on the <section>." },
        ]} />
        <CodeBlock code={`
import { PlaceCard } from "@/features/trip/PlaceCard";
import { IconTorii } from "@/components/ui/icons";

<PlaceCard
  icon={<IconTorii size={36} />}
  city="Tokyo"
  country="Giappone"
  facts="37 MLN · UTC+9"
  caption="Capitale dal 1868."
/>
        `} />
      </DocsFrame>
    </StoryPage>
  );
}
