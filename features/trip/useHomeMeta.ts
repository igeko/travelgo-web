"use client";

/**
 * useHomeMeta — one fetch of the Trip Home AI content (boarding + place)
 * for the whole home. Seeded with whatever the server already had cached;
 * fetches once on mount when a section is still missing. The single endpoint
 * fills every home widget, so widgets read from here instead of fetching.
 */

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { api } from "@/lib/client";
import type { HomeMeta } from "@/lib/trip-home/meta";

export function useHomeMeta(tripId: string, initial: HomeMeta): HomeMeta {
  const locale = useLocale();
  const [meta, setMeta] = useState<HomeMeta>(initial);

  useEffect(() => {
    if (initial.boarding && initial.place) return; // fully seeded by the server
    let active = true;
    api.trips
      .homeMeta(tripId, locale)
      .then((m) => { if (active) setMeta(m); })
      .catch(() => {/* keep what we have */});
    return () => { active = false; };
    // initial is captured at mount; locale changes arrive via a server refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, locale]);

  return meta;
}
