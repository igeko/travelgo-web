import fs from "fs/promises";
import path from "path";
import Link from "next/link";

const DESIGN_DIR_REL = "app/(design)/design";

async function getSketches(): Promise<string[]> {
  const dir = path.join(process.cwd(), DESIGN_DIR_REL);
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

export default async function DesignIndex() {
  const sketches = await getSketches();

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          TravelGo · design scratchpad
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-3">Design sketches</h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[640px]">
          Mockup Next/React in fase di iterazione attiva. Vivono qui per essere modificati spesso senza inquinare il sandbox dei componenti.
          <br />
          <span className="text-ink-faint">
            No API, no servizi reali, no Supabase, no AI vera, no Maps reali.
            Riuso di <code className="bg-surface-soft px-1 py-0.5 rounded text-[12px]">components/ui/*</code> e{" "}
            <code className="bg-surface-soft px-1 py-0.5 rounded text-[12px]">features/*</code> dove aiuta la coerenza.
          </span>
        </p>
      </header>

      {sketches.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-6 text-center text-ink-soft text-sm">
          Nessuno sketch in <code className="bg-surface-soft px-1.5 py-0.5 rounded">app/(design)/design/</code> per ora.
          <br />
          <span className="text-ink-faint text-[12px]">Crea una nuova cartella con dentro un <code className="bg-surface-soft px-1 py-0.5 rounded">page.tsx</code> per cominciare.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sketches.map((slug) => (
            <Link
              key={slug}
              href={`/design/${slug}`}
              className="group bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-md bg-surface-soft flex items-center justify-center flex-shrink-0 text-ink-soft">
                <i className="ti ti-vector-bezier-2 text-[14px]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[14px] font-medium text-ink">{slug}</h2>
                <p className="text-[11px] text-ink-faint mt-0.5">/design/{slug}</p>
              </div>
              <i className="ti ti-arrow-up-right text-ink-faint text-[16px] group-hover:text-orange-deep transition-colors" />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-[11px] text-ink-faint leading-relaxed">
        <b className="text-ink-soft font-medium">Nuovo sketch:</b> crea{" "}
        <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">
          app/(design)/design/&lt;slug&gt;/page.tsx
        </code>{" "}
        — appare qui automaticamente.
        <br />
        <b className="text-ink-soft font-medium">Spec di design viventi:</b> <Link href="/dev/docs" className="text-orange-deep hover:underline">/dev/docs</Link> (legge i MD da{" "}
        <code className="bg-surface-soft px-1 py-0.5 rounded text-[11px]">docs/design/</code>).
      </div>
    </div>
  );
}
