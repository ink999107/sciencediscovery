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

import { useCallback, useEffect, useRef, useState } from "react";

import {
  GUIDE_STEPS,
  guideAnchor,
  spotlightBox,
  tourCardPosition,
  type Box,
  type GuideStep,
} from "../app/guide.js";
import { TEXT } from "../text.js";

interface Props {
  /** Ends the tour. 跳过 on the first card and 开始使用 on the last one are the
   *  same write — that it was read is all the app remembers. */
  onClose: () => void;
  /** The card that is showing. The right panel has to be open to be pointed
   *  at, and only the shell can open it, so every step is announced once. */
  onStep: (step: GuideStep) => void;
}

/**
 * The first-run guide: one card per part of the task page, each beside a
 * spotlight on the element it introduces.
 *
 * The card is positioned from measured rectangles rather than by nesting
 * itself in the shell, because the three things it points at live in three
 * different columns of a grid it does not belong to. Measurement happens after
 * every step, since a step may have just opened (or closed) the panel it is
 * about.
 */
export function Guide({ onClose, onStep }: Props) {
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Box>();
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const cardRef = useRef<HTMLDivElement>(null);

  const step = GUIDE_STEPS[index] ?? GUIDE_STEPS[0]!;
  const last = index >= GUIDE_STEPS.length - 1;
  const text = TEXT.guide.steps[step.key];

  // Announced before the measurement below runs, because the step may be the
  // one that opens the panel: measuring first would place the card where the
  // panel is about to appear.
  useEffect(() => {
    onStep(step);
  }, [onStep, step]);

  useEffect(() => {
    const measure = () => {
      const node = document.querySelector(guideAnchor(step.key));
      const rect = node instanceof HTMLElement ? node.getBoundingClientRect() : undefined;
      // A panel the window has no room for is display: none; the card is then
      // centred instead of pointing at a zero-sized box in the corner.
      const anchor = rect !== undefined && (rect.width > 0 || rect.height > 0)
        ? { height: rect.height, left: rect.left, top: rect.top, width: rect.width }
        : undefined;
      const card = cardRef.current;
      setSpot(anchor === undefined ? undefined : spotlightBox(anchor));
      setPosition(
        tourCardPosition(
          anchor,
          step.placement,
          { height: window.innerHeight, width: window.innerWidth },
          card === null
            ? { height: 0, width: 0 }
            : { height: card.offsetHeight, width: card.offsetWidth },
        ),
      );
    };

    measure();
    // One more frame, for the layout the step itself caused: opening the panel
    // changes the middle column's width in the same commit that renders this
    // card, and a first measurement can beat the browser to it.
    const frame = window.requestAnimationFrame(measure);
    // The panel is display: none until the step that opens it renders, which
    // can land after that frame. Watching the anchor itself is what catches
    // it: the element gaining a box is exactly the size change being watched
    // for, whichever render caused it.
    const anchorNode = document.querySelector(guideAnchor(step.key));
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    if (anchorNode !== null) observer?.observe(anchorNode);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  // The card takes focus rather than leaving it on whatever the user was
  // typing in: the tour is what the page is doing now, and a screen reader
  // announces the card when it is focused.
  useEffect(() => {
    cardRef.current?.focus();
  }, [index]);

  const goBack = useCallback(() => {
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    if (last) {
      onClose();
      return;
    }
    setIndex((current) => Math.min(current + 1, GUIDE_STEPS.length - 1));
  }, [last, onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goBack, goNext, onClose]);

  return (
    <div className={`tour-overlay${spot === undefined ? " is-bare" : ""}`}>
      {/* The dimming is the spotlight's own shadow; this layer takes the
          clicks, so a press outside the card neither reaches the page nor
          loses the guide behind it. */}
      <div aria-hidden="true" className="tour-backdrop" />
      {spot === undefined ? null : (
        <div
          aria-hidden="true"
          className="tour-spotlight"
          style={{ height: spot.height, left: spot.left, top: spot.top, width: spot.width }}
        />
      )}
      <div
        aria-label={TEXT.guide.label}
        className={`tour-card${position === undefined ? " is-measuring" : ""}`}
        ref={cardRef}
        role="dialog"
        style={position}
        tabIndex={-1}
      >
        <span className="tour-step">{TEXT.guide.step(index + 1, GUIDE_STEPS.length)}</span>
        <h3>{text.title}</h3>
        <p>{text.body}</p>
        <div className="tour-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            {TEXT.guide.skip}
          </button>
          {index > 0 ? (
            <button className="secondary-button" onClick={goBack} type="button">
              {TEXT.guide.back}
            </button>
          ) : null}
          <button className="primary-button" onClick={goNext} type="button">
            {last ? TEXT.guide.done : TEXT.guide.next}
          </button>
        </div>
      </div>
    </div>
  );
}
