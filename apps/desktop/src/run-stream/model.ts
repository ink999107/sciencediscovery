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

import type { SessionRunStatus } from "../api/types.js";

/** One model invoke attempt's visible text. A turn can hold several: the model
 *  may be re-invoked after a tool call, and each attempt gets its own
 *  `responseId` so an audit event landing between them cannot merge the two. */
export interface AssistantResponse {
  content: string;
  responseId?: string;
  settled: boolean;
  /** The server sent a *partial* snapshot: the text shown is not all of it. */
  truncated: boolean;
}

/** Everything produced between two user messages. */
export interface AssistantTurn {
  turn: number;
  thinking: string;
  thinkingTruncated: boolean;
  responses: AssistantResponse[];
}

/**
 * The live half of the transcript, rebuilt from the event stream.
 *
 * It is deliberately separate from the persisted `ChatMessage[]`: only the
 * assistant's final text is stored (`ChatMessage` has no thinking field), so a
 * reload shows正文 from the session and has to replay this run's events to get
 * the thinking back. The two are merged at render time.
 */
export interface RunStreamState {
  cancelledReason?: string;
  /** Number of earlier events the server could not replay. Non-zero means the
   *  transcript below is genuinely incomplete and must say so. */
  droppedEvents: number;
  error?: { code?: string; message: string };
  /** `run.completed.message.content` — the persisted answer, which outranks
   *  anything assembled from deltas. */
  finalContent?: string;
  /** Largest replay cursor seen, for `?after=` on a reconnect. */
  lastSequence?: number;
  modelName?: string;
  runId?: string;
  status?: SessionRunStatus;
  /** True once a terminal `run.status` arrived, or the stream ended. */
  terminal: boolean;
  turns: AssistantTurn[];
  /** Events this version does not render, counted rather than swallowed. */
  unknownEvents: number;
}

export function emptyRunStream(): RunStreamState {
  return { droppedEvents: 0, terminal: false, turns: [], unknownEvents: 0 };
}

const TERMINAL_STATUSES: readonly SessionRunStatus[] = [
  "cancelled",
  "completed",
  "failed",
  "interrupted",
];

/** The server closes the `messages` response on exactly this condition, so a
 *  client that decides "done" any other way hangs on cancelled and interrupted
 *  runs. */
export function isTerminalRunStatus(status: SessionRunStatus | undefined): boolean {
  return status !== undefined && TERMINAL_STATUSES.includes(status);
}

/**
 * Split the thinking stream into the step list the UI shows.
 *
 * The wire format has no step boundaries — `assistant.thinking.delta` is one
 * undivided character stream — so a blank line is the only break the model
 * ever emits deliberately. Paragraphing on it is an approximation, and a
 * single paragraph simply reads as one step.
 */
export function thinkingSteps(text: string): string[] {
  return text
    .split(/\n\s*\n/u)
    .map((step) => step.trim())
    .filter((step) => step !== "");
}

/**
 * Whether the reconstructed run has an answer body worth showing.
 *
 * This is what decides if the persisted assistant message is hidden: when the
 * stream delivered nothing (a reconnect that found no events, an aborted
 * request), hiding it would leave the turn blank. Thinking does not count — a
 * run that only thought still owes the user its persisted answer.
 */
export function hasVisibleAnswer(state: RunStreamState): boolean {
  if ((state.finalContent ?? "").trim() !== "") return true;
  return state.turns.some((turn) => turn.responses.some((response) => response.content.trim() !== ""));
}

/** The turn with this number, or a new one appended in order. */
export function turnFor(state: RunStreamState, turn: number): AssistantTurn {
  const existing = state.turns.find((candidate) => candidate.turn === turn);
  if (existing) return existing;
  return { responses: [], thinking: "", thinkingTruncated: false, turn };
}

/**
 * Apply an incoming text frame.
 *
 * `snapshot` replaces and `delta` appends. The trap is a truncated snapshot:
 * the server uses one to describe *part* of a long answer, so letting it
 * overwrite a longer buffer would make already-rendered text vanish. The
 * longer buffer wins, and the truncation is recorded instead.
 */
export function mergeText(current: string, next: string, truncated: boolean): string {
  if (truncated && next.length < current.length) return current;
  return next;
}
