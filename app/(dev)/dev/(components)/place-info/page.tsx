"use client";

import { PlaceInfoPanel, type PlaceInfo } from "@/features/trip/PlaceInfoPanel";
import { StoryPage, StoryFrame, DocsFrame, PropsTable, CodeBlock } from "../_components/StoryFrame";

const TOKYO: PlaceInfo = {
  currency: {
    eyebrow: "Yen giapponese · ¥",
    rate: 168,
    rateLabel: "per 1 € · cambio di oggi",
    baseSymbol: "€",
    targetSymbol: "¥",
    goTip: "cash king nei konbini e nei templi. Gli ATM al 7-Eleven accettano carte estere h24 — comoda fermata strategica.",
    aside: {
      title: "Buono a sapersi",
      items: [
        "Tip non si lascia, anzi può offendere.",
        "Banche aperte 9-15, ATM h24 nei minimarket.",
        "SUICA card per metro & konbini, ricaricabile.",
        "Tax-free: 5000 ¥ minimi nei grandi store.",
      ],
    },
  },
  visa: {
    eyebrow: "Frontiera · passaporto italiano",
    statusBig: "Non serve",
    statusSub: "soggiorno turistico fino a 90 giorni",
    badge: "Visa waiver attivo, ingressi multipli in sei mesi",
    goTip: "il passaporto deve essere valido per tutta la durata del soggiorno. Per studiare o lavorare serve un visto diverso.",
    aside: {
      title: "Documenti da portare",
      items: [
        "Passaporto valido.",
        "Biglietto di ritorno o di proseguimento.",
        "Indirizzo della prima notte (richiesto allo sbarco).",
        "Optional: copia digitale di tutto su drive.",
      ],
    },
  },
  weather: {
    eyebrow: "Tokyo · fine luglio / inizio agosto",
    tempBig: "26° / 22°",
    tempSub: "media massima / minima · estate piena",
    stats: [
      { k: "Pioggia", v: "11 / 30 giorni", tone: "warn" },
      { k: "Umidità", v: "78%", tone: "warn" },
      { k: "UV index", v: "9 (alto)", tone: "warn" },
      { k: "Tifoni", v: "possibili" },
    ],
    goTip: "lino, scarpe traspiranti, un ombrellino pieghevole. Niente jeans pesanti, te lo prometto.",
    aside: {
      title: "Quando uscire",
      items: [
        "Mattina presto (7-10) per i templi.",
        "Pausa 13-16 in musei climatizzati.",
        "Tramonto a Shibuya o sui ponti.",
        "Notte estiva = matsuri e festival.",
      ],
    },
  },
  power: {
    eyebrow: "Prese elettriche",
    plugBig: "Tipo A · B",
    plugSub: "100 V · 50 Hz est / 60 Hz ovest",
    stats: [
      { k: "Adattatore", v: "Sì — Type A", tone: "warn" },
      { k: "Voltaggio", v: "Quasi tutti i caricatori OK", tone: "ok" },
    ],
    goTip: "portati un multipresa con due ingressi USB-C: spesso negli ryokan trovi una sola presa libera.",
    aside: {
      title: "Cosa controllare",
      items: [
        "Caricatore laptop: 100-240 V → OK.",
        "Asciugacapelli da casa: spesso 220 V → no.",
        "Macchinetta da barba: dipende, leggi etichetta.",
        "Powerbank a bordo, mai in stiva.",
      ],
    },
  },
  language: {
    eyebrow: "Giapponese · 日本語",
    heroBig: "«arigatō»",
    heroSub: "cinque frasi pronte da imparare",
    phrases: [
      { label: "Ciao", native: "こんにちは", roman: "kon-nichi-wa" },
      { label: "Grazie", native: "ありがとうございます", roman: "arigatō gozaimasu" },
      { label: "Scusi", native: "すみません", roman: "sumimasen" },
      { label: "Quanto costa?", native: "いくらですか", roman: "ikura desu ka" },
      { label: "Dov'è il bagno?", native: "トイレはどこですか", roman: "toire wa doko desu ka" },
    ],
    aside: {
      title: "Per cavarsela",
      items: [
        "I cartelli a Tokyo sono quasi tutti in inglese.",
        "Google Translate fotocamera funziona benissimo.",
        "Un inchino leggero vale più di mille parole.",
        "Non alzare la voce: lo trovano scortese.",
      ],
    },
  },
  safety: {
    eyebrow: "Sicurezza generale · Farnesina",
    levelBig: "Molto sicura",
    levelSub: "precauzione ordinaria · rischi naturali",
    stats: [
      { k: "Polizia", v: "110" },
      { k: "Ambulanza", v: "119" },
      { k: "Ambasciata IT", v: "03-3453-5291" },
      { k: "Acqua di rubinetto", v: "Sicura", tone: "ok" },
    ],
    goTip: "scarica l'app NHK World per allerte sismiche in inglese. In hotel ti spiegheranno la via di fuga.",
    aside: {
      title: "Buono a sapersi",
      items: [
        "Terremoti frequenti ma leggeri.",
        "Tifoni tra agosto e ottobre.",
        "Furti rarissimi, oggetti smarriti tornano.",
        "Police box (kōban) ad ogni grande incrocio.",
      ],
    },
  },
};

const PARTIAL: PlaceInfo = {
  currency: TOKYO.currency,
  weather: TOKYO.weather,
};

export default function PlaceInfoStories() {
  return (
    <StoryPage
      title="PlaceInfoPanel"
      description="«Know before you go» country card. Tab strip over up to six sections (currency · visa · weather · power · language · safety). Fully data-driven and presentational — values come from country tables / rates / AI."
    >
      <StoryFrame name="All sections" description="Six tabs with full Japan / Tokyo test data. Currency tab has a live mini-converter.">
        <PlaceInfoPanel info={TOKYO} />
      </StoryFrame>

      <StoryFrame name="Partial data" description="Only the provided sections render tabs (here: currency + weather).">
        <PlaceInfoPanel info={PARTIAL} />
      </StoryFrame>

      <StoryFrame name="Empty" description="No destination resolved yet → placeholder.">
        <PlaceInfoPanel info={{}} />
      </StoryFrame>

      <DocsFrame>
        <PropsTable rows={[
          { prop: "info", type: "PlaceInfo", required: true, description: "Up to six optional sections: currency, visa, weather, power, language, safety. Only provided sections get a tab." },
          { prop: "className", type: "string", description: "Extra classes on the <section>." },
        ]} />
        <CodeBlock code={`
import { PlaceInfoPanel } from "@/features/trip/PlaceInfoPanel";

<PlaceInfoPanel
  info={{
    currency: { eyebrow: "Yen · ¥", rate: 168, rateLabel: "per 1 €", baseSymbol: "€", targetSymbol: "¥", aside: { title: "Good to know", items: [...] } },
    weather: { eyebrow: "Tokyo · late July", tempBig: "26° / 22°", tempSub: "summer", stats: [{ k: "Rain", v: "11/30", tone: "warn" }], aside: { title: "When to go", items: [...] } },
    // visa · power · language · safety …
  }}
/>
        `} />
      </DocsFrame>
    </StoryPage>
  );
}
