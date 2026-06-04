/**
 * test/validation.test.ts
 * normalizeSlot — funnels free-text slots to one the itinerary can render.
 * An out-of-set value like "lunch" used to persist but stay invisible (the
 * itinerary groups by morning/afternoon/evening/night, and "lunch" matched
 * neither a slot bucket nor the !slot "unslotted" bucket).
 */
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// validation.ts imports NextResponse from "next/server" at module scope; stub it
// so the module loads under the bare Node test runner (we only exercise pure fns).
mock.module("next/server", { exports: { NextResponse: class {} } });

const { normalizeSlot } = await import("@/lib/api/validation");

describe("normalizeSlot", () => {
  test("passes through the four canonical slots (case/space-insensitive)", () => {
    assert.equal(normalizeSlot("morning"), "morning");
    assert.equal(normalizeSlot("AFTERNOON"), "afternoon");
    assert.equal(normalizeSlot(" evening "), "evening");
    assert.equal(normalizeSlot("night"), "night");
  });

  test("maps common synonyms the AI produces", () => {
    assert.equal(normalizeSlot("lunch"), "afternoon");
    assert.equal(normalizeSlot("breakfast"), "morning");
    assert.equal(normalizeSlot("dinner"), "evening");
    assert.equal(normalizeSlot("midday"), "afternoon");
  });

  test("unknown or non-string → null (renders in the 'unslotted' bucket, never invisible)", () => {
    assert.equal(normalizeSlot("teatime"), null);
    assert.equal(normalizeSlot(""), null);
    assert.equal(normalizeSlot(undefined), null);
    assert.equal(normalizeSlot(42), null);
  });
});
