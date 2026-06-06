"use client";

import { PlaceHoverCard, type SavedPlaceInfo } from "@/features/explore/PlaceHoverCard";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";

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
  image: null,
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

// Senso-ji Temple, Tokyo — placeId stabile, già usato nelle altre story.
const SAMPLE_PLACE_ID = "ChIJ8T1GpMGOGGARDYGSgpooDWw";

const noop = () => {};

export default function PlaceHoverStories() {
  return (
    <StoryPage
      title="PlaceHoverCard"
      description='Popover 270px ancorato sopra un pin della mappa Explore (variante desktop del design /design/place-hover). Due data source, stesso layout: dati Google (fetch lazy per placeId) e dati "saved" già nel viaggio (attività / alloggio).'
    >
      <StoryFrame
        name="Google · place id"
        description="Modalità Google: fetch lazy via api.places.enriched(placeId). Mostra rating, foto, summary editoriale, open/now, price level e CTA Yumeji. Senza credenziali Google l'immagine resta sul gradient e il body sul fallback address."
      >
        <div className="flex justify-center bg-surface-soft p-6 rounded-md">
          <PlaceHoverCard
            placeId={SAMPLE_PLACE_ID}
            fallbackName="Senso-ji Temple"
            onClose={noop}
            onFavorite={noop}
          />
        </div>
      </StoryFrame>

      <StoryFrame
        name="Saved · Activity"
        description="Attività programmata: description + dayLabel nella banda ink + time nel meta. Niente CTA Yumeji né meta Google (open/price). Image null → gradient fallback con icona pin."
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
        description="Alloggio: typeLabel (Hotel) come pill notturna, link esterno verso la pagina di prenotazione, dayLabel a range. Stesso layout, meta diversa."
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
        description="Solo nome + indirizzo come fallback del summary. Niente time, niente dayLabel, niente meta extra: la riga meta scompare del tutto."
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
        description="Come appare ancorato sopra un pin selezionato della mappa Explore (sfondo simulato)."
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
            style={{ left: "50%", top: "8%", transform: "translateX(-50%)" }}
          >
            <PlaceHoverCard
              saved={SAVED_ACTIVITY}
              fallbackName={SAVED_ACTIVITY.name}
              onClose={noop}
            />
          </div>
        </div>
      </StoryFrame>

      <DocsFrame>
        <PropsTable
          rows={[
            { prop: "placeId", type: "string", description: "Google place id — usato se saved non è passato. Il componente fa fetch lazy via api.places.enriched()." },
            { prop: "saved", type: "SavedPlaceInfo", description: "Dati già nel viaggio (attività / alloggio). Quando presente salta il fetch Google e nasconde le meta Google + il CTA Yumeji." },
            { prop: "fallbackName", type: "string", required: true, description: "Nome mostrato finché i dati non sono caricati." },
            { prop: "onClose", type: "() => void", required: true, description: "Click sulla X in alto a destra." },
            { prop: "onFavorite", type: "() => void", description: "Click sul CTA Yumeji (mostrato solo in modalità Google)." },
          ]}
        />
        <CodeBlock
          code={`
import { PlaceHoverCard } from "@/features/explore/PlaceHoverCard";

// Modalità Google
<PlaceHoverCard
  placeId="ChIJ8T1GpMGOGGARDYGSgpooDWw"
  fallbackName="Senso-ji Temple"
  onClose={() => setSelected(null)}
  onFavorite={() => addToYumeji(placeId)}
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
  );
}
