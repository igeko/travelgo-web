"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconSparkles, IconLoader2, IconRefresh, IconClock, IconChevronRight, IconWalk, IconX,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { RouteMap } from "@/components/ui/RouteMap";
import { api } from "@/lib/client";
import type { TransitOption, TransitSegment, RideSegment } from "@/lib/client/routes";
import type { BridgeData } from "@/lib/dal/domain";
import { TRANSPORT_ICON } from "./icons";

export type TransitEndpoint = {
  lat: number;
  lng: number;
  /** Human-readable label (place name) for the map markers and headings. */
  label?: string;
};

type Status = "idle" | "loading" | "error" | "ready";

function SegmentIcon({ segment }: { segment: TransitSegment }) {
  if (segment.kind === "walk") return <IconWalk size={12} />;
  return TRANSPORT_ICON[segment.transport] ?? <IconWalk size={12} />;
}

export function TransitVerifier({
  origin,
  destination,
  departureTime,
  showMap = false,
  onApply,
  onCancel,
}: {
  origin: TransitEndpoint;
  destination: TransitEndpoint;
  departureTime?: string;
  showMap?: boolean;
  onApply: (bridge: BridgeData) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("TransitVerifier");
  const tTransport = useTranslations("Timeline.transport");

  const [status, setStatus] = useState<Status>("idle");
  const [options, setOptions] = useState<TransitOption[]>([]);
  const [selected, setSelected] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** Compact one-line note for the BridgeData (rides only, e.g. "RER B · 12 fermate"). */
  function noteFor(option: TransitOption): string {
    return option.segments
      .filter((s): s is RideSegment => s.kind === "ride")
      .map((r) => {
        const label = [r.vehicleLabel, r.line].filter(Boolean).join(" ") || tTransport(r.transport);
        const stops = r.stopCount != null ? ` · ${t("stops", { count: r.stopCount })}` : "";
        return `${label}${stops}`;
      })
      .join(" → ");
  }

  function rideLabel(r: RideSegment): string {
    return [r.vehicleLabel, r.line].filter(Boolean).join(" ") || tTransport(r.transport);
  }

  async function verify() {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const { options: result } = await api.routes.transit(
        { lat: origin.lat, lng: origin.lng },
        { lat: destination.lat, lng: destination.lng },
        departureTime,
      );
      setOptions(result);
      setSelected(0);
      setStatus(result.length > 0 ? "ready" : "error");
      if (result.length === 0) setErrorMsg(t("noRoutes"));
    } catch {
      setStatus("error");
      setErrorMsg(t("error"));
    }
  }

  function apply() {
    const option = options[selected];
    if (!option) return;
    onApply({
      transport: option.transport,
      duration_min: option.durationMin,
      line: option.line,
      note: noteFor(option) || null,
      stops: null,
    });
  }

  return (
    <div className="rounded-md border border-primary-border bg-primary-soft/40 p-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-micro uppercase tracking-eyebrow text-primary-deep font-medium mb-2.5">
        <IconSparkles size={12} />
        <span>{t("title")}</span>
        {onCancel && (
          <button aria-label={t("close")} className="ml-auto text-ink-faint hover:text-ink transition-colors" onClick={onCancel}>
            <IconX size={13} />
          </button>
        )}
      </div>

      {/* Route summary */}
      <div className="flex items-center gap-1.5 text-mini text-ink-soft mb-3">
        <span className="truncate max-w-[40%]">{origin.label ?? t("origin")}</span>
        <IconChevronRight size={13} className="shrink-0 text-ink-faint" />
        <span className="truncate max-w-[40%]">{destination.label ?? t("destination")}</span>
      </div>

      {/* Idle — call to action */}
      {status === "idle" && (
        <Button size="sm" variant="solid" tone="neutral" onClick={verify}>
          <IconSparkles />
          {t("verify")}
        </Button>
      )}

      {/* Loading */}
      {status === "loading" && (
        <div className="flex items-center gap-2 text-mini text-ink-soft py-2">
          <IconLoader2 size={15} className="animate-spin" />
          {t("loading")}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-center gap-2">
          <p className="text-mini text-danger-fg">{errorMsg}</p>
          <Button size="sm" variant="ghost" tone="neutral" onClick={verify}>
            <IconRefresh />
            {t("retry")}
          </Button>
        </div>
      )}

      {/* Results */}
      {status === "ready" && (
        <>
          <ul className="flex flex-col gap-1.5 mb-3">
            {options.map((option, i) => {
              const isSelected = i === selected;
              return (
                <li key={i}>
                  <button
                    onClick={() => setSelected(i)}
                    className={cn(
                      "w-full text-left rounded-md border p-2.5 transition-colors",
                      isSelected ? "border-primary bg-white" : "border-border bg-surface-soft hover:border-primary/40",
                    )}
                  >
                    {/* Top row: total time + compact journey chips */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-mini font-medium text-ink shrink-0">
                        <IconClock size={12} />
                        {t("minutes", { count: option.durationMin })}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap ml-auto justify-end">
                        {option.segments.map((seg, k) => (
                          <span key={k} className="inline-flex items-center">
                            {k > 0 && <IconChevronRight size={10} className="text-ink-faint mx-0.5" />}
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 text-tiny",
                                seg.kind === "walk" ? "text-ink-faint" : "text-ink font-medium",
                              )}
                            >
                              <SegmentIcon segment={seg} />
                              {seg.kind === "walk"
                                ? t("minutes", { count: seg.durationMin })
                                : (seg.line ?? rideLabel(seg))}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Detailed itinerary — only for the selected option */}
                    {isSelected && (
                      <ol className="mt-2.5 flex flex-col gap-1.5 border-t border-border pt-2.5">
                        {option.segments.map((seg, k) => (
                          <li key={k} className="flex items-start gap-2 text-tiny">
                            <span className="mt-0.5 text-ink-soft shrink-0"><SegmentIcon segment={seg} /></span>
                            {seg.kind === "walk" ? (
                              <span className="text-ink-soft">{t("walkFor", { count: seg.durationMin })}</span>
                            ) : (
                              <span className="text-ink">
                                <span className="font-medium">{rideLabel(seg)}</span>
                                {seg.headsign && <span className="text-ink-soft"> · {seg.headsign}</span>}
                                <span className="block text-ink-faint">
                                  {[
                                    seg.departureTime,
                                    seg.departureStop && seg.arrivalStop ? `${seg.departureStop} → ${seg.arrivalStop}` : null,
                                    seg.stopCount != null ? t("stops", { count: seg.stopCount }) : null,
                                  ].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {showMap && options[selected] && (
            <div className="mb-3 overflow-hidden rounded-md border border-border">
              <RouteMap
                points={[
                  { formatted: origin.label ?? "", name: origin.label ?? "", placeId: "", lat: origin.lat, lng: origin.lng },
                  { formatted: destination.label ?? "", name: destination.label ?? "", placeId: "", lat: destination.lat, lng: destination.lng },
                ]}
                travelMode="TRANSIT"
                style={{ height: 180 }}
              />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" tone="neutral" onClick={verify}>
              <IconRefresh />
              {t("retry")}
            </Button>
            <Button size="sm" variant="solid" tone="neutral" className="ml-auto" onClick={apply}>
              {t("apply")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
