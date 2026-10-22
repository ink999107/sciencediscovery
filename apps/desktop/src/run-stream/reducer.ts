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

import type { RunStreamEvent } from "../api/types.js";
import { TEXT } from "../text.js";
import {
  type AssistantResponse,
  type AssistantTurn,
  type RunStreamState,
  isTerminalRunStatus,
  mergeText,
  turnFor,
} from "./model.js";

/**
 * Event types this version knows about and deliberately does not render yet.
 *
 * They stay out of the unknown-event counter so that "N events this build
 * cannot draw" means an actual surprise rather than a phase-two backlog.
 * Everything here is a tool, permission, artifact, plan or orchestration
 * surface with no placeholder in the current design.
 */
const DEFERRED_EVENT_TYPES: ReadonlySet<string> = new Set([
  "agent.phase",
  "agent.record",
  "artifact.upserted",
  "artifact_review.completed",
  "evolve_run.created",
  "idea_research.created",
  "idea_tree.phase",
  "permission.required",
  "permission.resolved",
  "plan.updated",
  "remote_job.proposed",
  "reviewer_checkpoint.updated",
  "session.approval_mode.changed",
  "session.updated", // the sidebar owns the title, not the transcript
  "subagent.step",
  "subagent.updated",
  "subagent.usage",
  "tool.completed",
  "tool.output",
  "tool.started",
  "workspace.changed",
]);

/**
 * Fold one stream event into the live transcript.
 *
 * Pure and incremental on purpose: the same function rebuilds a finished run
 * from `?after=0`, folds a live `POST /messages` response and extends a
 * reconnect, so there is exactly one interpretation of the stream.
 */
export function reduceRunStream(
  state: RunStreamState,
  event: RunStreamEvent,
  sequence?: number,
): RunStreamState {
  const advanced = sequence === undefined
    ? state
    : { ...state, lastSequence: Math.max(state.lastSequence ?? 0, sequence) };

  switch (event.type) {
    case "run.queued":
      // The earliest place a run id is visible at all: the POST that starts
      // the run does not return one.
      return { ...advanced, runId: event.run.id, status: event.run.status };

    case "run.started":
      return { ...advanced, modelName: event.model.name, runId: event.runId, status: "running" };

    case "assistant.response.started":
      return withTurn(advanced, event.turn, (turn) =>
        turn.responses.some((response) => response.responseId === event.responseId)
          ? turn
          : { ...turn, responses: [...turn.responses, blankResponse(event.responseId)] });

    case "assistant.delta":
      return withResponse(advanced, event.responseId, (response) => ({
        ...response,
        content: response.content + event.delta,
      }));

    case "assistant.snapshot": {
      const truncated = event.truncated === true;
      return withResponse(advanced, event.responseId, (response) => ({
        ...response,
        content: mergeText(response.content, event.content, truncated),
        truncated: response.truncated || truncated,
      }));
    }

    case "assistant.thinking.delta":
      return withTurn(advanced, event.turn, (turn) => ({
        ...turn,
        thinking: turn.thinking + event.delta,
      }));

    case "assistant.thinking.snapshot": {
      const truncated = event.truncated === true;
      return withTurn(advanced, event.turn, (turn) => ({
        ...turn,
        thinking: mergeText(turn.thinking, event.content, truncated),
        thinkingTruncated: turn.thinkingTruncated || truncated,
      }));
    }

    case "assistant.response.settled":
      return withResponse(advanced, event.responseId, (response) => ({ ...response, settled: true }));

    case "run.status":
      return {
        ...advanced,
        status: event.status,
        terminal: advanced.terminal || isTerminalRunStatus(event.status),
      };

    case "run.completed":
      // The persisted message, not the assembled deltas, is the answer of
      // record: a truncated snapshot may have left the buffer short.
      return {
        ...advanced,
        finalContent: event.message.content,
        status: "completed",
        turns: sealOpenResponses(advanced.turns),
      };

    case "run.failed":
      return { ...advanced, error: { code: event.errorCode, message: event.error } };

    case "run.cancelled":
      // This type appears twice in the union with different payloads; both
      // carry `reason`, and only one carries a run id.
      return { ...advanced, cancelledReason: event.reason ?? TEXT.conversation.cancelledReason };

    case "run.history.truncated":
      return { ...advanced, droppedEvents: advanced.droppedEvents + event.droppedEvents };

    default:
      return DEFERRED_EVENT_TYPES.has(event.type)
        ? advanced
        : { ...advanced, unknownEvents: advanced.unknownEvents + 1 };
  }
}

/** The stream ended. Anything still open was cut off rather than settled. */
export function closeRunStream(state: RunStreamState): RunStreamState {
  return { ...state, terminal: true, turns: sealOpenResponses(state.turns) };
}

function blankResponse(responseId?: string): AssistantResponse {
  return responseId === undefined
    ? { content: "", settled: false, truncated: false }
    : { content: "", responseId, settled: false, truncated: false };
}

function replaceTurn(turns: AssistantTurn[], turn: number, next: AssistantTurn): AssistantTurn[] {
  const index = turns.findIndex((candidate) => candidate.turn === turn);
  if (index < 0) return [...turns, next].sort((left, right) => left.turn - right.turn);
  return turns.map((candidate, position) => (position === index ? next : candidate));
}

function withTurn(
  state: RunStreamState,
  turn: number,
  update: (current: AssistantTurn) => AssistantTurn,
): RunStreamState {
  const current = turnFor(state, turn);
  const next = update(current);
  return next === current ? state : { ...state, turns: replaceTurn(state.turns, turn, next) };
}

/**
 * Route a text frame to its response.
 *
 * `responseId` is the reliable key and is preferred. Older records omit it, so
 * an unidentified frame lands on the newest response of the newest turn — the
 * place it would have landed had the identity existed. A frame that arrives
 * before its `assistant.response.started`, or with no open response at all,
 * opens a block rather than dropping the text.
 */
function withResponse(
  state: RunStreamState,
  responseId: string | undefined,
  update: (current: AssistantResponse) => AssistantResponse,
): RunStreamState {
  const turn = locateTurn(state, responseId);
  if (!turn) {
    const created: AssistantTurn = {
      responses: [update(blankResponse(responseId))],
      thinking: "",
      thinkingTruncated: false,
      turn: 1,
    };
    return { ...state, turns: replaceTurn(state.turns, 1, created) };
  }
  const index = responseIndex(turn, responseId);
  if (index < 0) {
    return {
      ...state,
      turns: replaceTurn(state.turns, turn.turn, {
        ...turn,
        responses: [...turn.responses, update(blankResponse(responseId))],
      }),
    };
  }
  const current = turn.responses[index]!;
  return {
    ...state,
    turns: replaceTurn(state.turns, turn.turn, {
      ...turn,
      responses: turn.responses.map((candidate, position) =>
        position === index ? update(current) : candidate),
    }),
  };
}

function locateTurn(state: RunStreamState, responseId: string | undefined): AssistantTurn | undefined {
  if (responseId !== undefined) {
    const owner = state.turns.find((turn) =>
      turn.responses.some((response) => response.responseId === responseId));
    if (owner) return owner;
  }
  return state.turns.at(-1);
}

function responseIndex(turn: AssistantTurn, responseId: string | undefined): number {
  if (responseId === undefined) return turn.responses.length - 1;
  return turn.responses.findIndex((response) => response.responseId === responseId);
}

function sealOpenResponses(turns: AssistantTurn[]): AssistantTurn[] {
  return turns.map((turn) => ({
    ...turn,
    responses: turn.responses.map((response) =>
      response.settled ? response : { ...response, settled: true }),
  }));
}
