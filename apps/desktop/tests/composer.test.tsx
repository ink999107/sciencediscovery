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
function render(running = false): string {
  return renderToStaticMarkup(
    <Composer
      models={[{ id: "m1", name: "测试模型" } as never]}
      onSelectModel={() => {}}
      onSend={() => {}}
      onStop={() => {}}
      running={running}
      selectedModelId="m1"
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
