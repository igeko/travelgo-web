import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "../_components/Markdown";
import "../docs.css";

const DOCS_DIR_REL = "docs/design";

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Difesa: niente path traversal
  if (!/^[a-z0-9-]+$/i.test(slug)) notFound();

  const filePath = path.join(process.cwd(), DOCS_DIR_REL, `${slug}.md`);

  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-3 text-[12px]">
        <Link
          href="/dev/docs"
          className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors"
        >
          <i className="ti ti-arrow-left text-[14px]" />
          Tutti i doc
        </Link>
        <span className="text-ink-faint">
          <code className="bg-surface-soft px-1.5 py-0.5 rounded text-[11px]">
            {DOCS_DIR_REL}/{slug}.md
          </code>
        </span>
      </div>

      <Markdown content={content} />

      <div className="mt-12 pt-6 border-t border-border text-[11px] text-ink-faint flex items-center justify-between">
        <span>Renderer: marked via CDN</span>
        <Link href="/dev/docs" className="text-orange-deep hover:underline">
          ← Indice
        </Link>
      </div>
    </div>
  );
}
