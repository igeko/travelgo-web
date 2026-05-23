/**
 * Section · shared chrome for a Yumeji catalog widget (title + subtitle + slot).
 */

import type { ReactNode } from "react";

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-9 first:mt-0">
      <div className="flex items-end justify-between gap-4 mb-3.5">
        <div className="min-w-0">
          <h2 className="text-[18px] font-medium text-ink leading-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-mini text-ink-soft leading-snug">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
