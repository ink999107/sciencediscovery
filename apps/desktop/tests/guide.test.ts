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

import {
  GUIDE_CARD_GAP,
  GUIDE_SPOT_PADDING,
  GUIDE_STEPS,
  GUIDE_VIEWPORT_MARGIN,
  guideAnchor,
  spotlightBox,
  tourCardPosition,
  type Box,
} from "../src/app/guide.js";

const VIEWPORT = { height: 900, width: 1440 };
const CARD = { height: 180, width: 336 };

function box(over: Partial<Box>): Box {
  return { height: 100, left: 100, top: 100, width: 200, ...over };
}

describe("the guide's steps", () => {
  it("walks the three parts of the page in reading order", () => {
    assert.deepEqual(
      GUIDE_STEPS.map((step) => step.key),
      ["composer", "settings", "panel"],
    );
  });

  it("anchors each step on an element of its own", () => {
    const selectors = GUIDE_STEPS.map((step) => guideAnchor(step.key));
    assert.equal(new Set(selectors).size, GUIDE_STEPS.length);
    assert.equal(guideAnchor("composer"), '[data-guide="composer"]');
  });

  it("keeps the spotlight outside the element it frames", () => {
    const spot = spotlightBox(box({ height: 40, left: 300, top: 500, width: 600 }));
    assert.equal(spot.left, 300 - GUIDE_SPOT_PADDING);
    assert.equal(spot.top, 500 - GUIDE_SPOT_PADDING);
    assert.equal(spot.width, 600 + GUIDE_SPOT_PADDING * 2);
    assert.equal(spot.height, 40 + GUIDE_SPOT_PADDING * 2);
  });
});

describe("where a card lands", () => {
  it("puts the composer's card above it, centred", () => {
    // The composer is the bottom edge of the middle column.
    const anchor = box({ height: 120, left: 400, top: 700, width: 700 });
    const { left, top } = tourCardPosition(anchor, "above", VIEWPORT, CARD);
    assert.equal(top, 700 - GUIDE_CARD_GAP - CARD.height);
    assert.equal(left, 400 + 350 - 168);
  });

  it("keeps a card on screen when the anchor is against an edge", () => {
    const anchor = box({ height: 120, left: 0, top: 700, width: 100 });
    const { left } = tourCardPosition(anchor, "above", VIEWPORT, CARD);
    assert.equal(left, GUIDE_VIEWPORT_MARGIN);

    const right = tourCardPosition(box({ left: 1300 }), "above", VIEWPORT, CARD);
    assert.equal(right.left, VIEWPORT.width - GUIDE_VIEWPORT_MARGIN - CARD.width);
  });

  it("puts the rail's card to its right", () => {
    const anchor = box({ height: 48, left: 8, top: 200, width: 48 });
    const { left, top } = tourCardPosition(anchor, "right", VIEWPORT, CARD);
    assert.equal(left, 8 + 48 + GUIDE_CARD_GAP);
    assert.equal(top, 200 + 24 - 90);
  });

  it("puts the panel's card to its left, and flips it when there is no room", () => {
    const anchor = box({ height: 900, left: 1100, top: 0, width: 340 });
    const placed = tourCardPosition(anchor, "left", VIEWPORT, CARD);
    assert.equal(placed.left, 1100 - GUIDE_CARD_GAP - CARD.width);
    // Centred on a full-height anchor is the viewport's own middle.
    assert.equal(placed.top, Math.round(VIEWPORT.height / 2 - CARD.height / 2));

    // A viewport too narrow to hold the card on the left of a near-left anchor
    // puts it on the right instead of through the edge.
    const narrow = { height: 700, width: 420 };
    const flipped = tourCardPosition(box({ left: 20, width: 100 }), "left", narrow, CARD);
    assert.ok(flipped.left >= GUIDE_VIEWPORT_MARGIN);
    assert.ok(flipped.left + CARD.width <= narrow.width - GUIDE_VIEWPORT_MARGIN);
  });

  it("centres the card when the element it introduces is not on screen", () => {
    // A narrow window hides the panel outright; the card still has to be read.
    const { left, top } = tourCardPosition(undefined, "left", VIEWPORT, CARD);
    assert.equal(left, Math.round((VIEWPORT.width - CARD.width) / 2));
    assert.equal(top, Math.round((VIEWPORT.height - CARD.height) / 2));
  });

  it("never returns a negative or overflowing position", () => {
    const positions = [
      tourCardPosition(box({ height: 2000, left: 0, top: 0, width: 2000 }), "above", VIEWPORT, CARD),
      tourCardPosition(box({ height: 20, left: 1430, top: 890, width: 10 }), "right", VIEWPORT, CARD),
      tourCardPosition(box({ height: 20, left: 1, top: 1, width: 10 }), "left", VIEWPORT, CARD),
    ];
    for (const position of positions) {
      assert.ok(position.left >= GUIDE_VIEWPORT_MARGIN, `left ${position.left} is off screen`);
      assert.ok(position.top >= GUIDE_VIEWPORT_MARGIN, `top ${position.top} is off screen`);
      assert.ok(position.left + CARD.width <= VIEWPORT.width - GUIDE_VIEWPORT_MARGIN, `left ${position.left} overflows`);
      assert.ok(position.top + CARD.height <= VIEWPORT.height - GUIDE_VIEWPORT_MARGIN, `top ${position.top} overflows`);
    }
  });
});
