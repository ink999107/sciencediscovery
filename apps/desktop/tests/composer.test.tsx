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
// Classic JSX runtime under tsx, so React has to be in scope here.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Composer } from "../src/views/Composer.js";

/** The dropdown only exists while open, and a static render never runs effects,
 *  so these cover the closed state: the trigger itself. */
function render(
  running = false,
  attach: { blocked?: string; limit?: string; uploading?: boolean } = {},
): string {
  return renderToStaticMarkup(
    <Composer
      attachBlocked={attach.blocked}
      attachLimit={attach.limit}
      models={[{ id: "m1", name: "测试模型" } as never]}
      onOpenSettings={() => {}}
      onSelectModel={() => {}}
      onSend={() => {}}
      onStop={() => {}}
      onUpload={() => {}}
      running={running}
      selectedModelId="m1"
      uploading={attach.uploading ?? false}
    />,
  );
}

test("the composer offers the model pill and no 会话配置 button beside it", () => {
  const markup = render();
  assert.match(markup, /class="composer-model-pill"/);
  // 权限模式 was the only setting that button carried, and it is not a choice
  // this app makes any more: the row must not grow it back.
  assert.doesNotMatch(markup, /class="composer-options"/);
  assert.doesNotMatch(markup, /会话配置/);
});

test("uploading a file is offered from the composer, and states its limit", () => {
  const markup = render(false, { limit: "1 GiB" });
  assert.match(markup, /class="composer-attach"/);
  assert.match(markup, /aria-label="上传文件"/);
  assert.match(markup, /单个文件最大 1 GiB/);
  // Having no Session open is not a reason to refuse: the upload opens one,
  // which is what lets the data come before the question.
  assert.doesNotMatch(markup, /class="composer-attach"[^>]*disabled/);
});

test("an unreadable limit claims nothing rather than claiming there is none", () => {
  // The service never reported a ceiling, so the tooltip drops the number
  // instead of printing 「单个文件最大 不限」 — which would be an assertion.
  const markup = render(false, {});
  assert.match(markup, /放进本次会话的工作区/);
  assert.doesNotMatch(markup, /单个文件最大/);
  assert.doesNotMatch(markup, /不限/);
});

test("a blocked upload disables the paperclip and gives the reason on the button", () => {
  // The one surviving block is an archived Session, which the server refuses
  // to write into. A disabled control with no explanation is a dead end.
  const markup = render(false, { blocked: "这个会话已经归档，不能再写入。取消归档后才能上传。" });
  assert.match(markup, /class="composer-attach"[^>]*disabled/);
  assert.match(markup, /title="这个会话已经归档，不能再写入。取消归档后才能上传。"/);
});

test("an upload in flight replaces the paperclip rather than allowing a second", () => {
  const markup = render(false, { uploading: true });
  assert.match(markup, /class="composer-attach"[^>]*disabled/);
  assert.match(markup, /class="spinner"/);
});
