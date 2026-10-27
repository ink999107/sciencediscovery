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

import { createTest } from "../../../../test/support/tagged/compat.mjs";
const { test } = createTest(import.meta.url, { tags: ["category:ut", "os:linux", "arch:amd64", "arch:arm64"] });
import assert from "node:assert/strict";
import { readFile, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { SessionStore } from "../store.js";
import { SAMPLE_SESSION_MARKER, seedSampleSession } from "./index.js";

function tempRoot(name: string): string {
  return resolve(process.cwd(), ".tmp", `${name}-${Date.now()}-${process.pid}`);
}

test("an install with no conversation of its own opens on the sample Session", async (context) => {
  const root = tempRoot("sample-session-fresh");
  context.after(() => rm(root, { force: true, recursive: true }));
  const store = new SessionStore(root);
  await store.load();

  assert.equal(await seedSampleSession(store), true);

  const projects = store.listUserProjects();
  assert.deepEqual(projects.map((project) => project.name), ["示例项目"]);
  const [project] = projects;
  assert.ok(project);
  const sessions = store.listSessions(project.id, "all");
  assert.equal(sessions.length, 1);
  const [session] = sessions;
  assert.ok(session);
  assert.equal(session.title, "Session 10-26 01:40");

  // The files landed under this install's own ids, not the originals: the
  // conversation is readable through the same path the store looks in, and
  // nothing in it still names the machine the sample was recorded on.
  const messages = await readFile(resolve(root, "messages", `${session.id}.json`), "utf8");
  assert.doesNotMatch(messages, /__SESSION_ID__|__PROJECT_ID__|__DATA_DIR__/);
  const runs = await readFile(resolve(root, "session-runs", `${session.id}.json`), "utf8");
  assert.equal(JSON.parse(runs).length, 2);
  const workspace = resolve(root, "projects", project.id, "sessions", session.id, "workspace");
  assert.ok((await stat(workspace)).isDirectory());
  // The figures are images, so they are written as bytes rather than through
  // utf8 — which would turn every non-ASCII byte into a replacement character.
  const figure = await readFile(resolve(workspace, "out", "fig_corr_heatmap.png"));
  assert.deepEqual([...figure.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await assert.rejects(stat(resolve(workspace, "__pycache__")), /ENOENT/);
  assert.ok((await stat(resolve(root, SAMPLE_SESSION_MARKER))).isFile());
});

test("the sample is written once, so deleting it is not undone on the next start", async (context) => {
  const root = tempRoot("sample-session-once");
  context.after(() => rm(root, { force: true, recursive: true }));
  const store = new SessionStore(root);
  await store.load();
  assert.equal(await seedSampleSession(store), true);
  const project = store.listUserProjects()[0];
  assert.ok(project);
  const session = store.listSessions(project.id, "all")[0];
  assert.ok(session);

  // The user deletes what they were given. The Project stays behind empty,
  // which is exactly the state a re-seed would fill again.
  await store.deleteSession(session.id, session.id);
  assert.deepEqual(store.listSessions(project.id, "all"), []);
  assert.equal(await seedSampleSession(store), false);

  const reopened = new SessionStore(root);
  await reopened.load();
  assert.equal(await seedSampleSession(reopened), false);
  assert.deepEqual(reopened.listUserProjects().map((entry) => entry.name), ["示例项目"]);
  assert.deepEqual(reopened.listSessions(project.id, "all"), []);
});

test("an install that already has conversations is not given a sample", async (context) => {
  const root = tempRoot("sample-session-existing");
  context.after(() => rm(root, { force: true, recursive: true }));
  const store = new SessionStore(root);
  await store.load();
  const mine = await store.createProject("My analysis");
  await store.createSession(mine.id, "Mine", {}, {}, { allowUnconfiguredModel: true });

  assert.equal(await seedSampleSession(store), false);
  assert.deepEqual(store.listUserProjects().map((project) => project.name), ["My analysis"]);
  assert.equal(store.listSessions(mine.id, "all").length, 1);
});
