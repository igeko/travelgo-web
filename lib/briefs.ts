/**
 * lib/briefs.ts
 *
 * Utility server-side per leggere i brief MD da content/briefs/.
 * Nessuna dipendenza esterna — parsing frontmatter e markdown inline.
 */

import fs   from 'fs';
import path from 'path';

// ── Tipi ────────────────────────────────────────────────────

export interface BriefMeta {
  slug:        string;
  title:       string;
  description: string;
  date:        string;
  status:      'ready' | 'draft' | 'archived';
}

export interface Brief extends BriefMeta {
  content: string;   // markdown raw
  html:    string;   // markdown convertito in HTML
}

// ── Path ────────────────────────────────────────────────────

const BRIEFS_DIR = path.join(process.cwd(), 'content', 'briefs');

// ── Frontmatter parser ───────────────────────────────────────

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  }
  return { meta, body: match[2] };
}

// ── Markdown → HTML (minimal, senza dipendenze) ──────────────

function mdToHtml(md: string): string {
  return md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="brief-code" data-lang="${lang}"><code>${escHtml(code.trimEnd())}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="brief-inline-code">$1</code>')
    // H1–H3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Tables (GFM)
    .replace(/(\|.+\|\n)(\|[-| :]+\|\n)((\|.+\|\n)*)/g, parseTable)
    // Unordered lists
    .replace(/((?:^- .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    })
    // Ordered lists
    .replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
      return `<ol>${items}</ol>`;
    })
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Paragraphs (righe non già wrappate)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Pulizia righe vuote multiple
    .replace(/\n{3,}/g, '\n\n');
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function parseTable(header: string, sep: string, body: string): string {
  const cols = header.trim().split('|').filter(Boolean).map(c => `<th>${c.trim()}</th>`).join('');
  const rows = body.trim().split('\n').filter(Boolean).map(row => {
    const cells = row.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table>`;
}

// ── API pubblica ─────────────────────────────────────────────

export function getAllBriefs(): BriefMeta[] {
  if (!fs.existsSync(BRIEFS_DIR)) return [];

  return fs
    .readdirSync(BRIEFS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const raw  = fs.readFileSync(path.join(BRIEFS_DIR, filename), 'utf-8');
      const { meta } = parseFrontmatter(raw);
      return {
        slug:        filename.replace(/\.md$/, ''),
        title:       meta.title       ?? filename,
        description: meta.description ?? '',
        date:        meta.date        ?? '',
        status:      (meta.status as BriefMeta['status']) ?? 'draft',
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getBrief(slug: string): Brief | null {
  const filePath = path.join(BRIEFS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw  = fs.readFileSync(filePath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);

  return {
    slug,
    title:       meta.title       ?? slug,
    description: meta.description ?? '',
    date:        meta.date        ?? '',
    status:      (meta.status as BriefMeta['status']) ?? 'draft',
    content:     body,
    html:        mdToHtml(body),
  };
}
