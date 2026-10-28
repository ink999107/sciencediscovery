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

/**
 * The first-run guide: three cards over the parts of the task page a new user
 * has to find, and the arithmetic that keeps each card off the thing it is
 * pointing at.
 *
 * Nothing here touches the DOM. The component measures a rectangle, this file
 * decides where the card goes, so the placement can be tested without a
 * browser and the two halves cannot drift.
 */

/** The parts of the page the guide introduces, in the order it walk them. The
 *  key is also the `data-guide` value the shell puts on each element. */
export type GuideKey = "composer" | "settings" | "panel";

/** Which side of the anchored element the card prefers. A card that does not
 *  fit on that side goes to the opposite one rather than off the screen. */
export type GuidePlacement = "above" | "left" | "right";

export interface GuideStep {
  key: GuideKey;
  placement: GuidePlacement;
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  // The composer is the bottom edge of the middle column, so its card goes
  // above it, over the transcript nobody has written yet.
  { key: "composer", placement: "above" },
  // The rail is the left edge; its card goes into the column beside it.
  { key: "settings", placement: "right" },
  // The panel is the right edge; its card goes into the conversation.
  { key: "panel", placement: "left" },
];

/** How far the spotlight is drawn outside the element it highlights, so the
 *  ring reads as a frame rather than as a border on the element itself. */
export const GUIDE_SPOT_PADDING = 8;
/** The space the card keeps from the element it points at. */
export const GUIDE_CARD_GAP = 14;
/** The space the card keeps from the window's edges. */
export const GUIDE_VIEWPORT_MARGIN = 16;

export interface Box {
  height: number;
  left: number;
  top: number;
  width: number;
}

/** The attribute the shell marks each introduced element with. It is a data
 *  attribute rather than a class because a class is styling and may move,
 *  while this is a promise the guide makes about that element. */
export function guideAnchor(key: GuideKey): string {
  return `[data-guide="${key}"]`;
}

export function spotlightBox(anchor: Box): Box {
  return {
    height: anchor.height + GUIDE_SPOT_PADDING * 2,
    left: anchor.left - GUIDE_SPOT_PADDING,
    top: anchor.top - GUIDE_SPOT_PADDING,
    width: anchor.width + GUIDE_SPOT_PADDING * 2,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Where the card goes.
 *
 * `anchor` is absent when the element is not on screen — a narrow window hides
 * the panel outright — and the card is then centred, because a step the reader
 * cannot see the subject of is still a step they can read.
 */
export function tourCardPosition(
  anchor: Box | undefined,
  placement: GuidePlacement,
  viewport: { height: number; width: number },
  card: { height: number; width: number },
): { left: number; top: number } {
  const margin = GUIDE_VIEWPORT_MARGIN;
  const maxLeft = viewport.width - margin - card.width;
  const maxTop = viewport.height - margin - card.height;

  if (anchor === undefined || card.width <= 0 || viewport.width <= 0) {
    return {
      left: Math.round(clamp((viewport.width - card.width) / 2, margin, maxLeft)),
      top: Math.round(clamp((viewport.height - card.height) / 2, margin, maxTop)),
    };
  }

  if (placement === "above") {
    const centred = clamp(
      anchor.left + anchor.width / 2 - card.width / 2,
      margin,
      maxLeft,
    );
    const above = anchor.top - GUIDE_CARD_GAP - card.height;
    return {
      left: Math.round(centred),
      // The composer sits on the bottom edge, so "above" is the only side with
      // room; the flip is for a short window, where the card would otherwise
      // overlap the title bar.
      top: Math.round(above >= margin ? above : Math.min(anchor.top + anchor.height + GUIDE_CARD_GAP, maxTop)),
    };
  }

  const centredTop = clamp(
    anchor.top + anchor.height / 2 - card.height / 2,
    margin,
    maxTop,
  );

  if (placement === "right") {
    const right = anchor.left + anchor.width + GUIDE_CARD_GAP;
    return {
      left: Math.round(right <= maxLeft ? right : maxLeft),
      top: Math.round(centredTop),
    };
  }

  const left = anchor.left - GUIDE_CARD_GAP - card.width;
  // Flipping to the far side keeps the card on screen; without the flip a
  // narrow window would push it out through the left edge, where the backdrop
  // is the only thing to see.
  return {
    left: Math.round(left >= margin ? left : Math.min(anchor.left + anchor.width + GUIDE_CARD_GAP, maxLeft)),
    top: Math.round(centredTop),
  };
}
