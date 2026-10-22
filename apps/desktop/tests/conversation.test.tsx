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
// The test runner compiles JSX with the classic runtime, so React has to be in
// scope even though the app itself uses the automatic one.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ChatMessage, SessionDetail } from "../src/api/types.js";
import { emptyRunStream, type RunStreamState } from "../src/run-stream/model.js";
import { Conversation } from "../src/views/Conversation.js";

function message(id: string, role: ChatMessage["role"], content: string, kind?: ChatMessage["kind"]): ChatMessage {
  return { content, createdAt: "2026-01-01T00:00:00.000Z", id, kind, role };
}

/** A finished run: one turn that thought something, then answered. */
function answered(runId: string, thinking: string, answer: string): RunStreamState {
  return {
    ...emptyRunStream(),
    modelName: "m",
    runId,
    terminal: true,
    turns: [{
      responses: [{ content: answer, settled: true, truncated: false }],
      thinking,
      thinkingTruncated: false,
      turn: 1,
    }],
  };
}

function detail(messages: ChatMessage[]): SessionDetail {
  return { id: "session-1", messages } as never;
}

function render(over: Partial<Parameters<typeof Conversation>[0]> = {}): string {
  return renderToStaticMarkup(
    <Conversation
      detail={detail([])}
      loading={false}
      run={emptyRunStream()}
      {...over}
    />,
  );
}

/** The transcript of a session that took two turns: a question that was
 *  interrupted, and the automatic wake that carried on from it. */
const TWO_RUNS = [
  message("question-a", "user", "QUESTION-A"),
  message("answer-a", "assistant", "PLAIN-ANSWER-A"),
  message("wake", "user", "", "wake_notice"),
  message("answer-b", "assistant", "PLAIN-ANSWER-B"),
];

test("the reader's turn carries the default silhouette and keeps its text first", () => {
  const markup = render({ detail: detail([message("question-a", "user", "QUESTION-A")]) });
  // The letter that used to stand in for the reader is gone: the avatar is a
  // grey shape, so no initial should be printed inside it.
  assert.doesNotMatch(markup, />我</);
  assert.match(markup, /class="message user"/);
  assert.match(markup, /<svg aria-hidden="true" fill="currentColor"/);
  // The body comes before the avatar in the DOM, so the text a reader came for
  // is reached before the decoration even though the grid draws it on the left
  // of the avatar.
  const row = markup.slice(markup.indexOf('class="message user"'));
  assert.ok(row.indexOf("QUESTION-A") < row.indexOf("<svg"), "the avatar moved ahead of the text");
});

test("an automatic wake leaves no card of its own", () => {
  // A wake carries no user-authored body, so its card was a blank strip. The
  // run it started is the thing to read.
  const markup = render({ detail: detail(TWO_RUNS) });
  assert.doesNotMatch(markup, /唤醒/u);
  assert.match(markup, /PLAIN-ANSWER-A/);
  assert.match(markup, /PLAIN-ANSWER-B/);
});

test("a message just sent keeps the placeholder back for a beat", () => {
  // `pending` is set on the press and the run has no turns until the request
  // comes back. The line stands in for a run the server has not started, so it
  // waits a second instead of landing in the same frame as the press; the
  // message itself is shown at once. The timer is what static markup cannot
  // advance, so what is asserted here is the state before it fires.
  const markup = render({ pending: { content: "JUST-SENT" } });
  assert.match(markup, /JUST-SENT/);
  assert.doesNotMatch(markup, /正在思考/);
});

test("the run still streaming is the last thing in the transcript", () => {
  const live: RunStreamState = {
    ...emptyRunStream(),
    modelName: "m",
    runId: "run-live",
    turns: [{
      responses: [{ content: "LIVE-ANSWER", settled: false, truncated: false }],
      thinking: "LIVE-THOUGHT",
      thinkingTruncated: false,
      turn: 1,
    }],
  };
  const markup = render({ detail: detail(TWO_RUNS), run: live });
  assert.match(markup, /LIVE-THOUGHT/);
  assert.ok(markup.indexOf("PLAIN-ANSWER-B") < markup.indexOf("LIVE-ANSWER"));
});

test("a finished run's answer is drawn from its reconstructed turn", () => {
  // A session reopened mid-conversation still shows what the last turn did:
  // the events are the only account of it while the transcript is loading.
  const markup = render({ detail: detail([message("question-a", "user", "QUESTION-A")]), run: answered("run-a", "THOUGHT-A", "ANSWER-A") });
  assert.match(markup, /THOUGHT-A/);
  assert.match(markup, /ANSWER-A/);
});

test("an empty transcript keeps the welcome line", () => {
  assert.match(render(), /让科研发现更简单/);
});
