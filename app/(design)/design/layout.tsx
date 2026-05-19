import { notFound } from "next/navigation";
import Link from "next/link";

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
export default function DesignLayout({
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
      <div className="design-pages min-h-screen bg-bg flex flex-col">
        <div className="sticky top-0 z-50 bg-bg/90 backdrop-blur-sm border-b border-border px-4 py-2 text-[11px] text-ink-faint flex items-center gap-2">
          <Link
            href="/design"
            className="hover:text-ink inline-flex items-center gap-1.5 transition-colors"
          >
            <i className="ti ti-arrow-left text-[12px]" />
            <span className="font-medium tracking-[0.12em] uppercase">Design</span>
          </Link>
          <span className="text-ink-faint">·</span>
          <span>scratchpad · non production · iteration-friendly</span>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}
