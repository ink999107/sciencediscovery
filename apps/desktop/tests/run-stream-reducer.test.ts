// Copyright (C) 2026-2026 Huawei Technologies Co., Ltd
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createTest } from "../../../test/support/tagged/compat.mjs";
const { test } = createTest(import.meta.url, { tags: ["category:ut", "os:linux", "arch:amd64", "arch:arm64"] });
import assert from "node:assert/strict";

import type { RunStreamEvent } from "../src/api/types.js";
import { closeRunStream, reduceRunStream } from "../src/run-stream/reducer.js";
import { emptyRunStream, hasVisibleAnswer, thinkingSteps, type RunStreamState } from "../src/run-stream/model.js";

/** Fold a script of events, which is what both a live stream and a replay are. */
function fold(events: RunStreamEvent[], start: RunStreamState = emptyRunStream()): RunStreamState {
  return events.reduce((state, event) => reduceRunStream(state, event), start);
}

function responseStarted(responseId: string, turn = 1): RunStreamEvent {
  return { responseId, turn, type: "assistant.response.started" };
}

function delta(text: string, responseId?: string): RunStreamEvent {
  return responseId === undefined
    ? ({ delta: text, type: "assistant.delta" } as RunStreamEvent)
    : ({ delta: text, responseId, type: "assistant.delta" } as RunStreamEvent);
}

test("deltas accumulate into a response's body", () => {
  const state = fold([responseStarted("r1"), delta("Hello", "r1"), delta(", world", "r1")]);
  assert.equal(state.turns.length, 1);
  assert.equal(state.turns[0]!.responses[0]!.content, "Hello, world");
  assert.equal(state.turns[0]!.responses[0]!.settled, false);
});

test("thinking goes to the turn, never to a response body", () => {
  const state = fold([
    responseStarted("r1"),
    { delta: "first thought", turn: 1, type: "assistant.thinking.delta" } as RunStreamEvent,
    delta("answer", "r1"),
  ]);
  assert.equal(state.turns[0]!.thinking, "first thought");
  assert.equal(state.turns[0]!.responses[0]!.content, "answer");
  // The two streams must not bleed into each other: thinking shown as the
  // answer is the worst possible rendering bug here.
  assert.equal(hasVisibleAnswer(state), true);
});

test("a snapshot replaces the body", () => {
  const state = fold([
    responseStarted("r1"),
    delta("partial", "r1"),
    { content: "a complete replacement", responseId: "r1", type: "assistant.snapshot" } as RunStreamEvent,
  ]);
  assert.equal(state.turns[0]!.responses[0]!.content, "a complete replacement");
});

test("a truncated snapshot never shortens what is already rendered", () => {
  // The server uses a truncated snapshot to describe part of a long answer.
  // Letting it win would make text the user already read disappear.
  const state = fold([
    responseStarted("r1"),
    delta("the whole first paragraph", "r1"),
    {
      content: "the first",
      responseId: "r1",
      truncated: true,
      type: "assistant.snapshot",
    } as RunStreamEvent,
  ]);
  assert.equal(state.turns[0]!.responses[0]!.content, "the whole first paragraph");
  // Recorded, so the UI can say the text shown is not all of it.
  assert.equal(state.turns[0]!.responses[0]!.truncated, true);
});

test("a longer truncated snapshot still wins", () => {
  const state = fold([
    responseStarted("r1"),
    delta("short", "r1"),
    { content: "short plus more", responseId: "r1", truncated: true, type: "assistant.snapshot" } as RunStreamEvent,
  ]);
  assert.equal(state.turns[0]!.responses[0]!.content, "short plus more");
});

test("a truncated thinking snapshot does not shorten the thinking either", () => {
  const state = fold([
    { content: "a long stretch of reasoning", truncated: true, turn: 1, type: "assistant.thinking.snapshot" } as RunStreamEvent,
    { content: "a long", truncated: true, turn: 1, type: "assistant.thinking.snapshot" } as RunStreamEvent,
  ]);
  assert.equal(state.turns[0]!.thinking, "a long stretch of reasoning");
  assert.equal(state.turns[0]!.thinkingTruncated, true);
});

test("a second response in one turn is a separate block", () => {
  const state = fold([
    responseStarted("r1"),
    delta("before the tool call", "r1"),
    { responseId: "r1", type: "assistant.response.settled" } as RunStreamEvent,
    responseStarted("r2"),
    delta("after the tool call", "r2"),
  ]);
  const responses = state.turns[0]!.responses;
  assert.equal(responses.length, 2);
  assert.equal(responses[0]!.content, "before the tool call");
  assert.equal(responses[0]!.settled, true);
  assert.equal(responses[1]!.content, "after the tool call");
  assert.equal(responses[1]!.settled, false);
});

test("text arriving before its response.started opens a block instead of vanishing", () => {
  const state = fold([delta("orphan text")]);
  assert.equal(state.turns[0]!.responses[0]!.content, "orphan text");
});

test("the persisted answer outranks the assembled deltas", () => {
  const state = fold([
    responseStarted("r1"),
    delta("partial", "r1"),
    {
      files: [],
      message: { content: "the answer of record" },
      type: "run.completed",
    } as unknown as RunStreamEvent,
  ]);
  assert.equal(state.finalContent, "the answer of record");
  assert.equal(state.status, "completed");
  // The streamed block is sealed: nothing more is coming for it.
  assert.equal(state.turns[0]!.responses[0]!.settled, true);
});

test("run.started names the model and supplies the run id", () => {
  const state = fold([
    { model: { id: "m", name: "gpt-4o-mini" }, runId: "run-1", type: "run.started" } as RunStreamEvent,
  ]);
  assert.equal(state.modelName, "gpt-4o-mini");
  assert.equal(state.runId, "run-1");
  assert.equal(state.status, "running");
});

test("run.queued is where the run id first appears, since the POST returns none", () => {
  const state = fold([
    { run: { id: "run-9", status: "queued" }, type: "run.queued" } as RunStreamEvent,
  ]);
  assert.equal(state.runId, "run-9");
  assert.equal(state.status, "queued");
});

test("only a terminal status marks the run terminal", () => {
  const running = fold([{ status: "running", type: "run.status" } as RunStreamEvent]);
  assert.equal(running.terminal, false);
  for (const status of ["cancelled", "completed", "failed", "interrupted"] as const) {
    const state = fold([{ status, type: "run.status" } as RunStreamEvent]);
    assert.equal(state.terminal, true, `${status} must be terminal`);
  }
  // blocked is waiting on the user, not finished.
  assert.equal(fold([{ status: "blocked", type: "run.status" } as RunStreamEvent]).terminal, false);
});

test("terminality is sticky: a later non-terminal status cannot reopen a run", () => {
  const state = fold([
    { status: "cancelled", type: "run.status" } as RunStreamEvent,
    { status: "running", type: "run.status" } as RunStreamEvent,
  ]);
  assert.equal(state.terminal, true);
});

test("closing the stream seals open responses and marks the run terminal", () => {
  const state = closeRunStream(fold([responseStarted("r1"), delta("cut off", "r1")]));
  assert.equal(state.terminal, true);
  assert.equal(state.turns[0]!.responses[0]!.settled, true);
});

test("truncated history and unknown events are counted, not swallowed", () => {
  const state = fold([
    { droppedEvents: 4, type: "run.history.truncated" } as RunStreamEvent,
    { droppedEvents: 2, type: "run.history.truncated" } as RunStreamEvent,
    { type: "something.this.build.has.never.seen" } as RunStreamEvent,
  ]);
  assert.equal(state.droppedEvents, 6);
  assert.equal(state.unknownEvents, 1);
});

test("deferred event types do not count as unknown", () => {
  // Artifacts and the session title are a phase-two surface, not a surprise:
  // counting them would make the "N events this build cannot draw" note
  // permanently wrong.
  const state = fold([
    { type: "artifact.upserted" } as RunStreamEvent,
    { type: "session.updated" } as RunStreamEvent,
  ]);
  assert.equal(state.unknownEvents, 0);
});

test("failure and cancellation both keep their reason", () => {
  const failed = fold([
    { error: "provider refused", errorCode: "provider_error", type: "run.failed" } as RunStreamEvent,
  ]);
  assert.equal(failed.error?.message, "provider refused");
  assert.equal(failed.error?.code, "provider_error");

  const cancelled = fold([{ reason: "用户取消", type: "run.cancelled" } as RunStreamEvent]);
  assert.equal(cancelled.cancelledReason, "用户取消");
});

test("the replay cursor only ever moves forward", () => {
  const forward = reduceRunStream(emptyRunStream(), { type: "run.status", status: "running" } as RunStreamEvent, 5);
  assert.equal(forward.lastSequence, 5);
  const backward = reduceRunStream(forward, { type: "run.status", status: "running" } as RunStreamEvent, 3);
  // A reconnect that replays from an older cursor must not send `?after=3` next.
  assert.equal(backward.lastSequence, 5);
});

test("hasVisibleAnswer separates a real answer from thinking alone", () => {
  const thinkingOnly = fold([
    { content: "weighing options", turn: 1, type: "assistant.thinking.snapshot" } as RunStreamEvent,
  ]);
  // Hiding the persisted message for a run that only thought would leave the
  // turn blank, so thinking must not count as an answer.
  assert.equal(hasVisibleAnswer(thinkingOnly), false);
  assert.equal(hasVisibleAnswer(fold([delta("an answer")])), true);
  assert.equal(
    hasVisibleAnswer({ ...emptyRunStream(), finalContent: "persisted" }),
    true,
  );
});

test("thinking paragraphs split into steps on a blank line only", () => {
  assert.deepEqual(thinkingSteps("one\ncontinues\n\n two \n\n\nthree"), [
    "one\ncontinues",
    "two",
    "three",
  ]);
  assert.deepEqual(thinkingSteps("   "), []);
});
