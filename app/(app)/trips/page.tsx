import Link from "next/link";
import { AppHeaderServer } from "@/features/app/AppHeaderServer";

export default function TripsPage() {
  return (
    <>
      <AppHeaderServer activeNav="trips" />
      <main className="max-w-[1280px] mx-auto px-5 py-10">
        <h1 className="text-[24px] font-semibold text-ink mb-6">My trips</h1>

        <Link
          href="/trips/47c851d1-ee78-4a85-99d0-431fb7c0bf8a"
          className="inline-flex flex-col gap-1 px-5 py-4 rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-sm transition-all no-underline"
        >
          <span className="text-[16px] font-semibold text-ink">Japan 2026! 🇯🇵</span>
          <span className="text-[13px] text-ink-soft">21 giorni · 31 lug – 20 ago 2026</span>
        </Link>
      </main>
    </>
  );
}
