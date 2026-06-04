/**
 * test/tools.test.ts
 * Unit tests for the Go write tools — the field-routing logic that must stay
 * correct:
 *  - setItinerary: the zone (city) covers every day of a leg, but the focus
 *    note lands ONLY on the leg's first day (no bleed across days).
 *  - updateActivities: entity fields → YumeService, instance fields → Scheduler,
 *    and ids not in the trip snapshot are skipped (never trust a model id).
 *
 * `@/lib/services` is mocked so the heavy DAL/Supabase chain never loads.
 */
import { test, describe, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const calls = { updateDay: [], yumeUpdate: [], updateInstance: [], moveActivity: [], schedule: [] };
let snapshot = { trip: { title: "T" }, days: [] };
// Controllable geocoder: tests set this to simulate a Places hit or miss.
let geocode = async (_q) => null;

mock.module("@/lib/services", {
  exports: {
    serverServices: async () => ({
      trips: {
        getSnapshot: async () => snapshot,
        updateDay: async (id, patch) => { calls.updateDay.push({ id, patch }); },
        updateInstance: async (id, patch) => { calls.updateInstance.push({ id, patch }); },
        moveActivity: async (id, dayId, instance) => { calls.moveActivity.push({ id, dayId, instance }); },
        schedule: async (dayId, body) => { calls.schedule.push({ dayId, body }); },
      },
      yumes: { update: async (id, patch) => { calls.yumeUpdate.push({ id, patch }); } },
    }),
  },
});

mock.module("@/lib/maps/places", {
  exports: { searchEnrichedPlace: (q) => geocode(q) },
});

const { GO_TOOLS } = await import("@/app/api/go/agent/_tools");
const ctx = { tripId: "trip1" };

beforeEach(() => {
  calls.updateDay = [];
  calls.yumeUpdate = [];
  calls.updateInstance = [];
  calls.moveActivity = [];
  calls.schedule = [];
  geocode = async () => null;
});

describe("setItinerary", () => {
  test("writes the zone to every day but the focus only to the leg's first day", async () => {
    snapshot = {
      trip: { title: "T" },
      days: [
        { day_number: 1, id: "d1", activities: [] },
        { day_number: 2, id: "d2", activities: [] },
        { day_number: 3, id: "d3", activities: [] },
      ],
    };
    const res = await GO_TOOLS.setItinerary.run(
      { legs: [{ startDay: 1, endDay: 3, place: "Tromsø", focus: "Volo da Oslo" }] },
      ctx,
    );
    assert.equal(res.daysUpdated, 3);
    assert.deepEqual(calls.updateDay, [
      { id: "d1", patch: { city: "Tromsø", label: "Volo da Oslo" } },
      { id: "d2", patch: { city: "Tromsø", label: null } },
      { id: "d3", patch: { city: "Tromsø", label: null } },
    ]);
  });

  test("requires confirmation and summarizes the legs", () => {
    assert.equal(GO_TOOLS.setItinerary.requiresConfirm, true);
    const s = GO_TOOLS.setItinerary.summary({ legs: [{ startDay: 1, endDay: 2, place: "Oslo" }] });
    assert.match(s, /Oslo/);
  });
});

describe("updateActivities", () => {
  beforeEach(() => {
    snapshot = {
      trip: { title: "T" },
      days: [
        { day_number: 1, id: "day1", activities: [{ id: "inst1", activity_id: "ent1", position: 1 }] },
        { day_number: 2, id: "day2", activities: [{ id: "inst2", activity_id: "ent2", position: 3 }] },
      ],
    };
  });

  test("routes entity fields to YumeService and instance fields to Scheduler", async () => {
    const res = await GO_TOOLS.updateActivities.run(
      { items: [{ id: "inst1", title: "Nuovo", description: "perché", link: "https://x.io", time: "09:00", slot: "morning" }] },
      ctx,
    );
    assert.equal(res.updated, 1);
    assert.equal(calls.yumeUpdate.length, 1);
    assert.deepEqual(calls.yumeUpdate[0], {
      id: "ent1",
      patch: { title: "Nuovo", short_desc: "perché", url: "https://x.io" },
    });
    assert.deepEqual(calls.updateInstance[0], { id: "inst1", patch: { slot: "morning", time: "09:00" } });
  });

  test("throws (not a silent no-op) when no id matches — e.g. a hallucinated id", async () => {
    await assert.rejects(
      () => GO_TOOLS.updateActivities.run({ items: [{ id: "ghost", day: 6 }] }, ctx),
      /getTripState/,
    );
    assert.equal(calls.yumeUpdate.length, 0);
    assert.equal(calls.updateInstance.length, 0);
    assert.equal(calls.moveActivity.length, 0);
  });

  test("moves an activity to another day (day differs) via moveToDay, not updateInstance", async () => {
    const res = await GO_TOOLS.updateActivities.run(
      { items: [{ id: "inst1", day: 2, slot: "morning" }] },
      ctx,
    );
    assert.equal(res.updated, 1);
    assert.equal(calls.updateInstance.length, 0);
    assert.equal(calls.moveActivity.length, 1);
    // Target day's id, carries the slot, and appends after day 2's max position (3 → 4).
    assert.deepEqual(calls.moveActivity[0], {
      id: "inst1",
      dayId: "day2",
      instance: { slot: "morning", position: 4 },
    });
  });

  test("same-day slot change is a normal update, not a move", async () => {
    await GO_TOOLS.updateActivities.run(
      { items: [{ id: "inst1", day: 1, slot: "evening" }] },
      ctx,
    );
    assert.equal(calls.moveActivity.length, 0);
    assert.deepEqual(calls.updateInstance[0], { id: "inst1", patch: { slot: "evening" } });
  });
});

describe("addActivities", () => {
  beforeEach(() => {
    snapshot = {
      trip: { title: "T", destination: "Norvegia" },
      days: [{ day_number: 2, id: "day2", city: "Tromsø", activities: [] }],
    };
  });

  test("geocodes each activity and stores its coordinates so it lands on the map", async () => {
    geocode = async () => ({ placeId: "p1", name: "Tromsø Museum", address: "Tromsø, Norway", lat: 69.6, lng: 18.9, photoRefs: ["PHOTO_REF"] });
    const res = await GO_TOOLS.addActivities.run(
      { items: [{ day: 2, title: "Tromsø Museum", slot: "morning" }] },
      ctx,
    );
    assert.equal(res.added, 1);
    assert.equal(calls.schedule.length, 1);
    assert.equal(calls.schedule[0].dayId, "day2");
    assert.deepEqual(
      { lat: calls.schedule[0].body.location_lat, lng: calls.schedule[0].body.location_lng, pid: calls.schedule[0].body.location_place_id },
      { lat: 69.6, lng: 18.9, pid: "p1" },
    );
    assert.match(calls.schedule[0].body.hero_image, /ref=PHOTO_REF/);
  });

  test("still schedules the activity when no place is found (no coordinates)", async () => {
    geocode = async () => null;
    const res = await GO_TOOLS.addActivities.run(
      { items: [{ day: 2, title: "Passeggiata", slot: "afternoon" }] },
      ctx,
    );
    assert.equal(res.added, 1);
    assert.equal(calls.schedule[0].body.location_lat, undefined);
  });
});
