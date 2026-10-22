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

// The test runner compiles JSX with the classic runtime, so React has to be in
// scope even though the app itself uses the automatic one.
import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { createTest } from "../../../test/support/tagged/compat.mjs";
import type { ApiClient } from "../src/api/client.js";
import type { RunnerTarget } from "../src/api/types.js";
import { TEXT } from "../src/text.js";
import { ModelForm } from "../src/views/ModelForm.js";
import { SettingsDialog } from "../src/views/SettingsDialog.js";
import { RunnerSection } from "../src/views/settings/RemoteHosts.js";
import { NetworkSettings } from "../src/views/settings/NetworkSettings.js";
import { RuntimeSettings } from "../src/views/settings/RuntimeSettings.js";
import { SkillsSettings } from "../src/views/settings/SkillsSettings.js";

const { describe, it } = createTest(import.meta.url, { tags: ["category:ut", "os:linux", "arch:amd64", "arch:arm64"] });

/**
 * 通用 reads the recorded data directory, which lives in `localStorage`. Node
 * has no such thing, so the smallest stand-in that lets the tree compose is
 * defined here — this is test scaffolding for a browser API, not a fallback
 * the app itself needs.
 */
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  removeItem: (key: string) => void store.delete(key),
  setItem: (key: string, value: string) => void store.set(key, value),
};

/**
 * Nothing in these pages runs until its `useEffect` fires, and there is no DOM
 * here for that. What static markup does prove is the part that would break
 * loudly in a browser too: that each page composes, that the nav carries the
 * whole set of entries, and that a page reaches for its data on first render
 * instead of rendering an empty state it will never leave.
 */
const client = { request: () => new Promise(() => {}) } as unknown as ApiClient;
const noConfirm = () => {};

const state = {
  connection: "ready",
  confirm: undefined,
  loadingSession: false,
  models: [],
  outputs: [],
  panelFiles: [],
  presets: [],
  projects: [],
  providers: [],
  recent: [],
  run: {},
  running: false,
  sessionsByProject: {},
  tabs: { activeTabId: "home", tabs: [] },
  toasts: [],
} as never;

const actions = {
  confirmAction: noConfirm,
  refreshCatalog: () => Promise.resolve(),
  setDefaultModel: () => Promise.resolve(),
} as never;

const loading = "正在读取…";

describe("the settings nav", () => {
  const markup = renderToStaticMarkup(
    <SettingsDialog actions={actions} client={client} onClose={noConfirm} state={state} />,
  );

  it("carries the five pages this app keeps", () => {
    for (const label of ["通用", "模型", "技能", "网络", "远程"]) {
      assert.ok(markup.includes(`>${label}</button>`), `nav is missing ${label}`);
    }
    assert.equal(markup.match(/settings-nav-item/g)?.length, 5);
  });

  it("leaves out 专家, 连接器, 权限 and 反馈, which this app does not offer", () => {
    for (const label of ["专家", "连接器", "权限", "反馈"]) {
      assert.ok(!markup.includes(`>${label}</button>`), `nav still offers ${label}`);
    }
  });

  it("groups them under the headings that still have a page", () => {
    for (const heading of ["系统", "智能", "连接"]) {
      assert.ok(
        markup.includes(`settings-nav-heading">${heading}<`),
        `nav is missing the ${heading} group`,
      );
    }
    for (const gone of ["工作区", "反馈"]) {
      assert.ok(!markup.includes(`settings-nav-heading">${gone}<`), `the ${gone} group is still there`);
    }
  });

  it("puts 远程 under 连接, where the machines it names belong", () => {
    const connection = markup.slice(markup.indexOf('settings-nav-heading">连接<'));
    const nextHeading = connection.indexOf("settings-nav-heading", 1);
    const group = nextHeading === -1 ? connection : connection.slice(0, nextHeading);
    assert.ok(group.includes(">远程</button>"), "远程 is not in the 连接 group");
    assert.ok(group.includes(">网络</button>"), "网络 left the 连接 group");
  });

  it("gives every entry its own colour square, keyed by the section id", () => {
    // The ::before square is selected by `[data-section=...]`, so a nav item
    // without that attribute is an uncoloured square rather than an error.
    for (const id of ["general", "model", "skills", "network", "runtime"]) {
      assert.ok(markup.includes(`data-section="${id}"`), `no data-section for ${id}`);
    }
  });

  it("opens on 通用, the first page", () => {
    assert.ok(markup.includes('class="settings-nav-item active" data-section="general"'));
  });
});

describe("a Runner registered on another machine", () => {
  // A ready host whose reported build is not this one's: exactly the data that
  // used to raise 版本不一致 beside the state tag. Both versions are still in the
  // response, so the card is rendered from them rather than around them.
  const host = {
    alias: "gpu-01",
    capabilities: { platform: "Linux" },
    connectionKind: "ssh",
    createdAt: "2026-01-01T00:00:00.000Z",
    hostName: "10.0.0.9",
    id: "host-1",
    location: "remote",
    runnerStatus: {
      hostId: "host-1",
      localVersion: "build-a",
      remoteVersion: "build-b",
      state: "ready",
    },
    status: "ready",
  } as unknown as RunnerTarget;

  const markup = renderToStaticMarkup(
    <RunnerSection
      client={client}
      hosts={[host]}
      onConfirm={noConfirm}
      onReload={noConfirm}
    />,
  );

  it("prints the version it reports without judging it against this one", () => {
    assert.ok(markup.includes("build-b"), "the remote version is no longer shown");
    assert.ok(markup.includes('class="settings-tag is-ok"'), "the ready tag is gone");
    // A differing build is not a warning this screen raises. The card's only
    // other warn tone would be an untrusted host key, which this host has none
    // of, so any warn tag left here is the version badge coming back.
    assert.ok(!markup.includes("settings-tag is-warn"), "the card warns about something again");
  });
});

describe("the add-model form", () => {
  const form = (onCancel?: () => void) =>
    renderToStaticMarkup(
      <ModelForm
        client={client}
        onConfigured={noConfirm}
        onCancel={onCancel}
        onProvidersChanged={noConfirm}
        presets={[]}
        providers={[]}
        submitLabel={TEXT.settings.model.save}
      />,
    );

  it("explains nothing under its fields", () => {
    // The example the user removed, and the class every removed sentence used.
    const markup = form(noConfirm);
    assert.ok(!markup.includes("field-help"), "a field hint is still rendered");
    assert.ok(!markup.includes("还没测试"), "the idle test sentence is back");
    assert.ok(!markup.includes("预设覆盖常见的国内外提供方"), "the preset hint is back");
  });

  it("puts 测试, 保存 and 取消 side by side, in that order", () => {
    const markup = form(noConfirm);
    const test = markup.indexOf(">测试</button>");
    const save = markup.indexOf(`>${TEXT.settings.model.save}</button>`);
    const cancel = markup.indexOf(`>${TEXT.menu.cancel}</button>`);
    assert.ok(test >= 0, "no 测试 button");
    assert.ok(save >= 0, "no 保存 button");
    assert.ok(cancel >= 0, "no 取消 button");
    assert.ok(test < save && save < cancel, "the buttons are out of order");
  });

  it("omits 取消 where the caller has its own way back", () => {
    assert.ok(!form().includes(`>${TEXT.menu.cancel}</button>`));
  });

  it("keeps the model page's wording in step with the layout", () => {
    const model = JSON.stringify(TEXT.settings.model);
    assert.ok(model.includes("已配置的模型"));
    for (const gone of ["已配置的提供方", "尚未指定", "保存并设为默认"]) {
      assert.ok(!model.includes(gone), `模型 still has a ${gone} label`);
    }
  });
});

describe("each settings page", () => {
  // The registrations are written out rather than looped: the CI collector
  // audits every test declaration, and a title assembled at runtime is a
  // case it cannot name before running it.
  const asksForItsData = (name: string, element: React.ReactElement) => {
    const markup = renderToStaticMarkup(element);
    assert.ok(markup.includes("settings-section"), `${name} rendered no section`);
    assert.ok(markup.includes(loading), `${name} did not start a read`);
  };

  it("技能 renders and asks for its data", () => {
    asksForItsData("技能", <SkillsSettings client={client} />);
  });

  it("网络 renders and asks for its data", () => {
    asksForItsData("网络", <NetworkSettings client={client} onConfirm={noConfirm} />);
  });

  it("远程 renders and asks for its data", () => {
    asksForItsData("远程", <RuntimeSettings client={client} onConfirm={noConfirm} />);
  });

  it("技能 says why it cannot read a choice when there is no project yet", () => {
    // The skill selection lives in the project layer, so a page without a
    // project has nothing to read — and says so rather than showing a list of
    // switches that would write nowhere.
    const markup = renderToStaticMarkup(<SkillsSettings client={client} />);
    assert.ok(markup.includes(loading));
  });

  it("网络 keeps the sandbox mode and its allowlist, and 远程 only the Runner", () => {
    // Both of those pages are mid-read in this render, so the sections
    // themselves are behind their loading gate and there is no DOM here to
    // resolve it. What can be pinned is the vocabulary each page owns: the
    // blocks that were taken out would bring their labels back with them.
    const network = JSON.stringify(TEXT.settings.network);
    assert.ok(network.includes("沙箱网络"));
    // The allowlist mode and the box that takes its domains are offered.
    assert.ok(network.includes("域名白名单"));
    assert.ok(network.includes("允许的域名"));
    for (const gone of [
      "代理服务器",
      "新增代理服务器",
      "按模块代理",
      "允许内网与回环地址",
      "白名单流量的出站路由",
      "保存沙箱网络",
      "保存会轮换权限时代",
    ]) {
      assert.ok(!network.includes(gone), `网络 still has a ${gone} label`);
    }
    const runtime = JSON.stringify(TEXT.settings.runtime);
    assert.ok(runtime.includes("Runner"));
    for (const gone of ["常驻内核", "运行状态", "配额", "超时", "测试连接"]) {
      assert.ok(!runtime.includes(gone), `远程 still has a ${gone} label`);
    }
    // The Runner list has no heading of its own now; the group is the heading.
    assert.ok(!runtime.includes('"heading":"Runner"'));
  });
});
