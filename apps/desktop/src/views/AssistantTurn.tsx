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

import { Fragment } from "react";

import { Markdown } from "../Markdown.js";
import { TEXT } from "../text.js";
import type { AssistantTurn as Turn, RunStreamState } from "../run-stream/model.js";
import { ThinkingBlock } from "./ThinkingBlock.js";

/** The model's initial, which is what the avatar shows. Also used by the
 *  persisted transcript, so a live answer and a stored one wear the same
 *  mark. */
export function markOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "◈";
}

/**
 * One answer body.
 *
 * Shared between the two ways an answer reaches the screen — reconstructed from
 * a run's events, or read back from the session's stored messages — because
 * they are the same thing to look at, and having one element for both is what
 * keeps them from drifting apart.
 */
export function AnswerBlock({
  content,
  truncated,
}: {
  content: string;
  truncated?: boolean;
}) {
  return (
    <div className="text">
      <Markdown>{content}</Markdown>
      {truncated ? (
        <div className="workspace-empty">{TEXT.conversation.truncatedBody}</div>
      ) : null}
    </div>
  );
}

/**
 * One model invoke attempt: its reasoning, then its answer.
 *
 * A run can hold several — the model is re-invoked after a tool call — and
 * each keeps its own body, because collapsing them into one would silently
 * drop everything the model said before the tool ran.
 */
function TurnBlock({
  live,
  modelName,
  turn,
}: {
  live: boolean;
  modelName?: string;
  turn: Turn;
}) {
  const lastIndex = turn.responses.length - 1;
  return (
    <div className="message assistant">
      <div aria-hidden="true" className="avatar-mini">
        {markOf(modelName ?? "")}
      </div>
      <div className="body">
        <div className="role">
          <span>
            {modelName ?? TEXT.appName} · {TEXT.conversation.turn(turn.turn)}
          </span>
        </div>
        <ThinkingBlock live={live && turn.responses.length === 0} text={turn.thinking} truncated={turn.thinkingTruncated} />
        {turn.responses.map((response, index) => {
          if (response.content.trim() === "") return null;
          return (
            <Fragment key={response.responseId ?? index}>
              <AnswerBlock content={response.content} truncated={response.truncated} />
              {live && index === lastIndex ? <span className="spinner" /> : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** The status band under a finished turn. It only appears when it has
 *  something to say, so a clean run leaves no residue. */
function RunStatusLine({ run }: { run: RunStreamState }) {
  const lines: string[] = [];
  if (run.droppedEvents > 0) lines.push(TEXT.conversation.droppedEvents(run.droppedEvents));
  if (run.unknownEvents > 0) lines.push(TEXT.conversation.unknownEvents(run.unknownEvents));
  if (run.error) {
    // The whole line comes from TEXT: the code's brackets and the colon are
    // punctuation of the language, not of the render.
    lines.push(
      run.error.code
        ? TEXT.conversation.errorWithCode(run.error.code, run.error.message)
        : TEXT.conversation.errorLine(run.error.message),
    );
  } else if (run.status === "cancelled") {
    lines.push(run.cancelledReason ?? TEXT.conversation.cancelled);
  } else if (run.status === "interrupted") {
    lines.push(TEXT.conversation.interrupted);
  } else if (run.terminal && run.status === undefined) {
    lines.push(TEXT.conversation.streamEnded);
  }
  if (lines.length === 0) return null;
  return (
    <div className="message assistant">
      <div aria-hidden="true" className="avatar-mini">
        !
      </div>
      <div className="body">
        {lines.map((line) => (
          <div className="status-strip" key={line}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The reconstructed run, rendered in place of the persisted assistant message.
 *
 * `finalContent` is the run's own completion payload. It is shown only when no
 * streamed body survives: a replayed run whose early deltas were dropped still
 * has the completion's answer, and showing both would print it twice.
 */
export function AssistantTurns({ run }: { run: RunStreamState }) {
  const streamedBody = run.turns.some((turn) =>
    turn.responses.some((response) => response.content.trim() !== ""),
  );
  const finalBody = run.finalContent?.trim() ? run.finalContent : undefined;
  const showFinal = finalBody !== undefined && !streamedBody;
  const live = !run.terminal;
  if (run.turns.length === 0 && !showFinal) {
    return live ? (
      <div className="message assistant">
        <div aria-hidden="true" className="avatar-mini">
          {markOf(run.modelName ?? "")}
        </div>
        <div className="body">
          <div className="role">
            <span>{run.modelName ?? TEXT.appName}</span>
          </div>
          <div className="text">
            <span className="spinner" />
          </div>
        </div>
      </div>
    ) : (
      <RunStatusLine run={run} />
    );
  }
  return (
    <>
      {run.turns.map((turn) => (
        <TurnBlock key={turn.turn} live={live} modelName={run.modelName} turn={turn} />
      ))}
      {showFinal ? (
        <div className="message assistant">
          <div aria-hidden="true" className="avatar-mini">
            {markOf(run.modelName ?? "")}
          </div>
          <div className="body">
            <div className="role">
              <span>{run.modelName ?? TEXT.appName}</span>
            </div>
            <div className="text">
              <Markdown>{finalBody}</Markdown>
            </div>
          </div>
        </div>
      ) : null}
      <RunStatusLine run={run} />
    </>
  );
}
