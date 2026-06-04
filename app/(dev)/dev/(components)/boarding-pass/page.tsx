"use client";

import { useState } from "react";
import { BoardingPass } from "@/features/trip/BoardingPass";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";

const TODAY = new Date(2026, 4, 23); // fixed "now" so the countdown is stable

const THEME_OPTIONS = ["Cultura", "Cibo", "Natura", "Relax", "Spirituale", "Vita notturna"].map(
  (t) => ({ value: t, label: t }),
);

export default function BoardingPassStories() {
  // ── Interactive state ──────────────────────────────────────────
  const [recordLocator, setRecordLocator] = useState("TG-2026-TOK");
  const [passengerName, setPassengerName] = useState("Enrico");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [startDate, setStartDate] = useState("2026-07-27");
  const [endDate, setEndDate] = useState("2026-08-05");
  const [themes, setThemes] = useState<string[]>(["Cultura", "Cibo"]);

  const [destCity, setDestCity] = useState("Tokyo");
  const [destCode, setDestCode] = useState("HND");
  const [destTime, setDestTime] = useState("08:50 +1");
  const [destCountry, setDestCountry] = useState("Japan");
  const [destColor, setDestColor] = useState("#d83b3b");

  const [originOn, setOriginOn] = useState(true);
  const [originCity, setOriginCity] = useState("Rome");
  const [originCode, setOriginCode] = useState("FCO");
  const [originTime, setOriginTime] = useState("13:25");

  const [goQuote, setGoQuote] = useState("«Iniziamo dal piano, Enrico?» — Go");

  const groups: ControlGroup[] = [
    {
      title: "Ticket",
      controls: [
        { kind: "text", id: "rl", label: "Record locator", value: recordLocator, onChange: setRecordLocator },
        { kind: "text", id: "pax", label: "Passenger name", value: passengerName, onChange: setPassengerName },
        { kind: "number", id: "adults", label: "Adults", value: adults, min: 0, max: 12, onChange: setAdults },
        { kind: "number", id: "children", label: "Children", value: children, min: 0, max: 12, onChange: setChildren },
        { kind: "multiselect", id: "themes", label: "Themes (mood)", value: themes, options: THEME_OPTIONS, min: 0, onChange: setThemes },
      ],
    },
    {
      title: "Dates",
      controls: [
        { kind: "date", id: "start", label: "Start date", value: startDate, onChange: setStartDate },
        { kind: "date", id: "end", label: "End date", value: endDate, onChange: setEndDate },
      ],
    },
    {
      title: "Destination",
      controls: [
        { kind: "text", id: "dcity", label: "City", value: destCity, onChange: setDestCity },
        { kind: "text", id: "dcode", label: "Airport (IATA)", value: destCode, onChange: setDestCode },
        { kind: "text", id: "dtime", label: "Arrival time", value: destTime, onChange: setDestTime },
        { kind: "text", id: "dcountry", label: "Country", value: destCountry, onChange: setDestCountry },
        { kind: "text", id: "dcolor", label: "Flag color (hex)", value: destColor, placeholder: "#d83b3b", onChange: setDestColor },
      ],
    },
    {
      title: "Origin",
      controls: [
        { kind: "toggle", id: "origin-on", label: "Show origin leg", value: originOn, onChange: setOriginOn },
        { kind: "text", id: "ocity", label: "City", value: originCity, onChange: setOriginCity },
        { kind: "text", id: "ocode", label: "Airport (IATA)", value: originCode, onChange: setOriginCode },
        { kind: "text", id: "otime", label: "Departure time", value: originTime, onChange: setOriginTime },
      ],
    },
    {
      title: "Go",
      controls: [
        { kind: "text", id: "quote", label: "Welcome quote", value: goQuote, onChange: setGoQuote },
      ],
    },
  ];

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="BoardingPass"
        description="Trip hero shaped like an airline boarding pass. Trip facts (dates, travelers, themes) share the persisted trip schema; airports, times, record locator and Go quote are AI/consumer-provided."
      >
        <StoryFrame name="Interactive" description="Edit any field from the controls panel. Empty text fields are treated as 'unknown' and the pass degrades accordingly.">
          <BoardingPass
            trip={{
              start_date: startDate || null,
              end_date: endDate || null,
              adults_count: adults,
              children_count: children,
              theme_tags: themes.length > 0 ? themes : null,
            }}
            recordLocator={recordLocator || undefined}
            passengerName={passengerName || undefined}
            origin={originOn ? { city: originCity, code: originCode || undefined, time: originTime || undefined } : undefined}
            destination={{
              city: destCity,
              code: destCode || undefined,
              time: destTime || undefined,
              country: destCountry || undefined,
              countryColor: destColor || undefined,
            }}
            goQuote={goQuote || undefined}
            now={TODAY}
          />
        </StoryFrame>

        <StoryFrame name="Destination only · worst case" description="The user set nothing but a destination: no origin leg, no dates, no airports, no country. The pass stays intact and degrades to a single destination hero.">
          <BoardingPass
            trip={{ start_date: null, end_date: null, adults_count: null, children_count: null, theme_tags: null }}
            destination={{ city: "Reykjavík" }}
          />
        </StoryFrame>

        <StoryFrame name="Solo vs group" description="Field label switches Passenger → Passengers when more than one traveler.">
          <div className="flex flex-col gap-6">
            <BoardingPass
              trip={{ start_date: "2026-07-27", end_date: "2026-08-05", adults_count: 1, children_count: 0, theme_tags: ["Relax"] }}
              destination={{ city: "Tokyo", code: "HND", country: "Japan", countryColor: "#d83b3b" }}
              passengerName="Mara"
              recordLocator="TG-2026-TOK"
              now={TODAY}
            />
            <BoardingPass
              trip={{ start_date: "2026-07-27", end_date: "2026-08-05", adults_count: 2, children_count: 2, theme_tags: ["Cultura", "Cibo"] }}
              destination={{ city: "Tokyo", code: "HND", country: "Japan", countryColor: "#d83b3b" }}
              passengerName="Enrico"
              recordLocator="TG-2026-TOK"
              now={TODAY}
            />
          </div>
        </StoryFrame>

        <DocsFrame>
          <PropsTable rows={[
            { prop: "trip",           type: "Pick<DbTrip, start_date | end_date | adults_count | children_count | theme_tags>", required: true, description: "Trip facts — identical schema to the stored row. Nights, date, countdown, passenger count and mood derive from here; all fields nullable." },
            { prop: "destination",    type: "{ city; code?; time?; country?; countryColor? }", required: true, description: "Only `city` is required. Country drives the header flag (countryColor renders the dot); everything else degrades when absent." },
            { prop: "origin",         type: "{ city; code?; time? }", description: "Origin leg. When omitted, the From block + plane disappear and the destination becomes a single hero." },
            { prop: "recordLocator",  type: "string", description: "PNR-style code shown in the header. AI/consumer-provided." },
            { prop: "passengerName",  type: "string", description: "Lead passenger display name (not on the trip)." },
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
    </>
  );
}
