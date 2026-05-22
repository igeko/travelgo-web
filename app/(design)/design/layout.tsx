import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { DesignShell, type DesignEntry } from "./_components/DesignShell";
import {
  designCategories,
  designOrderIndex,
  DESIGN_FALLBACK_GROUP,
  DESIGN_GROUP_ORDER,
} from "./categories";

const DESIGN_DIR_REL = "app/(design)/design";

function prettify(slug: string): string {
  return slug
    .split("/")
    .pop()!
    .replace(/-/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Walk the design dir and collect every folder that has a page file. */
async function collectSlugs(absDir: string, relPrefix = ""): Promise<string[]> {
  let dirents;
  try {
    dirents = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: string[] = [];
  const subdirs = dirents.filter(
    (e) =>
      e.isDirectory() &&
      !e.name.startsWith("_") &&
      !e.name.startsWith(".") &&
      !e.name.startsWith("("),
  );

  for (const dir of subdirs.sort((a, b) => a.name.localeCompare(b.name))) {
    const slug = relPrefix ? `${relPrefix}/${dir.name}` : dir.name;
    const childAbs = path.join(absDir, dir.name);
    const childEntries = await fs.readdir(childAbs);
    if (childEntries.some((f) => /^page\.(tsx|jsx|ts|js)$/.test(f))) {
      out.push(slug);
    }
    out.push(...(await collectSlugs(childAbs, slug)));
  }

  return out;
}

/** Attach category metadata to discovered slugs and order them group-first. */
function categorize(slugs: string[]): DesignEntry[] {
  const groupRank = (group: string) => {
    const i = DESIGN_GROUP_ORDER.indexOf(group);
    return i === -1 ? DESIGN_GROUP_ORDER.length : i;
  };

  return slugs
    .map((slug) => {
      const meta = designCategories[slug];
      return {
        slug,
        title: meta?.title ?? prettify(slug),
        group: meta?.group ?? DESIGN_FALLBACK_GROUP,
        subgroup: meta?.subgroup,
      } satisfies DesignEntry;
    })
    .sort((a, b) => {
      const g = groupRank(a.group) - groupRank(b.group);
      if (g !== 0) return g;
      const ga = a.group.localeCompare(b.group);
      if (ga !== 0) return ga;
      const ia = designOrderIndex[a.slug] ?? Number.MAX_SAFE_INTEGER;
      const ib = designOrderIndex[b.slug] ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.slug.localeCompare(b.slug);
    });
}

/**
 * Design scratchpad — pagine Next/React per iterare sui mockup
 * senza inquinare il sandbox dei componenti (`(dev)/dev/`).
 *
 * Regole d'oro:
 *  - No chiamate API, no servizi reali, no Supabase, no AI vera, no Google Maps reale.
 *  - useState locale + mock inline. È design, non funzionalità.
 *  - Riusa `components/ui/*` e `features/*` quando aiuta la coerenza visiva.
 *  - File singolo per sketch (tutto inline) → ottimizzato per modifiche frequenti.
 *
 * Gated come il sandbox: 404 in produzione salvo `NEXT_PUBLIC_DEV_SANDBOX=1`.
 */
export default async function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_DEV_SANDBOX !== "1"
  ) {
    notFound();
  }

  const slugs = await collectSlugs(path.join(process.cwd(), DESIGN_DIR_REL));
  const entries = categorize(slugs);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.21.0/dist/tabler-icons.min.css"
      />
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
      />
      <style>{`
        .design-pages, .design-pages * { font-family: "General Sans", ui-sans-serif, system-ui, -apple-system, sans-serif; font-feature-settings: "ss01", "cv11"; }
        .design-pages .ti { line-height: 1; vertical-align: -1px; }
      `}</style>
      <div className="design-pages">
        <DesignShell entries={entries}>{children}</DesignShell>
      </div>
    </>
  );
}
