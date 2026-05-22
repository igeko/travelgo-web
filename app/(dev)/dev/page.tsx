import Link from "next/link";
import { getAllBriefs } from "@/lib/briefs";
import { sandboxRegistry } from "./registry";

/* ─── Sezioni principali ─────────────────────────────────────── */
const SECTIONS = [
  {
    href: "/dev/briefs",
    title: "Brief tecnici",
    description: "Documentazione architetturale — decisioni di design, setup, integrazioni.",
    icon: "📄",
  },
  {
    href: "/design/",
    title: "Design prototypes",
    description: "Prototipi HTML statici · design system, componenti, flow principali.",
    icon: "🎨",
    external: true,
  },
  {
    href: "/dev/api-docs",
    title: "API docs",
    description: "Specifica OpenAPI 3.0 dei route interni dell'app.",
    icon: "⚡",
  },
  {
    href: "/dev/costs",
    title: "Costi servizi",
    description: "Riepilogo costi Google Maps Platform e OpenAI usati dall'app.",
    icon: "💰",
  },
];

/* ─── Dashboard esterne ──────────────────────────────────────── */
const DASHBOARDS = [
  {
    href: "https://supabase.com/dashboard/project/nxyeelvvzserzlxzente",
    title: "Supabase",
    description: "Database, auth, storage, edge functions.",
    icon: "🗄️",
  },
  {
    href: "https://vercel.com/enrico-delgrecos-projects",
    title: "Vercel",
    description: "Deploy, preview, env vars, logs.",
    icon: "▲",
  },
  {
    href: "https://console.cloud.google.com/",
    title: "Google Cloud",
    description: "Maps Platform, API keys, billing, quote.",
    icon: "☁️",
  },
];

/* ─── Gruppi componenti dal registry ─────────────────────────── */
const GROUPS = ["Atoms", "Features", "Admin"] as const;

export default function DevIndex() {
  const briefs = getAllBriefs();
  const latestBriefs = briefs.slice(0, 3);

  const componentsByGroup = GROUPS.reduce<Record<string, typeof sandboxRegistry>>((acc, g) => {
    acc[g] = sandboxRegistry.filter((e) => e.group === g);
    return acc;
  }, {});

  return (
    <div className="px-10 py-12 max-w-5xl space-y-14">

      {/* ── Hero ── */}
      <div>
        <div className="text-[10px] font-medium tracking-[0.14em] uppercase text-orange mb-2">TravelGo</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Dev hub</h1>
        <p className="mt-2 text-ink-soft leading-relaxed max-w-prose">
          Punto di accesso unico per sviluppo, documentazione e prototipi.
        </p>
      </div>

      {/* ── Sezioni ── */}
      <section>
        <h2 className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-4">Sezioni</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              target={s.external ? "_blank" : undefined}
              rel={s.external ? "noopener noreferrer" : undefined}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-border-strong hover:shadow-sm transition-all no-underline"
            >
              <div className="text-2xl mb-3">{s.icon}</div>
              <div className="font-medium text-ink group-hover:text-orange transition-colors text-[15px]">
                {s.title}
                {s.external && (
                  <span className="text-ink-faint text-[11px] ml-1">↗</span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft leading-snug">{s.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Dashboard esterne ── */}
      <section>
        <h2 className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-4">Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DASHBOARDS.map((d) => (
            <a
              key={d.href}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border bg-surface p-5 hover:border-border-strong hover:shadow-sm transition-all no-underline flex items-start gap-4"
            >
              <span className="text-2xl shrink-0">{d.icon}</span>
              <div>
                <div className="font-medium text-ink group-hover:text-orange transition-colors text-[15px]">
                  {d.title} <span className="text-ink-faint text-[11px]">↗</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-soft leading-snug">{d.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Ultimi brief ── */}
      {latestBriefs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint">Brief recenti</h2>
            <Link href="/dev/briefs" className="text-[12px] text-ink-soft hover:text-ink transition-colors">
              Vedi tutti →
            </Link>
          </div>
          <ul className="space-y-2">
            {latestBriefs.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/dev/briefs/${b.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-border-strong transition-colors no-underline"
                >
                  <span className="text-[11px] font-mono text-ink-faint w-5 shrink-0">{b.slug.split("-")[0]}</span>
                  <span className="text-sm font-medium text-ink flex-1">{b.title}</span>
                  <span className="text-xs text-ink-faint">{b.date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Component sandbox ── */}
      <section>
        <h2 className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint mb-6">Component sandbox</h2>
        <div className="space-y-10">
          {GROUPS.map((group) => {
            const entries = componentsByGroup[group];
            if (!entries.length) return null;
            return (
              <div key={group}>
                <div className={`text-[10px] font-medium tracking-[0.12em] uppercase mb-3 ${group === "Features" || group === "Admin" ? "text-orange" : "text-ink-faint"}`}>
                  {group}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry) => (
                    <Link
                      key={entry.slug}
                      href={`/dev/${entry.slug}`}
                      className="group rounded-lg border border-border bg-surface p-4 hover:border-border-strong transition-colors no-underline"
                    >
                      {entry.subgroup && (
                        <div className="text-[9px] font-medium tracking-[0.10em] uppercase text-ink-faint mb-1">
                          {entry.subgroup}
                        </div>
                      )}
                      <div className="text-sm font-medium text-ink group-hover:text-orange transition-colors">
                        {entry.title}
                      </div>
                      {entry.description && (
                        <p className="mt-1 text-xs text-ink-soft leading-snug line-clamp-2">
                          {entry.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
