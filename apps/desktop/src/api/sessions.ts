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

import type { ApiClient } from "./client.js";
import type {
  CreateSessionRequest,
  Project,
  Session,
  SessionDetail,
  SessionListState,
  SessionRun,
  UpdateSessionRequest,
} from "./types.js";

/** Every Session belongs to a Project, and there is no Project picker in this
 *  UI, so the app keeps exactly one. `listProjects` is ordered by creation
 *  time, which makes the first entry the one to reuse. */
export function listProjects(client: ApiClient): Promise<Project[]> {
  return client.request<Project[]>("/api/projects");
}

/**
 * Create a Project and adopt the first Session the server makes with it.
 *
 * `POST /api/projects` always creates one untitled Session alongside the
 * Project. Returning it means the caller does not have to immediately create
 * a second one — but the caller is free to ignore it and start from the empty
 * state instead.
 */
export async function createProject(
  client: ApiClient,
  name: string,
): Promise<{ firstSession: Session; project: Project }> {
  return client.request<{ firstSession: Session; project: Project }>("/api/projects", {
    body: JSON.stringify({ name }),
    method: "POST",
  });
}

export function listSessions(
  client: ApiClient,
  projectId: string,
  state: SessionListState = "active",
): Promise<Session[]> {
  return client.request<Session[]>(
    `/api/projects/${encodeURIComponent(projectId)}/sessions?state=${state}`,
  );
}

/**
 * `modelId` is sent whenever one is selected. That matters beyond convenience:
 * without it the Session inherits whatever the global default becomes later,
 * and the route only tolerates a missing model when neither the Session nor
 * its overrides name one. Naming it fails early and honestly instead.
 */
export function createSession(
  client: ApiClient,
  projectId: string,
  body: CreateSessionRequest,
): Promise<Session> {
  return client.request<Session>(`/api/projects/${encodeURIComponent(projectId)}/sessions`, {
    body: JSON.stringify(body),
    method: "POST",
  });
}

export function getSession(client: ApiClient, sessionId: string): Promise<SessionDetail> {
  return client.request<SessionDetail>(`/api/sessions/${encodeURIComponent(sessionId)}`);
}

/**
 * `approvalMode` cannot travel with anything else — the route rejects a mixed
 * body — which is why this function only ever touches settings and titles.
 */
export function updateSession(
  client: ApiClient,
  sessionId: string,
  body: UpdateSessionRequest,
): Promise<Session> {
  return client.request<Session>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    body: JSON.stringify(body),
    method: "PATCH",
  });
}

/** The only place a run id is available after the fact: `POST /messages`
 *  never returns one. Ordered by `queueOrder`, so the last entry is the most
 *  recent run. */
export function listRuns(client: ApiClient, sessionId: string): Promise<SessionRun[]> {
  return client.request<SessionRun[]>(`/api/sessions/${encodeURIComponent(sessionId)}/runs`);
}

export function cancelRun(client: ApiClient, sessionId: string, runId: string): Promise<SessionRun> {
  return client.request<SessionRun>(
    `/api/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST" },
  );
}

/**
 * Stop whichever run is active. Cancelling is not optional UI: a browser that
 * disconnects does not cancel its run, so closing the tab or reloading leaves
 * the model working and the account paying. Only this call stops it.
 */
export function cancelCurrentRun(client: ApiClient, sessionId: string): Promise<{ cancelled: boolean; runId?: string }> {
  return client.request<{ cancelled: boolean; runId?: string }>(
    `/api/sessions/${encodeURIComponent(sessionId)}/runs/current/cancel`,
    { method: "POST" },
  );
}

/** The server requires the id repeated back as confirmation, so a stray call
 *  cannot delete anything a user did not name. */
export function deleteSession(client: ApiClient, sessionId: string): Promise<{ deleted: string }> {
  return client.request<{ deleted: string }>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    body: JSON.stringify({ confirmationId: sessionId }),
    method: "DELETE",
  });
}
