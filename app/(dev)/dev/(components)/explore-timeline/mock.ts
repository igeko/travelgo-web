/**
 * Sandbox mock for the Explore Timeline — a couple of representative days
 * with timed + fuzzy stops, so the organism (and the rail/time alignment)
 * can be verified without an authenticated trip snapshot.
 *
 * Shapes are partial and cast to the domain types: the Timeline only reads
 * a handful of fields, and this never leaves /dev.
 */

import type { Activity } from "@/lib/dal/domain";
import type { TimelineDayData } from "@/features/explore/Timeline";

function act(p: Partial<Activity>): Activity {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    position: p.position ?? 0,
    fuzzy: p.fuzzy ?? false,
    time: p.time ?? null,
    title: p.title ?? "Activity",
    icon: p.icon ?? null,
    short_desc: p.short_desc ?? null,
    ...p,
  } as unknown as Activity;
}

function day(p: Partial<TimelineDayData> & { activities: Activity[] }): TimelineDayData {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    day_number: p.day_number ?? 1,
    date: p.date ?? "2026-08-05",
    city: p.city ?? null,
    notes: p.notes ?? null,
    ...p,
  } as unknown as TimelineDayData;
}

export const MOCK_DAYS: TimelineDayData[] = [
  day({
    day_number: 1,
    date: "2026-08-05",
    city: "Tokyo",
    activities: [
      act({ id: "a1", position: 0, time: "08:30", title: "Haneda Airport Terminal 1-2", icon: "info" }),
      act({ id: "a2", position: 1, time: "10:00", title: "Hotel Tavinos Asakusa", icon: "rest" }),
      act({ id: "a3", position: 2, fuzzy: true, title: "Caffè Specialty", icon: "coffee" }),
      act({ id: "a4", position: 3, time: "12:30", title: "Ritiro Camper", icon: "car", short_desc: "Pickup del camper per il tour." }),
      act({ id: "a5", position: 4, time: "16:00", title: "Spesa Beisia Tomisato", icon: "market" }),
    ],
  }),
  day({
    day_number: 2,
    date: "2026-08-06",
    city: "Nikko",
    notes:
      "Partenza presto per evitare il traffico. Portare contanti: alcuni templi non accettano carte.",
    activities: [
      act({ id: "b1", position: 0, time: "09:15", title: "Nikko Daiyagawa Park Auto", icon: "car" }),
      act({ id: "b2", position: 1, time: "10:30", title: "Santuario Toshogu e Rinno-ji", icon: "monument", short_desc: "Complesso di santuari patrimonio UNESCO." }),
      act({ id: "b3", position: 2, time: "13:00", title: "Bosco di Cedri", icon: "park" }),
      act({ id: "b4", position: 3, time: "15:00", title: "Abisso di Kanmangafuchi", icon: "view" }),
      act({ id: "b5", position: 4, fuzzy: true, title: "Wanoshiro Onsen", icon: "swim" }),
    ],
  }),
];
