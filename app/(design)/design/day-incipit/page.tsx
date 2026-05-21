/**
 * DayIncipit · design sketch
 *
 * Unifica `<Quote>` (lead+note del giorno) e `<GoLaunchTrigger>` (banner Ask me)
 * oggi separati in `TripDayView.tsx` riga 479-489. Una sola voce: Go racconta
 * la giornata e offre la chat in fondo, in linea conversazionale.
 *
 * Stati stackati:
 *   1. Default · versione finale animata "calma"
 *   2. In contesto · DayHeader sopra + Itinerary sotto in fade
 *   3. Anatomia · parti labellate
 *   4. Varianti copy · 3 giornate diverse
 *
 * Spec viva: docs/design/day-incipit.md
 */

const ROTATING_WORDS_UNIVERSAL = [
  "un posto da visitare",
  "dove mangiare",
  "una pausa caffè",
  "un'idea per stasera",
];

const SAMPLES = [
  {
    eyebrow: "Day 2 · Tokyo",
    summary: "La città si rivela nei dettagli: un tempio nascosto tra i grattacieli, un mercatino che apre all'alba, il rumore ordinato della folla.",
    notes:   "Mattina ideale per templi e parchi, shopping e torre nel pomeriggio.",
  },
  {
    eyebrow: "Day 5 · Roma",
    summary: "Una giornata di passeggiate tra vicoli silenziosi, fermandosi nei posti dove la luce cambia all'improvviso.",
    notes:   "Pomeriggio buono per un tè · cena leggera vicino al fiume.",
  },
  {
    eyebrow: "Day 3 · Costa amalfitana",
    summary: "Mare aperto, scogliera ripida, paesi che si arrampicano. Oggi si va piano, una cosa alla volta.",
    notes:   "Crema solare e scarpe da scoglio. Ristorante prenotato per le 20.",
  },
];

/* ─────────────────────────────────────────────────────────────────
   Animations
───────────────────────────────────────────────────────────────── */

const KEYFRAMES = `
  @keyframes diSpkTwinkle {
    0%,100% { transform:scale(1) rotate(0deg); opacity:1 }
    35%     { transform:scale(0.78) rotate(18deg); opacity:0.55 }
    70%     { transform:scale(1.08) rotate(-8deg); opacity:1 }
  }
  @keyframes diRotCycle {
    0%, 20% { transform: translateY(0) }
    25%,45% { transform: translateY(-22px) }
    50%,70% { transform: translateY(-44px) }
    75%,95% { transform: translateY(-66px) }
    100%    { transform: translateY(-88px) }
  }
  @keyframes diGoHalo {
    0%,100% { opacity:0.55; transform:scale(1) }
    50%     { opacity:1;    transform:scale(1.12) }
  }
  @media (prefers-reduced-motion: reduce) {
    .di-spk, .di-rot, .di-halo { animation: none !important }
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Components
───────────────────────────────────────────────────────────────── */

function GoAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex items-center justify-center rounded-full bg-ink text-white font-medium shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      五
      <span
        aria-hidden="true"
        className="di-halo absolute rounded-full -z-10"
        style={{
          inset: -4,
          background: "radial-gradient(circle, rgba(244,123,58,0.32), transparent 65%)",
          animation: "diGoHalo 2.8s ease-in-out infinite",
        }}
      />
    </span>
  );
}

function RotatingWords({ words, durationS = 14 }: { words: string[]; durationS?: number }) {
  // Repeat first word in tail per loop seamless
  const list = [...words, words[0]];
  return (
    <span
      aria-label={words.join(", ")}
      className="inline-block overflow-hidden align-[-5px]"
      style={{ height: 22, minWidth: 175 }}
    >
      <ul
        aria-hidden="true"
        className="di-rot list-none m-0 p-0 flex flex-col"
        style={{ animation: `diRotCycle ${durationS}s cubic-bezier(.65,.05,.36,1) infinite` }}
      >
        {list.map((w, i) => (
          <li
            key={i}
            className="font-serif italic font-medium whitespace-nowrap"
            style={{ height: 22, lineHeight: "22px", color: "var(--color-orange-deep)" }}
          >
            {w}
          </li>
        ))}
      </ul>
    </span>
  );
}

function GoCta({ words = ROTATING_WORDS_UNIVERSAL }: { words?: string[] }) {
  return (
    <button
      type="button"
      className="group mt-3 inline-flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-[14px] text-ink"
    >
      <span
        aria-hidden="true"
        className="di-spk inline-flex text-orange shrink-0"
        style={{ fontSize: 15, animation: "diSpkTwinkle 4.5s ease-in-out infinite" }}
      >
        <i className="ti ti-sparkles" />
      </span>
      <span className="font-serif italic text-ink">Vuoi trovare</span>
      <RotatingWords words={words} />
      <span className="font-serif italic text-ink">?</span>
      <span className="relative font-serif italic text-ink transition-colors group-hover:text-orange-deep">
        Chiedi a me.
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 bg-orange origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
          style={{ bottom: -2, height: 1 }}
        />
      </span>
      <span
        aria-hidden="true"
        className="text-orange-deep transition-transform duration-200 group-hover:translate-x-1 inline-flex"
        style={{ fontSize: 15, marginLeft: 2 }}
      >
        <i className="ti ti-arrow-right" />
      </span>
    </button>
  );
}

function DayIncipit({
  summary,
  notes,
  words,
}: {
  summary: string;
  notes?: string;
  words?: string[];
}) {
  return (
    <div className="flex gap-3.5 items-start">
      <GoAvatar size={40} />
      <div className="flex-1 min-w-0 border-l-[3px] border-orange pl-3.5">
        <p className="font-serif italic text-[18px] leading-[1.45] text-ink m-0">
          {summary}
        </p>
        {notes && (
          <p className="text-[13px] text-ink-soft leading-snug mt-2 mb-0">
            {notes}
          </p>
        )}
        <GoCta words={words} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sketch chrome
───────────────────────────────────────────────────────────────── */

function StateLabel({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1.5">
      <span className="w-[18px] h-[18px] rounded-full bg-ink text-white text-[10px] font-medium inline-flex items-center justify-center">
        {num}
      </span>
      <span className="text-[11px] uppercase tracking-[0.10em] font-medium text-ink-soft">
        <b className="text-ink">{title}</b> · <span className="text-ink-faint normal-case tracking-normal">{desc}</span>
      </span>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg rounded-xl border border-border overflow-hidden p-5 sm:p-7">
      {children}
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex justify-center items-center gap-1.5 text-ink-faint text-[11px] py-1">
      <i className="ti ti-arrow-down text-[14px]" />
      <span>{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Guidelines section
───────────────────────────────────────────────────────────────── */

function GuidelinesBlock() {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="text-orange text-[11px] tracking-[0.12em] uppercase font-medium mb-1">
        Linee guida sviluppatore
      </div>
      <h2 className="text-[19px] font-medium leading-tight mb-4">
        Implementazione del componente <code className="bg-surface-soft px-1.5 py-0.5 rounded text-[15px]">DayIncipit</code>
      </h2>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Dove vive</h3>
      <ul className="text-[12.5px] text-ink-soft leading-relaxed list-disc pl-5 space-y-1">
        <li>
          File componente: <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">features/day/DayIncipit.tsx</code>
        </li>
        <li>
          Sandbox entry: <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">app/(dev)/dev/day-incipit/page.tsx</code> + registry in <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">app/(dev)/dev/registry.ts</code> (gruppo Features · subgroup Day).
        </li>
        <li>
          Sostituisce in <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">TripDayView.tsx</code> riga 479-489 i due blocchi <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">&lt;Quote&gt;</code> e <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">&lt;GoLaunchTrigger&gt;</code>.
        </li>
      </ul>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Anatomia</h3>
      <ol className="text-[12.5px] text-ink-soft leading-relaxed list-decimal pl-5 space-y-1.5">
        <li><b className="text-ink font-medium">GoAvatar</b> · size <code className="text-[11px]">lg</code>, <code className="text-[11px]">pulse</code> sempre on. Riusare il componente esistente da <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">features/ai-suggest/GoAvatar</code>.</li>
        <li><b className="text-ink font-medium">Quote body</b> · stesso pattern del componente <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">Quote</code> esistente: border-left <code className="text-[11px]">3px</code> arancio, padding-left <code className="text-[11px]">14px</code>, font serif italic, dimensione <code className="text-[11px]">md</code>. La <code className="text-[11px]">note</code> opzionale sotto (text-ink-soft <code className="text-[11px]">13px</code>).</li>
        <li><b className="text-ink font-medium">GoCta</b> · riga conversazionale finale: sparkles + "Vuoi trovare" + RotatingWords + "?" + "Chiedi a me." + arrow.</li>
      </ol>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Componenti da estrarre</h3>
      <p className="text-[12.5px] text-ink-soft leading-relaxed">
        <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">RotatingWords</code> appare due volte (qui e in <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">GoChat &gt; GoTrigger</code>): promuoverlo a <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">components/ui/RotatingWords.tsx</code> con props <code className="text-[11px]">{`{ words: string[]; durationS?: number; itemHeightPx?: number }`}</code>. Aggiungere voce in <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">registry.ts</code> sotto Atoms.
      </p>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Animazioni · tabella di riferimento</h3>
      <div className="overflow-x-auto">
        <table className="text-[12px] w-full border-collapse">
          <thead>
            <tr className="text-left text-ink-faint uppercase tracking-[0.06em] text-[10px]">
              <th className="font-medium py-2 pr-4 border-b border-border">Elemento</th>
              <th className="font-medium py-2 pr-4 border-b border-border">Effetto</th>
              <th className="font-medium py-2 pr-4 border-b border-border">Durata</th>
              <th className="font-medium py-2 pr-4 border-b border-border">Curva</th>
              <th className="font-medium py-2 border-b border-border">Stato</th>
            </tr>
          </thead>
          <tbody className="text-ink-soft">
            <tr className="border-b border-border">
              <td className="py-2 pr-4 text-ink">Halo Go avatar</td>
              <td className="py-2 pr-4">opacity 0.55 → 1 + scale 1 → 1.12</td>
              <td className="py-2 pr-4">2.8s</td>
              <td className="py-2 pr-4 font-mono text-[11px]">ease-in-out</td>
              <td className="py-2">infinite</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 text-ink">Sparkles twinkle</td>
              <td className="py-2 pr-4">scale + rotate + opacity</td>
              <td className="py-2 pr-4">4.5s (versione calma)</td>
              <td className="py-2 pr-4 font-mono text-[11px]">ease-in-out</td>
              <td className="py-2">infinite</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 text-ink">RotatingWords cycle</td>
              <td className="py-2 pr-4">translateY a step di -22px</td>
              <td className="py-2 pr-4">14s totali, ~3.5s per word</td>
              <td className="py-2 pr-4 font-mono text-[11px]">cubic-bezier(.65,.05,.36,1)</td>
              <td className="py-2">infinite</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 text-ink">"Chiedi a me." underline</td>
              <td className="py-2 pr-4">scaleX 0 → 1 origin-left, color → orange-deep</td>
              <td className="py-2 pr-4">300ms</td>
              <td className="py-2 pr-4 font-mono text-[11px]">cubic-bezier(.4,0,.2,1)</td>
              <td className="py-2">on hover/focus</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-ink">Arrow slide</td>
              <td className="py-2 pr-4">translateX 0 → 4px</td>
              <td className="py-2 pr-4">200ms</td>
              <td className="py-2 pr-4 font-mono text-[11px]">ease</td>
              <td className="py-2">on hover/focus</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Token di colore</h3>
      <ul className="text-[12.5px] text-ink-soft leading-relaxed list-disc pl-5 space-y-1">
        <li>Quote lead → <code className="text-[11px]">text-ink</code></li>
        <li>Quote note → <code className="text-[11px]">text-ink-soft</code></li>
        <li>Border left + sparkles + underline → <code className="text-[11px]">border-orange</code> / <code className="text-[11px]">text-orange</code></li>
        <li>RotatingWords + "Chiedi a me." hover + arrow → <code className="text-[11px]">text-orange-deep</code></li>
        <li>Halo gradient → <code className="text-[11px]">rgba(244,123,58,0.32)</code> (token <code className="text-[11px]">--color-orange</code> con alpha)</li>
      </ul>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Copy guidelines</h3>
      <ul className="text-[12.5px] text-ink-soft leading-relaxed list-disc pl-5 space-y-1.5">
        <li>
          <b className="text-ink font-medium">Lista rotating words universale</b> (per ora, nessuna contestualizzazione per giorno):
          <div className="bg-surface-soft rounded-md px-3 py-2 mt-1 font-mono text-[11px] text-ink leading-relaxed">
            ["un posto da visitare", "dove mangiare", "una pausa caffè", "un'idea per stasera"]
          </div>
        </li>
        <li><b className="text-ink font-medium">Punteggiatura classica</b>: chiusura del periodo con punto interrogativo (<code className="text-[11px]">?</code>), seconda frase capitalizzata (<code className="text-[11px]">Chiedi a me.</code>). Niente em-dash, niente pipe, niente "—".</li>
        <li><b className="text-ink font-medium">Tono</b>: serif italic per la voce di Go, sans-serif per la nota pratica. La CTA "Chiedi a me." è in serif italic per coerenza con la voce.</li>
        <li><b className="text-ink font-medium">i18n</b>: tutte le stringhe via <code className="text-[11px]">useTranslations("DayIncipit")</code>. La lista rotating words va in <code className="text-[11px]">messages/{`{en,it}`}.json</code> chiave <code className="text-[11px]">DayIncipit.rotatingWords</code>.</li>
      </ul>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Accessibilità</h3>
      <ul className="text-[12.5px] text-ink-soft leading-relaxed list-disc pl-5 space-y-1.5">
        <li>L'intera CTA è un <code className="text-[11px]">&lt;button type="button"&gt;</code> con <code className="text-[11px]">aria-label</code> completo (es. <code className="text-[11px]">"Apri la chat con Go per consigli sul giorno"</code>).</li>
        <li>Sparkles e arrow sono <code className="text-[11px]">aria-hidden</code>.</li>
        <li><code className="text-[11px]">RotatingWords</code> espone tramite <code className="text-[11px]">aria-label</code> la lista completa delle parole, e marca la <code className="text-[11px]">&lt;ul&gt;</code> come <code className="text-[11px]">aria-hidden</code> (è puramente decorativa).</li>
        <li>Tutte le animazioni rispettano <code className="text-[11px]">@media (prefers-reduced-motion: reduce)</code>: halo, sparkles e rotating words si fermano sulla prima parola.</li>
        <li>Focus ring del button: <code className="text-[11px]">focus-visible:ring-2 ring-orange/40 ring-offset-2 ring-offset-bg</code>.</li>
      </ul>

      <h3 className="text-[14px] font-medium mt-6 mb-2">API del componente</h3>
      <pre className="bg-surface-soft rounded-md p-3 text-[11.5px] leading-relaxed overflow-x-auto font-mono text-ink">{`type DayIncipitProps = {
  /** Lead — racconto del giorno in serif italic (era Quote.lead) */
  summary: string;
  /** Nota pratica opzionale — sans-serif, text-ink-soft (era Quote.note) */
  notes?: string;
  /** Handler aperto chat Go. Se assente, la CTA non è renderizzata. */
  onAskGo?: () => void;
  /** Override delle rotating words. Default: lista universale i18n. */
  words?: string[];
  className?: string;
};`}</pre>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Regole di rendering</h3>
      <ul className="text-[12.5px] text-ink-soft leading-relaxed list-disc pl-5 space-y-1">
        <li>Se <code className="text-[11px]">!summary &amp;&amp; !notes</code> → non renderizzare nulla.</li>
        <li>Se <code className="text-[11px]">!summary &amp;&amp; notes</code> → renderizza <code className="text-[11px]">notes</code> come lead (fallback corrente di TripDayView).</li>
        <li>Se <code className="text-[11px]">!onAskGo</code> → il blocco GoCta è omesso, ma l'avatar e l'halo restano (Go racconta sempre, ma non sempre invita).</li>
        <li>Il componente è <code className="text-[11px]">{`"use client"`}</code> perché contiene hover state + animation keyframes locali.</li>
      </ul>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Integrazione in <code className="bg-surface-soft px-1 py-0.5 rounded text-[12px]">TripDayView</code></h3>
      <p className="text-[12.5px] text-ink-soft leading-relaxed mb-2">Sostituire righe 479-489 con:</p>
      <pre className="bg-surface-soft rounded-md p-3 text-[11.5px] leading-relaxed overflow-x-auto font-mono text-ink">{`{(selectedDay.summary || selectedDay.notes) && (
  <DayIncipit
    summary={selectedDay.summary ?? selectedDay.notes!}
    notes={selectedDay.summary ? (selectedDay.notes ?? undefined) : undefined}
    onAskGo={!goHasBeenOpened ? openGo : undefined}
    className="mt-7"
  />
)}`}</pre>
      <p className="text-[12.5px] text-ink-soft leading-relaxed mt-2">
        Il flag <code className="text-[11px]">!goHasBeenOpened</code> nascondeva l'intero trigger se Go era già stato aperto. Adesso la CTA scompare ma Go continua a "raccontare" il giorno con l'avatar. Decisione da validare con Enrico: se la CTA deve sempre essere visibile (anche dopo aver aperto Go una volta), togliere il condition e passare sempre <code className="text-[11px]">onAskGo={`{openGo}`}</code>.
      </p>

      <h3 className="text-[14px] font-medium mt-6 mb-2">Da rimuovere</h3>
      <ul className="text-[12.5px] text-ink-soft leading-relaxed list-disc pl-5 space-y-1">
        <li>Componente <code className="text-[11px]">GoLaunchTrigger</code> (cercare usi nel codebase: se solo TripDayView, eliminarlo).</li>
        <li>L'uso di <code className="text-[11px]">Quote</code> in <code className="text-[11px]">TripDayView.tsx</code> riga 11 (l'import) e riga 481. Il componente <code className="text-[11px]">Quote</code> resta come atomo riusabile altrove.</li>
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Anatomy diagram
───────────────────────────────────────────────────────────────── */

function AnatomyView() {
  return (
    <div className="relative">
      <DayIncipit summary={SAMPLES[0].summary} notes={SAMPLES[0].notes} />

      <div className="mt-5 pt-4 border-t border-dashed border-border-strong">
        <div className="text-[10.5px] tracking-[0.10em] uppercase text-orange font-medium mb-2">
          Parti
        </div>
        <ul className="text-[12px] text-ink-soft leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
          <li>① <b className="text-ink font-medium">GoAvatar</b> · 40px · halo arancio pulsante</li>
          <li>② <b className="text-ink font-medium">Border arancio</b> · 3px · pl-14px (token Quote)</li>
          <li>③ <b className="text-ink font-medium">Lead</b> · serif italic 18px · text-ink</li>
          <li>④ <b className="text-ink font-medium">Note</b> · sans 13px · text-ink-soft · opzionale</li>
          <li>⑤ <b className="text-ink font-medium">Sparkles</b> · 15px arancio · twinkle 4.5s</li>
          <li>⑥ <b className="text-ink font-medium">"Vuoi trovare"</b> · serif italic ink · invariato</li>
          <li>⑦ <b className="text-ink font-medium">RotatingWords</b> · 4 opzioni · ciclo 14s</li>
          <li>⑧ <b className="text-ink font-medium">"Chiedi a me."</b> · serif italic ink · underline hover</li>
          <li>⑨ <b className="text-ink font-medium">Arrow</b> · slide 4px hover · arancio</li>
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   In-context preview · simulates TripDayView surroundings
───────────────────────────────────────────────────────────────── */

function InContextPreview() {
  return (
    <div>
      {/* Faded DayHeader */}
      <div className="opacity-40 pointer-events-none mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className="text-orange text-[10.5px] tracking-[0.10em] uppercase font-medium">Day 2 · Sat 1 Aug</div>
          <div className="h-px flex-1 bg-border" />
          <div className="text-ink-faint text-[11.5px]">5 attività</div>
        </div>
        <h2 className="text-[24px] font-medium mt-1">Asakusa e Sumida-Gawa</h2>
      </div>

      {/* The incipit itself */}
      <DayIncipit summary={SAMPLES[0].summary} notes={SAMPLES[0].notes} />

      {/* Faded itinerary teaser */}
      <div className="opacity-40 pointer-events-none mt-7 space-y-1.5">
        {[
          { time: "08:00", name: "Sensō-ji" },
          { time: "10:30", name: "Parco Sumida" },
          { time: "12:30", name: "Pranzo · Kuramae" },
        ].map((a) => (
          <div key={a.time} className="bg-surface border border-border rounded-md px-3 py-2 flex gap-3 text-[12px]">
            <span className="font-mono text-ink-faint">{a.time}</span>
            <span className="text-ink">{a.name}</span>
          </div>
        ))}
        <div className="text-[10.5px] text-ink-faint italic pt-1">…</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */

export default function DayIncipitSketch() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-3.5">
        <header className="mb-2">
          <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-1">Sketch</div>
          <h1 className="text-[22px] font-medium leading-tight">DayIncipit</h1>
          <p className="text-[12.5px] text-ink-soft mt-1.5 leading-relaxed">
            Unifica <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">Quote</code> e <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">GoLaunchTrigger</code> nella head di <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">TripDayView</code>. Una voce sola — Go racconta la giornata e in fondo offre la chat, in linea conversazionale.
            <br />
            <span className="text-ink-faint">
              Spec viva:{" "}
              <a className="text-orange-deep hover:underline" href="/dev/docs/day-incipit">
                docs/design/day-incipit.md
              </a>{" "}
              · sostituisce blocco <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">TripDayView.tsx</code> righe 479-489.
            </span>
          </p>
        </header>

        {/* STATE 1 · default */}
        <div>
          <StateLabel num={1} title="Versione finale" desc="animazioni calme · hover-driven underline + arrow slide" />
          <Frame>
            <DayIncipit summary={SAMPLES[0].summary} notes={SAMPLES[0].notes} />
            <p className="text-[10.5px] text-ink-faint italic mt-5 text-center">
              passa il mouse sulla CTA per vedere underline + arrow slide
            </p>
          </Frame>
        </div>

        <Arrow label="contestualizzato nella pagina del giorno" />

        {/* STATE 2 · in context */}
        <div>
          <StateLabel num={2} title="In contesto" desc="DayHeader sopra · itinerary sotto · entrambi attenuati per focus" />
          <Frame>
            <InContextPreview />
          </Frame>
        </div>

        <Arrow label="parti del componente" />

        {/* STATE 3 · anatomy */}
        <div>
          <StateLabel num={3} title="Anatomia" desc="parti labellate · token e dimensioni" />
          <Frame>
            <AnatomyView />
          </Frame>
        </div>

        <Arrow label="resilienza al copy" />

        {/* STATE 4 · copy variants */}
        <div>
          <StateLabel num={4} title="Varianti copy" desc="tre giornate diverse · lead+note variano · CTA universale" />
          <Frame>
            <div className="flex flex-col gap-7">
              {SAMPLES.map((s) => (
                <div key={s.eyebrow}>
                  <div className="text-orange text-[10.5px] tracking-[0.10em] uppercase font-medium mb-2">
                    {s.eyebrow}
                  </div>
                  <DayIncipit summary={s.summary} notes={s.notes} />
                </div>
              ))}
            </div>
          </Frame>
        </div>

        <GuidelinesBlock />

        <footer className="mt-4 pt-4 border-t border-border text-[11px] text-ink-faint leading-relaxed">
          <b className="text-ink-soft font-medium">Riusi previsti</b> · <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">GoAvatar</code> esistente · <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">RotatingWords</code> da estrarre come atomo (usato anche in <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">GoTrigger</code>) · token <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">--color-orange</code>, <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">--color-orange-deep</code>, <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">--color-ink</code>, <code className="bg-surface-soft px-1 py-0.5 rounded text-[10.5px]">--color-ink-soft</code>.
        </footer>
      </div>
    </>
  );
}
