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

import type { WorkspaceActions } from "../src/app/use-workspace.js";
import { Sidebar } from "../src/views/Sidebar.js";

const actions = { openSession: async () => {} } as unknown as WorkspaceActions;

function session(id: string, title: string) {
  return { id, title } as never;
}

function render(over: Partial<Parameters<typeof Sidebar>[0]> = {}): string {
  return renderToStaticMarkup(
    <Sidebar actions={actions} projectName="我的工作区" recent={[]} {...over} />,
  );
}

test("the sidebar puts the sessions under the one project, above the task section", () => {
  const markup = render({
    projectName: "脓毒症研究",
    recent: [session("s1", "结构比对"), session("s2", "文献综述")],
  });
  assert.match(markup, /结构比对/);
  assert.match(markup, /文献综述/);
  // The handoff groups them: 项目 label, the project fold with its name, the
  // two rows, and then the 会话 section this build never fills.
  const project = markup.indexOf("side-row side-project");
  const first = markup.indexOf("结构比对");
  const tasks = markup.indexOf("side-label side-label-spaced");
  assert.ok(project >= 0, "the project fold is missing");
  assert.ok(markup.indexOf("脓毒症研究") < first, "the project name is not above its rows");
  assert.ok(project < first && first < tasks, "the rows are not grouped as designed");
});

test("the task column has no search field under 新建会话", () => {
  const markup = render({ recent: [session("s1", "结构比对")] });
  assert.doesNotMatch(markup, /side-search/);
  assert.doesNotMatch(markup, /type="search"/);
});

test("a session row carries the double-click rename as its own tooltip", () => {
  const markup = render({ recent: [session("s1", "结构比对")] });
  assert.match(markup, /title="结构比对 · 双击改名"/);
});

test("an empty list leaves the project quiet and says 暂无会话 once", () => {
  const markup = render();
  // The project exists and has no sessions, which is simply an empty section —
  // the one sentence belongs to 会话, and it appears once.
  assert.equal(markup.split("暂无会话").length - 1, 1);
  const empty = markup.indexOf("暂无会话");
  assert.ok(markup.indexOf("side-label side-label-spaced") < empty, "the empty state is not under 会话");
  assert.doesNotMatch(markup, /暂无任务/);
});

test("a session the service still calls untitled reads in the interface language", () => {
  const markup = render({ recent: [session("s1", "Untitled session")] });
  assert.match(markup, /未命名会话/);
  assert.doesNotMatch(markup, /Untitled session/);
});

test("the active session is the only row marked active", () => {
  const markup = render({
    activeSessionId: "s2",
    recent: [session("s1", "结构比对"), session("s2", "文献综述")],
  });
  assert.equal(markup.split('class="side-row side-sub is-active"').length - 1, 1);
});
