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
    <Sidebar actions={actions} connection="online" onOpenSettings={() => {}} recent={[]} {...over} />,
  );
}

test("the sidebar lists sessions flat, with no 项目 block above them", () => {
  const markup = render({ recent: [session("s1", "结构比对"), session("s2", "文献综述")] });
  assert.match(markup, /结构比对/);
  assert.match(markup, /文献综述/);
  // The ownership the API requires is not something this UI asks about, so no
  // project name, icon or row appears anywhere in the column.
  assert.doesNotMatch(markup, /项目|project-/);
});

test("a session row carries the double-click rename as its own tooltip", () => {
  const markup = render({ recent: [session("s1", "结构比对")] });
  assert.match(markup, /title="结构比对 · 双击改名"/);
});

test("an empty list says so instead of rendering a bare column", () => {
  assert.match(render(), /还没有会话/);
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
  assert.equal(markup.split("side-session active").length - 1, 1);
});
