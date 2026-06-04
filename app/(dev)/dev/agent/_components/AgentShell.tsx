"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { GoAvatar } from "@/features/ai-suggest/GoAvatar";
import { agentRegistry } from "../registry";

/* ─────────────────────────────────────────────────────────────────
   GoAgent shell · its own left sidebar, separate from the component
   sandbox. Pages own their main area (and any internal panels).
───────────────────────────────────────────────────────────────── */

export function AgentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-bg text-ink">
      {/* LEFT SIDEBAR · agent navigation */}
      <aside className="w-60 shrink-0 border-r border-border bg-surface sticky top-0 h-screen flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/dev/agent" className="flex items-center gap-2.5 no-underline">
            <GoAvatar size="sm" pulse={false} />
            <div>
              <div className="text-sm font-medium tracking-tight text-ink">
                Go Agent <span className="text-ink-faint">· sandbox</span>
              </div>
              <p className="mt-0.5 text-[11px] text-ink-faint">Loop, tools &amp; flussi</p>
            </div>
          </Link>
        </div>

        {/* Back to the component sandbox */}
        <Link
          href="/dev"
          className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors no-underline"
        >
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-ink-faint"
          >
            <path d="M15 6l-6 6l6 6" />
          </svg>
          <span className="flex-1">Component sandbox</span>
        </Link>

        <nav className="px-3 py-4 flex flex-col">
          <div className="px-2 pb-2 text-micro font-medium tracking-eyebrow-wide uppercase text-orange">
            GoAgent
          </div>
          <ul className="flex flex-col">
            {agentRegistry.map((entry) => {
              const href = `/dev/agent/${entry.slug}`;
              return (
                <li key={entry.slug}>
                  <NavLink href={href} active={pathname === href}>
                    {entry.title}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Static flow schema (design scratchpad, opens in a new tab) */}
          <a
            href="/design/go-flow.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-soft hover:bg-surface-soft hover:text-ink transition-colors no-underline"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-ink-faint"
            >
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
            <span className="flex-1">Schema del giro</span>
            <span className="text-ink-faint text-tiny">↗</span>
          </a>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-2 py-1.5 text-sm transition-colors no-underline",
        active
          ? "bg-surface-soft text-ink font-medium"
          : "text-ink-soft hover:bg-surface-soft hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
