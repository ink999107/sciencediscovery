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
// scope even though the app itself is built with the automatic one.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { PanelResize } from "../src/app/use-panel-width.js";
import type { PreviewSlot, TabState, WorkspaceActions } from "../src/app/use-workspace.js";
import { HOME_TAB_ID, addTab, initialTabState, placeDocument } from "../src/app/preview-tabs.js";
import { WorkspacePanel } from "../src/views/WorkspacePanel.js";

/** The panel only reads these three; the rest of the interface is not reached
 *  by a static render. */
const actions = {
  addPanelTab: () => {},
  closeTab: () => false,
  openArtifact: async () => {},
  openFile: async () => {},
  selectPanelTab: () => {},
} as unknown as WorkspaceActions;

/** The splitter's callbacks belong to the shell, which is not under test here;
 *  only the width it is told about reaches the markup. */
const resize: PanelResize = { nudge: () => {}, start: () => {}, width: 360 };

function render(tabs: TabState, over: Partial<Parameters<typeof WorkspacePanel>[0]> = {}): string {
  return renderToStaticMarkup(
    <WorkspacePanel
      actions={actions}
      files={[]}
      onCollapse={() => {}}
      outputs={[]}
      resize={resize}
      tabs={tabs}
      {...over}
    />,
  );
}

function count(markup: string, needle: string): number {
  return markup.split(needle).length - 1;
}

test("a fresh panel renders one tab and the artifacts-plus-tree body", () => {
  const markup = render(initialTabState());
  assert.equal(count(markup, 'role="tab"'), 1);
  assert.equal(count(markup, "新标签页"), 1);
  assert.match(markup, /class="workspace-tab active"/);
  // The initial tab's content is the two sections, not a document.
  assert.match(markup, /artifacts-section/);
  assert.match(markup, /workspace-tree-section/);
  assert.equal(count(markup, 'aria-label="关闭页签"'), 1);
  assert.equal(count(markup, 'aria-label="新增页签"'), 1);
});

test("the second document adds a tab bar entry and the body becomes the document", () => {
  const first = initialTabState();
  const placed = placeDocument(first.tabs, first.activeTabId, {
    label: "figure.png",
    path: "out/figure.png",
  });
  const second = placeDocument(placed.tabs, placed.activeTabId, {
    label: "notes.md",
    path: "out/notes.md",
  });
  const markup = render(second);
  assert.equal(count(markup, 'role="tab"'), 2);
  assert.equal(count(markup, 'aria-label="关闭页签"'), 2);
  // Matched on the title element, not the bare string: the tab's tooltip is the
  // full path, which contains the label as a substring.
  assert.equal(count(markup, 'class="tab-title">figure.png<'), 1, "the background tab keeps its title");
  // The active tab is the markdown one, so its content is rendered and the
  // overview is gone.
  assert.match(markup, /artifact-view-header/);
  assert.doesNotMatch(markup, /artifacts-section/);
});

test("a loading document shows a spinner rather than an empty body", () => {
  const state = placeDocument(initialTabState().tabs, HOME_TAB_ID, { label: "a.png", path: "a.png" });
  const markup = render(state);
  assert.match(markup, /spinner/);
  assert.doesNotMatch(markup, /这个类型暂时没有预览/);
});

test("a failed read renders its error and not the unsupported-type note", () => {
  const slot: PreviewSlot = {
    error: "读取失败",
    home: false,
    id: HOME_TAB_ID,
    label: "a.bin",
    loading: false,
    path: "a.bin",
  };
  const markup = render({ activeTabId: HOME_TAB_ID, tabs: [slot] });
  assert.match(markup, /读取失败/);
  assert.doesNotMatch(markup, /这个类型暂时没有预览/);
});

test("a markdown document renders its body, not a source listing", () => {
  const slot: PreviewSlot = {
    content: "# 标题",
    home: false,
    id: HOME_TAB_ID,
    label: "notes.md",
    loading: false,
    path: "notes.md",
  };
  const markup = render({ activeTabId: HOME_TAB_ID, tabs: [slot] });
  assert.match(markup, /<h1>标题<\/h1>/);
});

test("a table in the preview is wrapped in a scroller rather than clipped", () => {
  // A table cannot be narrowed — its columns are as wide as their content — so
  // on a panel dragged down to its minimum the overflow has to scroll. The
  // panel clips, so without the wrapper the right-hand columns would be gone.
  const slot: PreviewSlot = {
    content: "| 名称 | 结果 |\n| --- | --- |\n| 甲 | 通过 |",
    home: false,
    id: HOME_TAB_ID,
    label: "report.md",
    loading: false,
    path: "report.md",
  };
  const markup = render({ activeTabId: HOME_TAB_ID, tabs: [slot] });
  assert.match(markup, /class="md-scroll"/);
  assert.ok(markup.indexOf('<div class="md-scroll">') < markup.indexOf("<table>"));
  assert.match(markup, /<th>名称<\/th>/u);
  assert.match(markup, /<td>通过<\/td>/u);
});

test("the workspace section counts files and names the session root", () => {
  const markup = render(initialTabState(), {
    files: [
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "a.txt", size: 12 },
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "sub/b.txt", size: 2048 },
    ],
  });
  assert.match(markup, /2 个文件/);
  assert.match(markup, /本次会话/);
  assert.equal(count(markup, "tree-row is-file"), 2);
});

test("a deep path is one foldable row per directory, not one row with slashes", () => {
  const markup = render(initialTabState(), {
    files: [{
      modifiedAt: "2026-01-01T00:00:00.000Z",
      path: "antibody_pipeline/runs/demo-01/05_screening/report.md",
      size: 822,
    }],
  });
  // Four directories, four folds, each labelled with its own segment.
  assert.equal(count(markup, 'class="tree-dir"'), 4);
  for (const name of ["antibody_pipeline", "runs", "demo-01", "05_screening"]) {
    assert.equal(count(markup, `class="tree-name">${name}<`), 1, `${name} is its own row`);
  }
  // The joined path survives only as the file's tooltip, never as a folder name.
  assert.equal(count(markup, "antibody_pipeline/runs/demo-01/05_screening"), 1);
  assert.match(markup, /title="antibody_pipeline\/runs\/demo-01\/05_screening\/report\.md"/u);
});

test("a directory's count is every file below it, not just its own", () => {
  const markup = render(initialTabState(), {
    files: [
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "a/one.txt", size: 1 },
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "a/b/two.txt", size: 1 },
    ],
  });
  assert.equal(count(markup, "2 个文件"), 2, "the folder and the section header agree");
});

test("an empty workspace says so instead of rendering an empty tree", () => {
  const markup = render(initialTabState());
  assert.match(markup, /工作区里还没有文件/);
});

test("an artifact row is a name and a dot, not a preview of its contents", () => {
  const description = "这份报告汇总了三条证据链，覆盖蛋白结构的比对结果与相关文献的支撑情况。";
  const markup = render(initialTabState(), {
    outputs: [
      {
        artifact: {
          description,
          id: "a1",
          kind: "report",
          name: "结构比对报告.md",
        },
        version: { id: "v1", version: 3 },
      } as never,
    ],
  });
  assert.match(markup, /结构比对报告\.md/);
  // The server's description is a paragraph, and a paragraph per row buried the
  // names it was meant to help pick between. It survives as the tooltip and
  // nowhere else — one occurrence, inside `title="`.
  assert.ok(markup.includes(`title="${description}"`), "the description is not the tooltip");
  assert.equal(count(markup, description), 1);
  assert.doesNotMatch(markup, /artifact-desc/);
});

test("an extra empty tab is offered without stealing the overview", () => {
  const state = addTab(initialTabState().tabs);
  const markup = render(state);
  assert.equal(count(markup, 'role="tab"'), 2);
  // The added tab is active and is home-shaped, so the overview is what shows.
  assert.match(markup, /artifacts-section/);
});

test("the tab bar offers adding a tab and closing one, and no window controls", () => {
  const markup = render(initialTabState());
  assert.match(markup, /aria-label="新增页签"/);
  assert.match(markup, /aria-label="关闭页签"/);
  // The panel's show/hide lives in the toolbar; the tab bar is about tabs.
  assert.doesNotMatch(markup, /title="全屏"/);
  assert.doesNotMatch(markup, /title="收起"/);
  assert.doesNotMatch(markup, /class="icon-button"/);
});

test("the panel's left edge is a separator that reports the width it is at", () => {
  const markup = render(initialTabState(), { resize: { ...resize, width: 512 } });
  assert.match(markup, /class="workspace-splitter"/);
  assert.match(markup, /role="separator"/);
  // A separator a keyboard cannot reach is a separator half the users cannot
  // use, so it takes focus and says where it is in the range.
  assert.match(markup, /aria-valuenow="512"/);
  assert.match(markup, /aria-valuemin="280"/u);
  assert.match(markup, /aria-valuemax="720"/u);
  assert.match(markup, /tabindex="0"/u);
});

test("a structure's name is a button into the full-screen view, another document's is text", () => {
  const structure: PreviewSlot = {
    content: "ATOM      1  N   ALA A   1      11.104   6.134  -6.504  1.00 20.00           N",
    home: false,
    id: HOME_TAB_ID,
    label: "a.pdb",
    loading: false,
    path: "a.pdb",
  };
  assert.match(render({ activeTabId: HOME_TAB_ID, tabs: [structure] }), /class="artifact-view-title"/);
  const markdown: PreviewSlot = { ...structure, content: "# 标题", label: "notes.md", path: "notes.md" };
  assert.doesNotMatch(render({ activeTabId: HOME_TAB_ID, tabs: [markdown] }), /artifact-view-title/);
});
