"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AppHeader } from "@/features/app/AppHeader";
import { CreateTripForm, type CreateTripData } from "@/features/trips/CreateTripForm";
import { IconPlus, IconX, IconTrash, IconSparkles } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import { PAGE_MAX, PAGE_PX } from "@/lib/layout";

type TripSummary = {
  id: string;
  title: string | null;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(trip: TripSummary) {
    const name = trip.title ?? "";
    if (!window.confirm(t("deleteConfirm", { name }))) return;
    setDeletingId(trip.id);
    try {
      await api.trips.remove(trip.id);
      setTrips((prev) => prev.filter((x) => x.id !== trip.id));
    } catch {
      // deletion failed — keep the trip in the list
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    api.trips.list()
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateSubmit(data: CreateTripData) {
    setCreating(true);
    try {
      const start = data.dates.start ? data.dates.start.toISOString().split("T")[0] : null;
      const end   = data.dates.end   ? data.dates.end.toISOString().split("T")[0]   : null;
      const title = data.destination?.name ?? data.destination?.formatted ?? "Nuovo viaggio";

      const { id } = await api.trips.create({ title, start_date: start, end_date: end });
      router.push(`/trips/${id}/overview`);
    } catch {
      // creation failed — stay on the page
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader activeNav="trips" isLoggedIn />

      <main className={cn("mx-auto w-full py-10", PAGE_MAX, PAGE_PX)}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[24px] font-semibold text-ink">{t("title")}</h1>
          <div className="flex items-center gap-2">
            <Button variant="solid" tone="neutral" iconOnly={false} onClick={() => setShowCreate(true)}>
              <IconPlus />
              {t("newTrip")}
            </Button>
            <Button variant="outline" tone="neutral" iconOnly={false} onClick={() => router.push("/trips/new")}>
              <IconSparkles />
              {t("createTrip")}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-meta text-ink-faint">{tCommon("loading")}</div>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-meta text-ink-soft">
            {t("empty")}.{" "}
            <button onClick={() => setShowCreate(true)} className="text-orange underline underline-offset-2 cursor-pointer bg-transparent border-0 font-sans text-meta">
              {t("createOne")}
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <div key={trip.id} className="relative group">
              <Link
                href={`/trips/${trip.id}`}
                className="flex flex-col gap-1 px-5 py-4 rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-sm transition-all no-underline"
              >
                <span className="text-[16px] font-semibold text-ink pr-16">{trip.title}</span>
                {trip.subtitle && (
                  <span className="text-mini text-ink-faint">{trip.subtitle}</span>
                )}
                <span className="text-meta text-ink-soft mt-0.5">
                  {trip.day_count > 0 ? tShell("daysCount", { count: trip.day_count }) : tShell("empty.body")}
                  {trip.start_date && trip.end_date
                    ? ` · ${formatDate(trip.start_date, locale)} – ${formatDate(trip.end_date, locale)}`
                    : ""}
                </span>
              </Link>
              <div className="absolute top-3 right-3 flex items-center gap-0.5">
                <Link
                  href={`/trips/new?draft=${trip.id}`}
                  aria-label={t("editWithGo")}
                  title={t("editWithGo")}
                  className="flex items-center justify-center size-7 rounded-md text-ink-faint opacity-60 hover:opacity-100 hover:bg-surface-soft hover:text-orange focus-visible:opacity-100 transition-colors no-underline"
                >
                  <IconSparkles size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(trip)}
                  disabled={deletingId === trip.id}
                  aria-label={t("deleteTrip")}
                  title={t("deleteTrip")}
                  className={cn(
                    "flex items-center justify-center size-7 rounded-md border-0 bg-transparent cursor-pointer transition-colors",
                    "text-ink-faint opacity-60 hover:opacity-100 hover:bg-danger-bg hover:text-danger-fg focus-visible:opacity-100",
                    deletingId === trip.id && "opacity-40 pointer-events-none",
                  )}
                >
                  <IconTrash size={16} />
                </button>
              </div>
            </div>
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
          <div className="bg-surface rounded-lg border border-border shadow-xl w-full max-w-[520px] relative">
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
