import fs from "fs/promises";
import path from "path";
import Link from "next/link";

const SECTION_DIR_REL = "app/(design)/design/activities-editor";

const META: Record<string, { title: string; desc: string; icon: string }> = {
  builder: {
    title: "Builder",
    desc: "Two-pane workshop · Wishlist a sinistra, giorni a destra. ASSIGNMENT level: drag dalla wishlist al giorno, AI organize, swap tra giorni.",
    icon: "ti-layout-columns",
  },
  day: {
    title: "Day editor",
    desc: "Inline edit del singolo giorno · SCHEDULING level: + Add block (hover), pencil/trash/drag handle, bridge editor inline, auto-save.",
    icon: "ti-pencil",
  },
};

async function getChildren(): Promise<string[]> {
  const dir = path.join(process.cwd(), SECTION_DIR_REL);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(
        (e) =>
          e.isDirectory() &&
          !e.name.startsWith("_") &&
          !e.name.startsWith(".") &&
          !e.name.startsWith("(")
      )
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export default async function ActivitiesEditorOverview() {
  const children = await getChildren();

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          Design · root
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-3">Activities Editor</h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[640px]">
          Famiglia di sketch che si occupa di <b className="text-ink font-medium">come l'utente compone e affina la timeline</b> di un viaggio. Lavora a livello di <b className="text-ink font-medium">istanza</b> (un'attività in uno specifico giorno) — non a livello di <b className="text-ink font-medium">entità</b> (Sensō-ji come "thing").
          <br />
          <span className="text-ink-faint">
            Per le entità (dettagli del posto, foto, descrizione lunga, indirizzo) si va sulla pagina <i>Activity Detail</i> (TBD). Spec viva in{" "}
            <a className="text-orange-deep hover:underline" href="/dev/docs/activities-editor">
              docs/design/activities-editor.md
            </a>
            .
          </span>
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {children.map((slug) => {
          const m = META[slug] ?? { title: slug, desc: "", icon: "ti-vector-bezier-2" };
          return (
            <Link
              key={slug}
              href={`/design/activities-editor/${slug}`}
              className="group bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-md bg-surface-soft flex items-center justify-center flex-shrink-0 text-ink-soft">
                <i className={`ti ${m.icon} text-[14px]`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[14px] font-medium text-ink">{m.title}</h2>
                {m.desc && <p className="text-[12.5px] text-ink-soft leading-snug mt-1">{m.desc}</p>}
                <p className="text-[11px] text-ink-faint mt-1.5">/design/activities-editor/{slug}</p>
              </div>
              <i className="ti ti-arrow-up-right text-ink-faint text-[16px] flex-shrink-0 mt-1 group-hover:text-orange-deep transition-colors" />
            </Link>
          );
        })}
      </div>

      <div className="mt-8 text-[11px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft font-medium">Suddivisione delle responsabilità</b> (decisione recente):
        <ul className="mt-1.5 space-y-0.5">
          <li>• <b className="text-ink-soft">Builder</b> = ASSIGNMENT · quale attività in quale giorno</li>
          <li>• <b className="text-ink-soft">Day editor</b> = SCHEDULING · quando, ordine, ponti, note di istanza</li>
          <li>• <b className="text-ink-soft">Activity Detail</b> (TBD) = IDENTITY · nome, foto, indirizzo, descrizione del posto</li>
        </ul>
      </div>
    </div>
  );
}
