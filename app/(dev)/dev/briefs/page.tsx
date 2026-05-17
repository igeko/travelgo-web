/**
 * app/(dev)/dev/briefs/page.tsx
 *
 * Lista di tutti i brief in content/briefs/.
 */

import Link         from 'next/link';
import { getAllBriefs } from '@/lib/briefs';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ready:    { label: 'Pronto',    cls: 'bg-emerald-50 text-emerald-700' },
  draft:    { label: 'Bozza',     cls: 'bg-amber-50 text-amber-700' },
  archived: { label: 'Archiviato',cls: 'bg-ink/5 text-ink/40' },
};

export default function BriefsPage() {
  const briefs = getAllBriefs();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-semibold text-ink">Brief tecnici</h1>
        <p className="text-sm text-ink/50 mt-1">
          Documentazione interna per il team di sviluppo.
        </p>
      </div>

      {briefs.length === 0 ? (
        <p className="text-sm text-ink/40">
          Nessun brief trovato in <code>content/briefs/</code>.
        </p>
      ) : (
        <ul className="space-y-3">
          {briefs.map((b) => {
            const badge = STATUS_LABEL[b.status] ?? STATUS_LABEL.draft;
            return (
              <li key={b.slug}>
                <Link
                  href={`/dev/briefs/${b.slug}`}
                  className="flex items-start gap-4 rounded-xl border border-ink/10 bg-white p-4 hover:border-ink/20 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-ink text-sm">{b.title}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-ink/50 truncate">{b.description}</p>
                  </div>
                  <span className="text-xs text-ink/30 whitespace-nowrap mt-0.5">{b.date}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-ink/30 pt-2">
        I file sorgente sono in <code>content/briefs/*.md</code>.
        Aggiungere un nuovo brief = creare un nuovo file <code>.md</code> con frontmatter.
      </p>

    </div>
  );
}
