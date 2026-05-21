"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { Quote } from "@/components/ui/Quote";
import { IconSparkles, IconArrowRight } from "@/components/ui/icons";

/* ─────────────────────────────────────────────────────────────────
   DayIncipit · unisce la voce di Go e il riassunto del giorno.

   Layout: GoAvatar (五) a sinistra, a destra il corpo Quote (lead +
   note opzionale) e la CTA conversazionale "Chiedi a me." con parole
   rotanti. Presentazionale: l'azione è delegata via `onAsk`.

   Riusa Quote (slot footer) e GoAvatar esistenti, oltre alle keyframe
   go-words-rotate / go-spark / go-halo definite in app/globals.css.
─────────────────────────────────────────────────────────────────── */

export type DayIncipitProps = {
  /** Riassunto del giorno — serif italic */
  lead: string;
  /** Nota pratica opzionale sotto il lead */
  note?: string;
  /** Parole rotanti della CTA. Default: le 4 stringhe i18n di DayIncipit. */
  words?: string[];
  /** Click sulla CTA "Chiedi a me." — apre Go nel contesto host. */
  onAsk?: () => void;
  className?: string;
};

export function DayIncipit({ lead, note, words, onAsk, className }: DayIncipitProps) {
  const t = useTranslations("DayIncipit");
  const rotating =
    words ?? [t("rotating0"), t("rotating1"), t("rotating2"), t("rotating3")];

  return (
    <div className={cn("flex items-start gap-3.5", className)}>
      <GoAvatar size="lg" />
      <Quote
        lead={lead}
        note={note}
        className="flex-1 min-w-0"
        footer={<GoAsk words={rotating} onAsk={onAsk} />}
      />
    </div>
  );
}

/* ── CTA conversazionale ──────────────────────────────────────────── */

function GoAsk({ words, onAsk }: { words: string[]; onAsk?: () => void }) {
  const t = useTranslations("DayIncipit");
  return (
    <button
      type="button"
      onClick={onAsk}
      aria-label={t("ariaLabel")}
      className="group mt-3 flex w-full items-center gap-2 text-meta text-ink"
    >
      <IconSparkles size={15} className="go-spark shrink-0 text-orange" />
      <span className="inline-flex items-center font-serif italic">
        {t("wantToFind")}&nbsp;
        <RotatingWords words={words} />
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
        <span className="relative font-serif italic transition-colors group-hover:text-orange-deep">
          {t("ask")}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-orange transition-transform duration-300 group-hover:scale-x-100"
          />
        </span>
        <IconArrowRight
          size={15}
          className="shrink-0 text-orange-deep transition-transform duration-200 group-hover:translate-x-1"
        />
      </span>
    </button>
  );
}

/* ── Parole rotanti ───────────────────────────────────────────────── */
// Item height fissa a 20px (h-5 / leading-5) per allinearsi agli step di
// -20px della keyframe `go-words-rotate`. La lista ripete la prima parola
// in coda per un loop senza salto. Tarata su 4 parole.
function RotatingWords({ words }: { words: string[] }) {
  const list = [...words, words[0]];
  return (
    <span
      aria-label={words.map((w) => `${w}?`).join(", ")}
      className="inline-block h-5 overflow-hidden text-left align-[-5px]"
    >
      <ul aria-hidden="true" className="go-words-rotate m-0 flex list-none flex-col p-0">
        {list.map((w, i) => (
          <li
            key={`${w}-${i}`}
            className="h-5 whitespace-nowrap font-serif italic font-medium leading-5 text-orange-deep"
          >
            {w}?
          </li>
        ))}
      </ul>
    </span>
  );
}
