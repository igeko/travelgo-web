/**
 * test/loop.test.ts
 * Unit tests for runAgent — the agent loop that kept regressing:
 *  - plain text answer (no tools);
 *  - confirm-gated proposal with NO narration → a forced intro call fills the
 *    text, pendingActions are surfaced (this is what "stampa nulla" broke);
 *  - gated proposal that already has text → no extra call;
 *  - message ordering: [system, …history, ephemeral-context, user] so the
 *    cacheable prefix stays stable and Gemini's "function call must follow a
 *    user turn" rule holds;
 *  - a non-gated tool is executed and the loop continues.
 *
 * `chatTools` (the model) and `serverServices` (tool execution) are mocked.
 */
import { test, describe, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

/** Scripted model responses (FIFO) + captured payloads. */
let scripted = [];
let captured = [];

mock.module("@/lib/ai/llm", {
  exports: {
    chatTools: async (opts) => {
      // Snapshot the messages array: runAgent mutates the live convo after the
      // call (pushes the assistant turn), so a reference would change under us.
      captured.push({ ...opts, messages: [...opts.messages] });
      const next = scripted.shift() ?? { text: "", toolCalls: [] };
      return {
        text: next.text ?? "",
        toolCalls: next.toolCalls ?? [],
        provider: "test",
        model: "test-model",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      };
    },
  },
});

mock.module("@/lib/services", {
  exports: {
    serverServices: async () => ({
      trips: {
        getSnapshot: async () => ({
          trip: { title: "T", start_date: null, end_date: null },
          days: [{ day_number: 1, id: "d1", date: null, city: null, label: null, activities: [] }],
        }),
      },
    }),
  },
});

const { runAgent } = await import("@/app/api/go/agent/_loop");

const base = () => ({
  system: "SYS",
  history: [],
  userMessage: { role: "user", content: "hi" },
  ctx: { tripId: "trip1" },
});

beforeEach(() => {
  scripted = [];
  captured = [];
});

describe("runAgent", () => {
  test("plain text answer returns text with no pending actions", async () => {
    scripted = [{ text: "Ciao!", toolCalls: [] }];
    const res = await runAgent(base());
    assert.equal(res.text, "Ciao!");
    assert.equal(res.pendingActions.length, 0);
    assert.equal(res.iterations, 1);
  });

  test("gated proposal with no narration triggers a forced intro call", async () => {
    scripted = [
      { text: "", toolCalls: [{ id: "1", name: "addActivities", arguments: { items: [{ day: 1, title: "X", slot: "morning" }] } }] },
      { text: "Ecco la proposta:", toolCalls: [] },
    ];
    const res = await runAgent(base());
    assert.equal(res.pendingActions.length, 1);
    assert.equal(res.pendingActions[0].name, "addActivities");
    assert.equal(res.text, "Ecco la proposta:");
    assert.equal(res.iterations, 2);
    assert.equal(captured.length, 2);
  });

  test("gated proposal that already has text does NOT make a second call", async () => {
    scripted = [
      { text: "Aggiungo questo:", toolCalls: [{ id: "1", name: "addActivities", arguments: { items: [] } }] },
    ];
    const res = await runAgent(base());
    assert.equal(res.text, "Aggiungo questo:");
    assert.equal(res.pendingActions.length, 1);
    assert.equal(captured.length, 1);
  });

  test("payload order is [system, …history, context, user]", async () => {
    scripted = [{ text: "ok", toolCalls: [] }];
    await runAgent({
      system: "SYS",
      history: [
        { role: "user", content: "u0" },
        { role: "assistant", content: "a0" },
      ],
      userMessage: { role: "user", content: "now" },
      contextMessage: { role: "user", content: "CTX" },
      ctx: { tripId: "trip1" },
    });
    const msgs = captured[0].messages;
    assert.deepEqual(
      msgs.map((m) => [m.role, m.content]),
      [["system", "SYS"], ["user", "u0"], ["assistant", "a0"], ["user", "CTX"], ["user", "now"]],
    );
  });

  test("executes a non-gated tool, then continues to the final answer", async () => {
    scripted = [
      { text: "", toolCalls: [{ id: "1", name: "getTripState", arguments: {} }] },
      { text: "Hai 1 giorno.", toolCalls: [] },
    ];
    const res = await runAgent(base());
    assert.equal(res.steps.length, 1);
    assert.equal(res.steps[0].tool, "getTripState");
    assert.equal(res.text, "Hai 1 giorno.");
    assert.equal(res.pendingActions.length, 0);
    assert.equal(res.iterations, 2);
  });
});
