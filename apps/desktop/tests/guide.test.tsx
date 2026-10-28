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
const { describe, it } = createTest(import.meta.url, {
  tags: ["category:ut", "os:linux", "arch:amd64", "arch:arm64"],
});
import assert from "node:assert/strict";
// The test runner compiles JSX with the classic runtime, so React has to be in
// scope even though the app itself uses the automatic one.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { GUIDE_STEPS } from "../src/app/guide.js";
import { TEXT } from "../src/text.js";
import { Guide } from "../src/views/Guide.js";

const noop = () => {};

describe("the first-run guide", () => {
  // The static render is the card as it exists before anything is measured:
  // the placement below is a browser case.
  const markup = renderToStaticMarkup(<Guide onClose={noop} onStep={noop} />);

  it("opens on the composer, with the step it is on", () => {
    assert.ok(markup.includes(TEXT.guide.steps.composer.title), "the first card is not the composer's");
    assert.ok(markup.includes(TEXT.guide.steps.composer.body), "the card says nothing");
    assert.ok(markup.includes(TEXT.guide.step(1, GUIDE_STEPS.length)), "the card does not say where it is");
    assert.ok(markup.includes(TEXT.guide.skip), "there is no way out");
    assert.ok(markup.includes(TEXT.guide.next), "there is no way forward");
  });

  it("is the first of three, not the last", () => {
    assert.ok(!markup.includes(TEXT.guide.back), "上一步 is offered on the first card");
    assert.ok(!markup.includes(TEXT.guide.done), "the first card already claims to be the end");
    assert.equal(GUIDE_STEPS.length, 3);
  });

  it("is a named dialog, so it is announced rather than merely drawn", () => {
    assert.match(markup, /role="dialog"/);
    assert.ok(markup.includes(`aria-label="${TEXT.guide.label}"`));
  });

  it("has a card with words for every step the model walks", () => {
    for (const step of GUIDE_STEPS) {
      assert.ok(TEXT.guide.steps[step.key].title.length > 0, `${step.key} has no title`);
      assert.ok(TEXT.guide.steps[step.key].body.length > 40, `${step.key} explains too little to be worth a card`);
    }
  });

  it("stays out of the way until it has been measured", () => {
    // The card is in the document and announced; it is only not yet where it
    // belongs, and a card painted at the top-left corner for one frame is a
    // flicker on the page the user is looking at.
    assert.ok(markup.includes("is-measuring"));
  });
});
