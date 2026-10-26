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

import type { Subagent } from "../src/api/types.js";
import { PANEL_MAX_WIDTH, PANEL_MIN_WIDTH } from "../src/app/panel-width.js";
import type { PanelResize } from "../src/app/use-panel-width.js";
import type { PreviewSlot, TabState, WorkspaceActions } from "../src/app/use-workspace.js";
import { HOME_TAB_ID, initialTabState, placeDocument } from "../src/app/preview-tabs.js";
import { WorkspacePanel } from "../src/views/WorkspacePanel.js";

/** The panel only reads these; the rest of the interface is not reached by a
 *  static render. */
const actions = {
  addPanelTab: () => {},
  closeTab: () => false,
  openArtifact: async () => {},
  openFile: async () => {},
  selectPanelTab: () => {},
} as unknown as WorkspaceActions;

/** The splitter's callbacks belong to the shell, which is not under test here;
 *  only the width it is told about reaches the markup. */
const resize: PanelResize = { nudge: () => {}, start: () => {}, width: 720 };

function render(tabs: TabState, over: Partial<Parameters<typeof WorkspacePanel>[0]> = {}): string {
  return renderToStaticMarkup(
    <WorkspacePanel
      actions={actions}
      activeGroup="files"
      files={[]}
      onCollapse={() => {}}
      onSelectGroup={() => {}}
      outputs={[]}
      resize={resize}
      tabs={tabs}
      {...over}
    />,
  );
}

/** One document open in the panel, with the fields the group filter reads. */
function document(over: Partial<PreviewSlot> = {}): TabState {
  return {
    activeTabId: HOME_TAB_ID,
    tabs: [{
      home: false,
      id: HOME_TAB_ID,
      label: "notes.md",
      loading: false,
      path: "notes.md",
      source: "file",
      ...over,
    }],
  };
}

function count(markup: string, needle: string): number {
  return markup.split(needle).length - 1;
}

test("a fresh panel offers two group tabs and opens on 工作区", () => {
  const markup = render(initialTabState());
  assert.equal(count(markup, 'role="tab"'), 2);
  for (const label of ["产物", "工作区"]) {
    assert.ok(markup.includes(`<span>${label}</span>`), `${label} is missing from the group tabs`);
  }
  // 团队 is gone: this build has no team for the tab to show. 会话 is not a tab
  // either — the run's steps live in the transcript.
  assert.doesNotMatch(markup, /<span>团队<\/span>/);
  assert.doesNotMatch(markup, /<span>会话<\/span>/);
  assert.doesNotMatch(markup, /<span>文件<\/span>/);
  assert.equal(count(markup, "panel-group-tab is-active"), 1);
  // The panel's own controls live in its header, not in a tab bar. Only the
  // collapse control is left; the expand affordance is gone.
  assert.doesNotMatch(markup, /aria-label="放大面板"/);
  assert.match(markup, /aria-label="收起面板"/);
});

test("工作区 lists every file and folder of the workspace", () => {
  const markup = render(initialTabState(), {
    activeGroup: "files",
    files: [
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "a.txt", size: 12 },
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "sub/b.txt", size: 2048 },
    ],
  });
  assert.match(markup, />a\.txt</);
  assert.match(markup, />b\.txt</);
  assert.match(markup, />sub</);
  assert.equal(count(markup, "panel-list-row is-folder"), 1);
  assert.match(markup, /aria-label="搜索文件"/);
});

test("a deep path is one foldable row per directory, not one row with slashes", () => {
  const markup = render(initialTabState(), {
    activeGroup: "files",
    files: [{
      modifiedAt: "2026-01-01T00:00:00.000Z",
      path: "antibody_pipeline/runs/demo-01/05_screening/report.md",
      size: 822,
    }],
  });
  // Four directories, four folds, each labelled with its own segment.
  assert.equal(count(markup, "panel-list-row is-folder"), 4);
  for (const name of ["antibody_pipeline", "runs", "demo-01", "05_screening"]) {
    assert.equal(count(markup, `class="label">${name}<`), 1, `${name} is its own row`);
  }
  // The joined path survives only as the file's tooltip, never as a folder name.
  assert.equal(count(markup, "antibody_pipeline/runs/demo-01/05_screening"), 1);
  assert.match(markup, /title="antibody_pipeline\/runs\/demo-01\/05_screening\/report\.md · 822 B · /u);
});

test("a nested file appears once, under its own folders", () => {
  const markup = render(initialTabState(), {
    activeGroup: "files",
    files: [
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "a/one.txt", size: 1 },
      { modifiedAt: "2026-01-01T00:00:00.000Z", path: "a/b/two.txt", size: 1 },
    ],
  });
  assert.equal(count(markup, "panel-list-row is-folder"), 2);
  assert.equal(count(markup, 'class="label">one.txt<'), 1);
  assert.equal(count(markup, 'class="label">two.txt<'), 1);
});

test("an empty workspace says so instead of rendering an empty tree", () => {
  const markup = render(initialTabState(), { activeGroup: "files" });
  assert.match(markup, /工作区里还没有文件/);
});

test("an artifact row is a name and a tooltip, not a preview of its contents", () => {
  const description = "这份报告汇总了三条证据链，覆盖蛋白结构的比对结果与相关文献的支撑情况。";
  const markup = render(initialTabState(), {
    activeGroup: "artifacts",
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
});

test("a document opened from 产物 becomes its own tab and the body is the document", () => {
  const placed = placeDocument(initialTabState().tabs, HOME_TAB_ID, {
    artifactId: "v1",
    label: "结构比对报告.md",
    path: "",
    source: "artifact",
  });
  const tabs: TabState = {
    ...placed,
    tabs: placed.tabs.map((slot) => ({ ...slot, content: "# 标题", loading: false })),
  };
  const outputs = [{
    artifact: { id: "a1", kind: "report", name: "结构比对报告.md", title: "结构比对报告" },
    version: { id: "v1", version: 3 },
  }] as never;
  const markup = render(tabs, { activeGroup: "artifacts", outputs });
  // Two group tabs plus the document.
  assert.equal(count(markup, 'role="tab"'), 3);
  assert.equal(count(markup, "doc-tab-close"), 1);
  assert.match(markup, /aria-label="新增页签"/);
  assert.match(markup, /class="doc-tab is-active"/);
  assert.match(markup, /<h1>标题<\/h1>/);
  // The artifacts list stays beside the document, and the document is drawn on
  // the handoff's canvas rather than in the list column.
  assert.match(markup, /所有产物/);
  assert.match(markup, /class="artifact-canvas"/);
  assert.match(markup, /aria-label="下载"/);
});

test("a document belongs to the group it was opened from", () => {
  // An artifact tab must not surface under 文件, nor a source file under 产物:
  // the two lists are views of the same workspace, not one shared shelf.
  const artifactDoc: TabState = document({ source: "artifact", artifactId: "v1", label: "报告.md" });
  const artifacts = render(artifactDoc, { activeGroup: "artifacts" });
  assert.match(artifacts, /报告\.md/);
  const files = render(artifactDoc, { activeGroup: "files" });
  assert.match(files, /工作区里还没有文件/);

  const fileDoc = document({ label: "notes.md" });
  const underArtifacts = render(fileDoc, { activeGroup: "artifacts" });
  assert.match(underArtifacts, /这次会话还没有产物/);
});

test("a loading document shows a spinner rather than an empty body", () => {
  const markup = render(document({ loading: true }), { activeGroup: "files" });
  assert.match(markup, /spinner/);
  assert.doesNotMatch(markup, /这个类型暂时没有预览/);
});

test("a failed read renders its error and not the unsupported-type note", () => {
  const markup = render(document({ error: "读取失败", label: "a.bin", path: "a.bin" }), {
    activeGroup: "files",
  });
  assert.match(markup, /读取失败/);
  assert.doesNotMatch(markup, /这个类型暂时没有预览/);
});

test("a markdown document renders its body, not a source listing", () => {
  const markup = render(document({ content: "# 标题", label: "notes.md" }), { activeGroup: "files" });
  assert.match(markup, /<h1>标题<\/h1>/);
});

test("a table in the preview is wrapped in a scroller rather than clipped", () => {
  // A table cannot be narrowed — its columns are as wide as their content — so
  // on a panel dragged down to its minimum the overflow has to scroll. The
  // panel clips, so without the wrapper the right-hand columns would be gone.
  const markup = render(document({
    content: "| 名称 | 结果 |\n| --- | --- |\n| 甲 | 通过 |",
    label: "report.md",
    path: "report.md",
  }), { activeGroup: "files" });
  assert.match(markup, /class="md-scroll"/);
  assert.ok(markup.indexOf('<div class="md-scroll">') < markup.indexOf("<table>"));
  assert.match(markup, /<th>名称<\/th>/u);
  assert.match(markup, /<td>通过<\/td>/u);
});

test("a structure file goes to the 3D viewer, not to a source listing", () => {
  const markup = render(document({
    content: "ATOM      1  N   ALA A   1      11.104   6.134  -6.504  1.00 20.00           N",
    label: "a.pdb",
    path: "a.pdb",
  }), { activeGroup: "files" });
  // The viewer is loaded on demand, so a static render stops at its fallback —
  // which is the point: the contents are never printed as raw text.
  assert.match(markup, /class="doc-placeholder"><span class="spinner"/);
  assert.doesNotMatch(markup, /ATOM/);
});

function subagent(overrides: Partial<Subagent> = {}): Subagent {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "a1",
    input: { description: "read the literature", prompt: "search and summarize" },
    maxTurns: 12,
    parentTurnId: "turn-1",
    sessionId: "s1",
    status: "completed",
    steps: [],
    timeoutSeconds: 600,
    turnCount: 2,
    ...overrides,
  };
}

test("a subagent replaces the panel's groups rather than becoming a third tab", () => {
  const markup = render(initialTabState(), { subagent: subagent() });
  // No 团队 tab, and no group tabs at all while the child is open: the panel
  // shows the child's record. There is no back arrow either — the transcript
  // line that opened the child is the way back.
  assert.doesNotMatch(markup, /role="tab"/u);
  assert.doesNotMatch(markup, /<span>团队<\/span>/);
  assert.doesNotMatch(markup, /当前活跃/u);
  assert.doesNotMatch(markup, /class="panel-back"/u);
  assert.match(markup, /read the literature/);
  assert.match(markup, /class="subagent-detail"/);
});

test("the child's execution and its final output are both shown", () => {
  const markup = render(initialTabState(), {
    subagent: subagent({
      steps: [
        { content: "weighing the options", createdAt: "2026-01-01T00:00:01.000Z", id: "s1", kind: "thinking" },
        {
          content: "three papers found",
          createdAt: "2026-01-01T00:00:02.000Z",
          id: "s2",
          kind: "tool",
          status: "completed",
          toolName: "literature_search",
        },
        { content: "CONCLUSION-TEXT", createdAt: "2026-01-01T00:00:03.000Z", id: "s3", kind: "assistant" },
      ],
    }),
  });
  assert.match(markup, /weighing the options/);
  assert.match(markup, /literature_search/);
  assert.match(markup, /three papers found/);
  // The timeline is a card that starts closed, so the panel opens on the
  // answer rather than on a screen of steps.
  assert.match(markup, /<details class="subagent-card subagent-execution">/u);
  // The final answer is the output section, not a row in the timeline as well.
  assert.equal(count(markup, "CONCLUSION-TEXT"), 1);
  assert.match(markup, /class="subagent-output"/);
});

test("a tool's result is boxed, so it reads as output rather than as the timeline", () => {
  const markup = render(initialTabState(), {
    subagent: subagent({
      steps: [{
        content: "TOOL-RESULT",
        createdAt: "2026-01-01T00:00:01.000Z",
        id: "s1",
        input: '{"skillId": "code-engineer"}',
        kind: "tool",
        status: "completed",
        toolName: "read_skill",
      }],
    }),
  });
  const resultAt = markup.indexOf("TOOL-RESULT");
  assert.ok(resultAt >= 0);
  const boxAt = markup.lastIndexOf('class="subagent-tool-output"', resultAt);
  assert.ok(boxAt >= 0 && boxAt < resultAt, "the result should sit inside an output box");
  // 输入 and 输出 are both named, so the two boxes are not mistaken for each other.
  assert.match(markup, /subagent-step-label">输出<\/div><div class="subagent-tool-output"/u);
  assert.match(markup, /subagent-step-label">输入<\/div>/u);
});

test("the task the child was handed is shown above its steps", () => {
  const markup = render(initialTabState(), {
    subagent: subagent({
      input: {
        description: "read the literature",
        inputPaths: ["papers/a.pdf"],
        prompt: "PROMPT-BODY",
      },
    }),
  });
  // The brief is a card as well, and it starts closed like the timeline.
  assert.match(markup, /<details class="subagent-card subagent-task">/u);
  assert.match(markup, /PROMPT-BODY/u);
  assert.match(markup, /subagent-section-title">任务</u);
  // A path is shown as a chip of its own, not folded into the prose.
  assert.match(markup, /class="subagent-task-path" title="papers\/a\.pdf"/u);
  // The brief and the timeline are separately named, so one cannot be read as
  // the other.
  assert.match(markup, /subagent-section-title">执行详情</u);
});

test("a reply is shown in full rather than folded", () => {
  const markup = render(initialTabState(), {
    subagent: subagent({
      steps: [
        { content: "INTERIM-REPLY", createdAt: "2026-01-01T00:00:01.000Z", id: "s1", kind: "assistant" },
        { content: "FINAL-ANSWER", createdAt: "2026-01-01T00:00:02.000Z", id: "s2", kind: "assistant" },
      ],
    }),
  });
  const replyAt = markup.indexOf("INTERIM-REPLY");
  assert.ok(replyAt >= 0);
  // The only fold above it is the execution card the reader opened to get here:
  // an earlier reply is prose in the timeline, not a fold of its own, while the
  // last one is the output section.
  const before = markup.slice(0, replyAt);
  assert.equal(before.lastIndexOf("<details"), before.lastIndexOf('<details class="subagent-card subagent-execution"'));
});

test("the runtime's own system steps are left out of the timeline", () => {
  const markup = render(initialTabState(), {
    subagent: subagent({
      steps: [
        { content: "Turn 1 started", createdAt: "2026-01-01T00:00:01.000Z", id: "s1", kind: "system" },
        { content: "looked around", createdAt: "2026-01-01T00:00:02.000Z", id: "s2", kind: "thinking" },
      ],
    }),
  });
  assert.doesNotMatch(markup, /Turn 1 started/);
  assert.match(markup, /looked around/);
});

test("a child that timed out has no output, only what it had said so far", () => {
  // Nobody delivered anything here. The last thing the child said is a progress
  // note it was interrupted in the middle of, so calling it 输出 would report a
  // result the child never produced; it stays in the timeline instead.
  const markup = render(initialTabState(), {
    subagent: subagent({
      error: "Subagent wall-clock timeout after 5400 seconds",
      status: "timed_out",
      steps: [{
        content: "MOST-NUMBERS-HOLD",
        createdAt: "2026-01-01T00:00:01.000Z",
        id: "s1",
        kind: "assistant",
      }],
    }),
  });
  assert.doesNotMatch(markup, /class="subagent-output"/u);
  assert.match(markup, /MOST-NUMBERS-HOLD/u);
  assert.equal(count(markup, "MOST-NUMBERS-HOLD"), 1);
});

test("a child that has not run anything yet says so", () => {
  const markup = render(initialTabState(), { subagent: subagent({ status: "running" }) });
  // There is no status row of its own: the transcript line carries the status,
  // and an empty timeline says the rest.
  assert.doesNotMatch(markup, /class="subagent-status"/u);
  assert.match(markup, /class="workspace-empty"/);
});

test("a replayed child says it is loading instead of claiming it recorded nothing", () => {
  // A run's event log stores child snapshots without steps, so a reopened
  // finished run arrives empty. Saying "no execution was recorded" while the
  // catalog read is still in flight would be wrong, and would stay on screen
  // if the reader looked away before it landed.
  const markup = render(initialTabState(), {
    subagent: subagent({ status: "completed" }),
    subagentLoading: true,
  });
  assert.match(markup, /class="spinner"/u);
  assert.match(markup, /正在加载执行记录/u);
  assert.doesNotMatch(markup, /还没有留下可展示的执行记录/u);
});

test("a failed child's reason sits below its execution", () => {
  const markup = render(initialTabState(), {
    subagent: subagent({ error: "the provider refused the request", status: "failed" }),
  });
  assert.match(markup, /执行失败|失败/);
  assert.match(markup, /the provider refused the request/);
  // The reason belongs to how the child ran, so it follows the timeline card
  // rather than opening the panel above the brief.
  const reasonAt = markup.indexOf("the provider refused the request");
  const cardAt = markup.indexOf('class="subagent-card subagent-execution"');
  assert.ok(cardAt >= 0 && cardAt < reasonAt, "the reason should follow the execution card");
});

test("the panel's left edge is a separator that reports the width it is at", () => {
  const markup = render(initialTabState(), { resize: { ...resize, width: 512 } });
  assert.match(markup, /class="workspace-splitter"/);
  assert.match(markup, /role="separator"/);
  // A separator a keyboard cannot reach is a separator half the users cannot
  // use, so it takes focus and says where it is in the range.
  assert.match(markup, /aria-valuenow="512"/);
  assert.match(markup, new RegExp(`aria-valuemin="${PANEL_MIN_WIDTH}"`, "u"));
  assert.match(markup, new RegExp(`aria-valuemax="${PANEL_MAX_WIDTH}"`, "u"));
  assert.match(markup, /tabindex="0"/u);
});
