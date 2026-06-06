"use client";

import { useMemo, useState } from "react";
import { PlaceHoverCard, type SavedPlaceInfo } from "@/features/explore/PlaceHoverCard";
import type { PlaceEnriched } from "@/app/api/places/photo-search/route";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";

/* ─── Mocks ─────────────────────────────────────────────────────── */

const SAVED_ACTIVITY: SavedPlaceInfo = {
  name: "Toshogu Shrine",
  image: null,
  description:
    "Santuario shintoista decorato, mausoleo del primo shogun Tokugawa, immerso nei cedri di Nikko.",
  address: "Nikko, Prefettura di Tochigi",
  time: "10:30",
  dayLabel: "Giorno 3",
  typeLabel: null,
  url: null,
};

const SAVED_ACCOMMODATION: SavedPlaceInfo = {
  name: "Nikko Kanaya Hotel",
  image:
    "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&q=70&auto=format&fit=crop",
  description:
    "Hotel storico del 1873, il primo resort hotel del Giappone — atmosfera coloniale e cedri secolari fuori dalla finestra.",
  address: "1300 Kamihatsuishimachi, Nikko",
  time: null,
  dayLabel: "Giorni 3–4",
  typeLabel: "Hotel",
  url: "https://www.kanayahotel.co.jp/en/nkh/",
};

const SAVED_MINIMAL: SavedPlaceInfo = {
  name: "Kegon Falls",
  image: null,
  description: null,
  address: "Cascate di Kegon, Nikko",
  time: null,
  dayLabel: null,
  typeLabel: null,
  url: null,
};

// Senso-ji Temple, Tokyo — placeId reale, fa il fetch verso Google se l'env è
// configurato; altrimenti la card resta sui dati di fallback.
const SAMPLE_PLACE_ID = "ChIJ8T1GpMGOGGARDYGSgpooDWw";

// Mock "all-fields" — copre ogni campo di PlaceEnriched senza dipendere dalla
// rete. Usato dalla story `Google · all attributes`.
const GOOGLE_FULL: PlaceEnriched = {
  placeId: "ChIJ_full_mock",
  name: "Toshogu Shrine",
  address: "2301 Sannai, Nikko, Tochigi 321-1431, Japan",
  lat: 36.7579,
  lng: 139.5986,
  rating: 4.6,
  userRatingsTotal: 12_438,
  priceLevel: 2,
  openNow: true,
  weekdayText: [
    "Monday: 8:00 AM – 5:00 PM",
    "Tuesday: 8:00 AM – 5:00 PM",
    "Wednesday: 8:00 AM – 5:00 PM",
    "Thursday: 8:00 AM – 5:00 PM",
    "Friday: 8:00 AM – 5:00 PM",
    "Saturday: 8:00 AM – 5:00 PM",
    "Sunday: 8:00 AM – 5:00 PM",
  ],
  website: "https://www.toshogu.jp/",
  types: ["tourist_attraction", "place_of_worship", "point_of_interest"],
  editorialSummary:
    "Santuario shintoista decorato, mausoleo del primo shogun Tokugawa, immerso nei cedri di Nikko.",
  // photoRefs vuoto → la card userà l'immagine esterna mockata via override.
  photoRefs: [],
};

// Variante GOOGLE_FULL senza immagine, per la story "no image" in Google mode.
const GOOGLE_FULL_NO_IMAGE: PlaceEnriched = { ...GOOGLE_FULL, photoRefs: [] };

// Pseudo-immagine per la story "all attributes": iniettiamo un photoRef finto
// e quando il componente proverà a fare api.places.photoUrl() otterrà una URL
// non valida — quindi forniamo image via `saved`-style? No: il componente in
// Google mode non accetta image override. Per testare *con* immagine usiamo
// invece l'unsplash inline tramite editorialSummary + saved adapter? Sopra ho
// scelto di mostrare la card no-image quando photoRefs è vuoto.

const noop = () => {};

/* ─── Page ──────────────────────────────────────────────────────── */

type Mode = "saved-activity" | "saved-accommodation" | "saved-minimal" | "google-live" | "google-full";

export default function PlaceHoverStories() {
  /* Playground state (driven by the right-panel controls). */
  const [mode, setMode] = useState<Mode>("google-full");
  const [withImage, setWithImage] = useState(true);
  const [showAddToTrip, setShowAddToTrip] = useState(true);
  const [showYumeji, setShowYumeji] = useState(true);

  const playgroundCard = useMemo(() => {
    if (mode === "saved-activity")
      return (
        <PlaceHoverCard
          saved={withImage ? { ...SAVED_ACTIVITY, image: HERO_IMAGE } : SAVED_ACTIVITY}
          fallbackName={SAVED_ACTIVITY.name}
          onClose={noop}
        />
      );
    if (mode === "saved-accommodation")
      return (
        <PlaceHoverCard
          saved={withImage ? SAVED_ACCOMMODATION : { ...SAVED_ACCOMMODATION, image: null }}
          fallbackName={SAVED_ACCOMMODATION.name}
          onClose={noop}
        />
      );
    if (mode === "saved-minimal")
      return (
        <PlaceHoverCard
          saved={withImage ? { ...SAVED_MINIMAL, image: HERO_IMAGE } : SAVED_MINIMAL}
          fallbackName={SAVED_MINIMAL.name}
          onClose={noop}
        />
      );
    if (mode === "google-live")
      return (
        <PlaceHoverCard
          placeId={SAMPLE_PLACE_ID}
          fallbackName="Senso-ji Temple"
          onClose={noop}
          onFavorite={showYumeji ? noop : undefined}
          onAddToTrip={showAddToTrip ? noop : undefined}
        />
      );
    // google-full
    return (
      <PlaceHoverCard
        initialPlace={withImage ? GOOGLE_FULL : GOOGLE_FULL_NO_IMAGE}
        fallbackName={GOOGLE_FULL.name}
        onClose={noop}
        onFavorite={showYumeji ? noop : undefined}
        onAddToTrip={showAddToTrip ? noop : undefined}
      />
    );
  }, [mode, withImage, showAddToTrip, showYumeji]);

  const controls: ControlGroup[] = [
    {
      title: "Source",
      controls: [
        {
          kind: "radio",
          id: "mode",
          label: "Mode",
          value: mode,
          options: [
            { value: "google-full", label: "Google · mock pieno" },
            { value: "google-live", label: "Google · live" },
            { value: "saved-activity", label: "Saved · activity" },
            { value: "saved-accommodation", label: "Saved · accommodation" },
            { value: "saved-minimal", label: "Saved · minimal" },
          ],
          onChange: (v) => setMode(v as Mode),
        },
      ],
    },
    {
      title: "Display",
      controls: [
        {
          kind: "toggle",
          id: "with-image",
          label: "Con immagine",
          value: withImage,
          onChange: setWithImage,
        },
      ],
    },
    {
      title: "Actions (Google only)",
      controls: [
        {
          kind: "toggle",
          id: "add-to-trip",
          label: "Aggiungi al viaggio",
          value: showAddToTrip,
          onChange: setShowAddToTrip,
        },
        {
          kind: "toggle",
          id: "yumeji",
          label: "Yumeji",
          value: showYumeji,
          onChange: setShowYumeji,
        },
      ],
    },
  ];

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={controls} />
      </SandboxRightPanel>

      <StoryPage
        title="PlaceHoverCard"
        description='Popover 270px ancorato sopra un pin della mappa Explore (variante desktop del design /design/place-hover). Due data source, stesso layout: dati Google (fetch lazy per placeId / iniettati via initialPlace) e dati "saved" già nel viaggio (attività / alloggio). Quando manca l’immagine la sezione foto sparisce e il nome diventa un header testuale.'
      >
        <StoryFrame
          name="Playground"
          description="Card pilotata dai controls sulla destra. Cambia source / immagine / azioni per esplorare ogni combinazione."
        >
          <div className="flex justify-center bg-surface-soft p-6 rounded-md">
            {playgroundCard}
          </div>
        </StoryFrame>

        <StoryFrame
          name="Google · all attributes"
          description="initialPlace con OGNI campo di PlaceEnriched popolato (rating, userRatingsTotal, priceLevel, openNow, website, editorialSummary, weekdayText, types). Mostra rating + count tra parentesi nella banda ink e website nella meta row. Niente fetch."
        >
          <div className="flex justify-center bg-surface-soft p-6 rounded-md">
            <PlaceHoverCard
              initialPlace={GOOGLE_FULL}
              fallbackName={GOOGLE_FULL.name}
              onClose={noop}
              onFavorite={noop}
              onAddToTrip={noop}
            />
          </div>
        </StoryFrame>

        <StoryFrame
          name="Google · live placeId"
          description="Modalità Google reale: fetch lazy via api.places.enriched(placeId) — Senso-ji Temple, Tokyo. Senza credenziali Google la card mostra solo il fallback testuale."
        >
          <div className="flex justify-center bg-surface-soft p-6 rounded-md">
            <PlaceHoverCard
              placeId={SAMPLE_PLACE_ID}
              fallbackName="Senso-ji Temple"
              onClose={noop}
              onFavorite={noop}
              onAddToTrip={noop}
            />
          </div>
        </StoryFrame>

        <StoryFrame
          name="Saved · Activity (no image)"
          description="Attività programmata senza foto: la sezione immagine sparisce e il nome diventa header testuale, con dayLabel sotto. Time nel meta. Niente CTA Yumeji né Add-to-trip (è già nel viaggio)."
        >
          <div className="flex justify-center bg-surface-soft p-6 rounded-md">
            <PlaceHoverCard
              saved={SAVED_ACTIVITY}
              fallbackName={SAVED_ACTIVITY.name}
              onClose={noop}
            />
          </div>
        </StoryFrame>

        <StoryFrame
          name="Saved · Accommodation"
          description="Alloggio con foto reale: typeLabel (Hotel) come pill notturna, link esterno verso la pagina di prenotazione, dayLabel a range."
        >
          <div className="flex justify-center bg-surface-soft p-6 rounded-md">
            <PlaceHoverCard
              saved={SAVED_ACCOMMODATION}
              fallbackName={SAVED_ACCOMMODATION.name}
              onClose={noop}
            />
          </div>
        </StoryFrame>

        <StoryFrame
          name="Saved · Minimal"
          description="Solo nome + indirizzo come fallback. Niente time, niente dayLabel, niente immagine: la riga meta scompare e l’header si riduce al solo nome."
        >
          <div className="flex justify-center bg-surface-soft p-6 rounded-md">
            <PlaceHoverCard
              saved={SAVED_MINIMAL}
              fallbackName={SAVED_MINIMAL.name}
              onClose={noop}
            />
          </div>
        </StoryFrame>

        <StoryFrame
          name="In context · mock map"
          description="Come appare ancorata sopra un pin selezionato della mappa Explore (sfondo simulato)."
        >
          <div className="relative w-full aspect-[5/3] rounded-md overflow-hidden border border-border bg-[#DDE6DA]">
            <svg viewBox="0 0 500 300" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
              <path d="M-20 130 Q120 90 240 180 T520 240" stroke="#C8DACC" strokeWidth="4" fill="none" />
              <path d="M-20 230 Q140 200 280 240 T520 260" stroke="#C8DACC" strokeWidth="3" fill="none" />
              <path d="M0 160 Q100 180 200 160 T520 155" stroke="#9ec4d4" strokeWidth="5" fill="none" opacity="0.55" />
            </svg>

            <div
              className="absolute z-10"
              style={{ left: "50%", top: "70%", transform: "translate(-50%,-100%)" }}
            >
              <svg viewBox="0 0 28 38" width="26" height="36" aria-hidden>
                <path
                  d="M14 0C6.3 0 0 6.3 0 14c0 9.3 14 24 14 24s14-14.7 14-24C28 6.3 21.7 0 14 0z"
                  fill="#0d2c3d"
                />
                <circle cx="14" cy="14" r="5.5" fill="#f47b3a" />
              </svg>
            </div>

            <div
              className="absolute z-20"
              style={{ left: "50%", top: "6%", transform: "translateX(-50%)" }}
            >
              <PlaceHoverCard
                initialPlace={GOOGLE_FULL}
                fallbackName={GOOGLE_FULL.name}
                onClose={noop}
                onFavorite={noop}
                onAddToTrip={noop}
              />
            </div>
          </div>
        </StoryFrame>

        <DocsFrame>
          <PropsTable
            rows={[
              { prop: "placeId", type: "string", description: "Google place id — fetch lazy via api.places.enriched()." },
              { prop: "initialPlace", type: "PlaceEnriched | null", description: "Dati Google già pronti — salta il fetch. Utile per SSR / sandbox." },
              { prop: "saved", type: "SavedPlaceInfo", description: "Dati già nel viaggio (attività / alloggio). Nasconde le meta Google e i CTA." },
              { prop: "fallbackName", type: "string", required: true, description: "Nome mostrato finché i dati non sono caricati." },
              { prop: "onClose", type: "() => void", required: true, description: "Click sulla X." },
              { prop: "onFavorite", type: "() => void", description: "Click sul CTA Yumeji (Google mode)." },
              { prop: "onAddToTrip", type: "() => void", description: "Click sul CTA Aggiungi al viaggio (Google mode)." },
            ]}
          />
          <CodeBlock
            code={`
import { PlaceHoverCard } from "@/features/explore/PlaceHoverCard";

// Modalità Google con CTA per la roadmap
<PlaceHoverCard
  placeId="ChIJ8T1GpMGOGGARDYGSgpooDWw"
  fallbackName="Senso-ji Temple"
  onClose={() => setSelected(null)}
  onFavorite={() => addToYumeji(placeId)}
  onAddToTrip={() => addToTrip(placeId)}
/>

// Modalità saved (attività del viaggio)
<PlaceHoverCard
  saved={{
    name: activity.title,
    image: activity.hero_image,
    description: activity.short_desc,
    address: activity.location,
    time: activity.time,
    dayLabel: \`Giorno \${dayIndex}\`,
    typeLabel: null,
    url: null,
  }}
  fallbackName={activity.title}
  onClose={() => setSelected(null)}
/>
            `}
          />
        </DocsFrame>
      </StoryPage>
    </>
  );
}

/* Hero image used by the playground (Unsplash, small CDN size). */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&q=70&auto=format&fit=crop";
