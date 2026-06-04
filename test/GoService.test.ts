/**
 * test/GoService.test.ts
 * Unit tests for the Go conversation persistence/replay logic — the exact
 * areas that kept regressing:
 *  - historyAsLlm: the replayed window must start at a `user` turn (a leading
 *    assistant/tool turn breaks Gemini "function call must follow a user turn"
 *    and OpenAI orphan-tool), and legacy "✓ Modifica applicata" notes are dropped.
 *  - displayTurns: tool turns / empty turns / legacy notes hidden; pending
 *    proposals surfaced (so the widgets rehydrate on reload).
 *  - persistTurn: system turns dropped; pendingActions attached to the turn's
 *    LAST assistant message (the proposal) and nowhere else.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GoService } from "@/lib/services/GoService";

/** Build a go_messages row with sane defaults. */
function row(partial) {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    session_id: "sess1",
    trip_id: "trip1",
    role: partial.role,
    content: partial.content ?? "",
    tool_calls: partial.tool_calls ?? null,
    tool_call_id: partial.tool_call_id ?? null,
    name: partial.name ?? null,
    pending_actions: partial.pending_actions ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
  };
}

/** A fake Dal exposing only `go`, with the methods GoService touches. */
function makeDal(rows = []) {
  const inserted = [];
  const updated = [];
  const dal = {
    go: {
      async listMessages() {
        return { data: rows, error: null };
      },
      async insertMessages(rs) {
        inserted.push(...rs);
        return { data: true, error: null };
      },
      async updateSession(id, patch) {
        updated.push({ id, patch });
        return { data: true, error: null };
      },
    },
  };
  return { dal, inserted, updated };
}

function service(rows) {
  const { dal, inserted, updated } = makeDal(rows);
  return { svc: new GoService(dal), inserted, updated };
}

describe("historyAsLlm", () => {
  test("drops a leading assistant turn so the window starts at a user turn", async () => {
    const { svc } = service([
      row({ role: "assistant", content: "a1" }),
      row({ role: "user", content: "u1" }),
      row({ role: "assistant", content: "a2" }),
    ]);
    const out = await svc.historyAsLlm("s");
    assert.deepEqual(out.map((m) => m.role), ["user", "assistant"]);
    assert.equal(out[0].content, "u1");
  });

  test("drops a leading orphan tool turn", async () => {
    const { svc } = service([
      row({ role: "tool", content: "{}", name: "getTripState", tool_call_id: "x" }),
      row({ role: "user", content: "u" }),
    ]);
    const out = await svc.historyAsLlm("s");
    assert.deepEqual(out.map((m) => m.role), ["user"]);
  });

  test("leaves a window that already starts with a user turn untouched", async () => {
    const { svc } = service([
      row({ role: "user", content: "u" }),
      row({ role: "assistant", content: "a" }),
    ]);
    const out = await svc.historyAsLlm("s");
    assert.equal(out.length, 2);
    assert.equal(out[0].role, "user");
  });

  test("filters out legacy '✓ Modifica applicata' notes", async () => {
    const { svc } = service([
      row({ role: "user", content: "u" }),
      row({ role: "assistant", content: "✓ Modifica applicata (confermata dall'utente): Tappe…" }),
      row({ role: "assistant", content: "real reply" }),
    ]);
    const out = await svc.historyAsLlm("s");
    assert.deepEqual(out.map((m) => m.content), ["u", "real reply"]);
  });

  test("rebuilds assistant tool calls from the stored row", async () => {
    const calls = [{ id: "c1", name: "getTripState", arguments: {} }];
    const { svc } = service([
      row({ role: "user", content: "u" }),
      row({ role: "assistant", content: "", tool_calls: calls }),
      row({ role: "tool", content: "{}", name: "getTripState", tool_call_id: "c1" }),
    ]);
    const out = await svc.historyAsLlm("s");
    assert.deepEqual(out[1].toolCalls, calls);
    assert.equal(out[2].role, "tool");
    assert.equal(out[2].toolCallId, "c1");
  });

  test("repairs a scrambled confirm pair: keeps the valid one, drops the orphan/dangling", async () => {
    // Two confirm pairs read back out of order (same-timestamp insert): the
    // first pair is intact, the second is inverted (tool before its assistant).
    const { svc } = service([
      row({ role: "user", content: "u" }),
      row({ role: "assistant", content: "", tool_calls: [{ id: "a", name: "setItinerary", arguments: {} }] }),
      row({ role: "tool", content: "{}", name: "setItinerary", tool_call_id: "a" }),
      row({ role: "tool", content: "{}", name: "addActivities", tool_call_id: "b" }), // orphan
      row({ role: "assistant", content: "", tool_calls: [{ id: "b", name: "addActivities", arguments: {} }] }), // dangling
    ]);
    const out = await svc.historyAsLlm("s");
    assert.deepEqual(out.map((m) => m.role), ["user", "assistant", "tool"]);
    assert.equal(out[2].toolCallId, "a");
  });
});

describe("displayTurns", () => {
  test("keeps user/assistant text, hides tool/empty/legacy turns", async () => {
    const { svc } = service([
      row({ role: "user", content: "u1" }),
      row({ role: "assistant", content: "a1" }),
      row({ role: "tool", content: "{}", name: "t", tool_call_id: "x" }),
      row({ role: "assistant", content: "   " }),
      row({ role: "assistant", content: "✓ Modifica applicata: x" }),
    ]);
    const out = await svc.displayTurns("s");
    assert.deepEqual(out, [
      { role: "user", content: "u1", pending: undefined },
      { role: "assistant", content: "a1", pending: undefined },
    ]);
  });

  test("surfaces pending proposals, including on an empty-content turn", async () => {
    const pending = [{ name: "addActivities", arguments: { items: [] }, summary: "s" }];
    const { svc } = service([
      row({ role: "assistant", content: "Ecco la proposta:", pending_actions: pending }),
      row({ role: "assistant", content: "", pending_actions: pending }),
    ]);
    const out = await svc.displayTurns("s");
    assert.equal(out.length, 2);
    assert.deepEqual(out[0].pending, pending);
    assert.deepEqual(out[1].pending, pending);
  });
});

describe("persistTurn", () => {
  const session = { id: "sess1", trip_id: "trip1" };

  test("attaches pendingActions to the turn's last assistant message only", async () => {
    const { svc, inserted, updated } = service();
    const pending = [{ name: "addActivities", arguments: { items: [{ day: 2, title: "X" }] }, summary: "s" }];
    await svc.persistTurn(session, [
      { role: "user", content: "u" },
      { role: "assistant", content: "proposal" },
    ], { pendingActions: pending });

    assert.equal(inserted.length, 2);
    assert.equal(inserted[0].role, "user");
    assert.equal(inserted[0].pending_actions ?? null, null);
    assert.equal(inserted[1].role, "assistant");
    assert.deepEqual(inserted[1].pending_actions, pending);
    assert.equal(updated.length, 1);
  });

  test("never persists a system turn", async () => {
    const { svc, inserted } = service();
    await svc.persistTurn(session, [
      { role: "system", content: "sys" },
      { role: "user", content: "u" },
    ]);
    assert.deepEqual(inserted.map((r) => r.role), ["user"]);
  });

  test("no pendingActions → nothing tagged", async () => {
    const { svc, inserted } = service();
    await svc.persistTurn(session, [{ role: "assistant", content: "hi" }]);
    assert.equal(inserted[0].pending_actions ?? null, null);
  });
});
