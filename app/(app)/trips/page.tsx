"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AppHeader } from "@/features/app/AppHeader";
import { CreateTripForm, type CreateTripData } from "@/features/trips/CreateTripForm";
import { IconPlus, IconX } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

type TripSummary = {
  id: string;
  title: string;
  subtitle: string | null;
  start_date: string | null;
  end_date: string | null;
  day_count: number;
};

function formatDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export default function TripsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Trips");
  const tCommon = useTranslations("Common");
  const tShell = useTranslations("TripShell");
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateSubmit(data: CreateTripData) {
    setCreating(true);
    try {
      const start = data.dates.start ? data.dates.start.toISOString().split("T")[0] : null;
      const end   = data.dates.end   ? data.dates.end.toISOString().split("T")[0]   : null;
      const title = data.destination?.name ?? data.destination?.formatted ?? "Nuovo viaggio";

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, start_date: start, end_date: end }),
      });
      const json = await res.json();
      if (res.ok) router.push(`/trips/${json.id}/overview`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader activeNav="trips" isLoggedIn />

      <main className="max-w-[1280px] mx-auto w-full px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[24px] font-semibold text-ink">{t("title")}</h1>
          <Button variant="solid" tone="neutral" iconOnly={false} onClick={() => setShowCreate(true)}>
            <IconPlus />
            {t("newTrip")}
          </Button>
        </div>

        {loading && (
          <div className="text-[13px] text-ink-faint">{tCommon("loading")}</div>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-[13px] text-ink-soft">
            {t("empty")}.{" "}
            <button onClick={() => setShowCreate(true)} className="text-orange underline underline-offset-2 cursor-pointer bg-transparent border-0 font-sans text-[13px]">
              {t("createOne")}
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="flex flex-col gap-1 px-5 py-4 rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-sm transition-all no-underline"
            >
              <span className="text-[16px] font-semibold text-ink">{trip.title}</span>
              {trip.subtitle && (
                <span className="text-[12px] text-ink-faint">{trip.subtitle}</span>
              )}
              <span className="text-[13px] text-ink-soft mt-0.5">
                {trip.day_count > 0 ? tShell("daysCount", { count: trip.day_count }) : tShell("empty.body")}
                {trip.start_date && trip.end_date
                  ? ` · ${formatDate(trip.start_date, locale)} – ${formatDate(trip.end_date, locale)}`
                  : ""}
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* Modal */}
      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("createTrip")}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(13,44,61,0.35)", backdropFilter: "blur(2px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowCreate(false); }}
        >
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[520px] relative">
            {/* Close button */}
            <div className="absolute top-4 right-4 z-10">
              <Button variant="ghost" size="md" iconOnly onClick={() => setShowCreate(false)} aria-label={tCommon("close")}>
                <IconX />
              </Button>
            </div>

            <div className="px-7 py-7">
              <CreateTripForm
                onCancel={() => setShowCreate(false)}
                onSubmit={creating ? undefined : handleCreateSubmit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
