import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import "./docs.css";

const DOCS_DIR_REL = "docs/design";

type DocMeta = {
  slug: string;
  title: string;
  status: string;
  date: string;
  related: string;
  description: string;
};

async function getDocs(): Promise<DocMeta[]> {
  const docsDir = path.join(process.cwd(), DOCS_DIR_REL);
  let files: string[] = [];
  try {
    files = (await fs.readdir(docsDir)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  const docs = await Promise.all(
    files.map(async (fname) => {
      const fullPath = path.join(docsDir, fname);
      const content = await fs.readFile(fullPath, "utf-8");
      const lines = content.split("\n");

      const titleLine = lines.find((l) => /^#\s+/.test(l));
      const title = titleLine
        ? titleLine.replace(/^#\s+/, "").trim()
        : fname.replace(".md", "");

      const findField = (label: string) => {
        const line = lines.find((l) =>
          new RegExp(`^\\*\\*${label}:\\*\\*`).test(l)
        );
        return line ? line.replace(new RegExp(`^\\*\\*${label}:\\*\\*\\s*`), "").trim() : "";
      };

      const status = findField("Stato");
      const date = findField("Ultimo aggiornamento");
      const related = findField("Doc correlato");

      // Primo paragrafo "discorsivo" dopo H1 e meta
      let description = "";
      const h1Idx = lines.findIndex((l) => /^#\s+/.test(l));
      if (h1Idx >= 0) {
        for (let i = h1Idx + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          if (line.startsWith("**")) continue;
          if (line.startsWith("---")) continue;
          if (line.startsWith("#")) break;
          if (line.startsWith("##")) break;
          // skip "## Obiettivo" hint and pick the first prose line under it
          description = line.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // strip markdown links
          break;
        }
      }

      return {
        slug: fname.replace(".md", ""),
        title,
        status,
        date,
        related,
        description,
      };
    })
  );

  // Ordinamento: data desc se presente, altrimenti alfabetico
  return docs.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return a.title.localeCompare(b.title);
  });
}

export default async function DocsIndexPage() {
  const docs = await getDocs();

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-orange text-[11px] font-medium tracking-[0.12em] uppercase mb-2">
          Design docs · viewer
        </div>
        <h1 className="text-[26px] font-medium leading-tight mb-2">
          Design docs
        </h1>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[640px]">
          Indice dei MD vivi in <code className="bg-surface-soft px-1.5 py-0.5 rounded text-[12px]">docs/design/</code>.
          Brainstorm, decisioni, stato avanzamento, changelog — un click per aprire.
        </p>
      </header>

      {docs.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-6 text-center text-ink-soft text-sm">
          Nessun MD trovato in <code>docs/design/</code>.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((d) => (
            <Link
              key={d.slug}
              href={`/dev/docs/${d.slug}`}
              className="group bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-surface-soft flex items-center justify-center flex-shrink-0 text-ink-soft">
                  <i className="ti ti-file-text text-[16px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <h2 className="text-[14px] font-medium text-ink truncate">{d.title}</h2>
                    {d.date && (
                      <span className="text-[10px] text-ink-faint tracking-wider tabular-nums flex-shrink-0">
                        {d.date}
                      </span>
                    )}
                  </div>
                  {d.description && (
                    <p className="text-[12.5px] text-ink-soft leading-snug line-clamp-2">
                      {d.description}
                    </p>
                  )}
                  {(d.status || d.related) && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-ink-faint">
                      {d.status && (
                        <span>
                          <b className="text-ink-soft font-medium">Stato:</b> {d.status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <i className="ti ti-arrow-up-right text-ink-faint text-[16px] flex-shrink-0 mt-1 group-hover:text-orange-deep transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-[11px] text-ink-faint">
        Renderer markdown: <code className="bg-surface-soft px-1.5 py-0.5 rounded text-[11px]">marked</code> via CDN ·
        Sorgente: <code className="bg-surface-soft px-1.5 py-0.5 rounded text-[11px]">{DOCS_DIR_REL}{"/*.md"}</code>
      </div>
    </div>
  );
}
