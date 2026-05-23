"use client";

import { BoardingPass, type BoardingPassProps } from "@/features/trip/BoardingPass";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";

const TODAY = new Date(2026, 4, 23); // fixed "now" so the countdown is stable

const SAMPLE: BoardingPassProps = {
  trip: {
    start_date: "2026-07-27",
    end_date: "2026-08-05",
    adults_count: 2,
    children_count: 0,
    theme_tags: ["Cultura", "Cibo"],
  },
  recordLocator: "TG-2026-TOK",
  passengerName: "Enrico",
  origin: { city: "Rome", code: "FCO", time: "13:25" },
  destination: { city: "Tokyo", code: "HND", time: "08:50 +1", country: "Japan", countryColor: "#d83b3b" },
  goQuote: "«Iniziamo dal piano, Enrico?» — Go",
  now: TODAY,
};

export default function BoardingPassStories() {
  return (
    <StoryPage
      title="BoardingPass"
      description="Trip hero shaped like an airline boarding pass. Trip facts (dates, travelers, themes) share the persisted trip schema; airports, times, record locator and Go quote are AI/consumer-provided."
    >
      <StoryFrame name="Default" description="Full data — Tokyo, 9 nights, 2 travelers, countdown.">
        <BoardingPass {...SAMPLE} />
      </StoryFrame>

      <StoryFrame name="Solo traveler · single theme" description="One passenger, one mood tag, no Go quote.">
        <BoardingPass
          {...SAMPLE}
          passengerName="Mara"
          trip={{ ...SAMPLE.trip, adults_count: 1, children_count: 0, theme_tags: ["Nature"] }}
          goQuote={undefined}
        />
      </StoryFrame>

      <StoryFrame name="Dates not set" description="No start/end on the trip — date, stay and countdown fall back to placeholders.">
        <BoardingPass
          {...SAMPLE}
          trip={{ ...SAMPLE.trip, start_date: null, end_date: null, theme_tags: null }}
        />
      </StoryFrame>

      <StoryFrame name="No flag color" description="Falls back to the brand orange dot when countryColor is omitted.">
        <BoardingPass
          {...SAMPLE}
          destination={{ city: "Lisbon", code: "LIS", time: "21:10", country: "Portugal" }}
          origin={{ city: "Milan", code: "MXP", time: "18:40" }}
        />
      </StoryFrame>

      <DocsFrame>
        <PropsTable rows={[
          { prop: "trip",           type: "Pick<DbTrip, start_date | end_date | adults_count | children_count | theme_tags>", required: true, description: "Trip facts — identical schema to the stored row. Nights, date, countdown, passenger count and mood derive from here." },
          { prop: "recordLocator",  type: "string", required: true, description: "PNR-style code shown in the header. AI/consumer-provided." },
          { prop: "passengerName",  type: "string", required: true, description: "Lead passenger display name (not on the trip)." },
          { prop: "origin",         type: "{ city; code; time }", required: true, description: "Origin leg — outside the trip schema." },
          { prop: "destination",    type: "{ city; code; time; country; countryColor? }", required: true, description: "Destination leg + country. countryColor renders the flag dot." },
          { prop: "goQuote",        type: "string", description: "Optional Go one-liner on the stub." },
          { prop: "now",            type: "Date", defaultValue: "new Date()", description: "Reference date for the countdown. Injectable for tests." },
          { prop: "className",      type: "string", description: "Extra classes on the <section>." },
        ]} />

        <CodeBlock code={`
import { BoardingPass } from "@/features/trip/BoardingPass";

<BoardingPass
  trip={trip}                       // same schema as the stored trip row
  recordLocator="TG-2026-TOK"       // computed by the consumer / AI
  passengerName="Enrico"
  origin={{ city: "Rome", code: "FCO", time: "13:25" }}
  destination={{ city: "Tokyo", code: "HND", time: "08:50 +1", country: "Japan", countryColor: "#d83b3b" }}
  goQuote="«Iniziamo dal piano, Enrico?» — Go"
/>
        `} />
      </DocsFrame>
    </StoryPage>
  );
}
