/**
 * app/(dev)/dev/briefs/[slug]/page.tsx
 *
 * Singolo brief renderizzato da Markdown.
 */

import Link            from 'next/link';
import { notFound }    from 'next/navigation';
import { getAllBriefs, getBrief } from '@/lib/briefs';
import '../briefs.css';

export async function generateStaticParams() {
  return getAllBriefs().map(b => ({ slug: b.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BriefPage({ params }: Props) {
  const { slug } = await params;
  const brief = getBrief(slug);
  if (!brief) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Back */}
      <Link
        href="/dev/briefs"
        className="inline-flex items-center gap-1.5 text-sm text-ink/40 hover:text-ink mb-6 transition-colors"
      >
        ← Brief
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">{brief.title}</h1>
        <p className="text-sm text-ink/50 mt-1">{brief.description}</p>
        <p className="text-xs text-ink/30 mt-2">{brief.date}</p>
      </div>

      {/* Contenuto MD renderizzato */}
      <div
        className="brief-content"
        dangerouslySetInnerHTML={{ __html: brief.html }}
      />

    </div>
  );
}
