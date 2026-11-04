# PR #854 — evidence

Visual evidence for the subagent-panel performance change, captured from the
head of `fix/subagent-panel-lag` with the desktop Playwright suite (`apps/desktop/e2e`),
against a mocked API. Not product code; this branch exists only to host the
images and the recordings.

## Screenshots

Each state is captured in Chinese and English, at the default 1440x900 window
with the default 720 px panel, and at the panel's minimum width (480 px).

| State | What it shows |
| --- | --- |
| `*-1-opened` | The record just opened: answer, task fold and timeline fold, both closed |
| `*-2-task` | The task fold open: the brief and its input files |
| `*-3-timeline` | The timeline open: every step row, no step body mounted |
| `*-4-tool-open` | One tool step open: a long line wraps inside its box |
| `*-5-stack-trace` | A failed tool step: the stack trace keeps its line breaks |
| `*-6-thinking` | A running thinking step open, the finished one above it folded |

File name pattern: `<zh|en>-<wide|narrow>-<state>.png`.

## Recordings

`panel-walkthrough-zh.webm` and `panel-walkthrough-en.webm` — about 39 s each,
uncut: open the run, open the record, open the task fold, open the timeline,
open a tool step, open a failed step, scroll to the thinking rows, collapse the
panel.

## Measurement

The measurement is in the product tree as `apps/desktop/e2e/panel-performance.spec.ts`.
It builds a 137-step record of 15 KB per step (about 2 MB), opens it, and prints
the click-to-visible time and the longest main-thread task to the test output.

Run, one worker, no other spec in the same run:

```
PLAYWRIGHT_BROWSERS_PATH=.e2e/browsers \
  apps/desktop/e2e/node_modules/.bin/playwright test \
  --config apps/desktop/e2e/playwright.config.ts \
  apps/desktop/e2e/panel-performance.spec.ts
```

| Tree | Click to visible | Longest main-thread task | Long tasks |
| --- | --- | --- | --- |
| `3fc77a3f0d` (reviewed base) | 3850 / 3902 / 3926 / 4120 ms | 2803 / 2835 / 2793 / 2882 ms | 2 |
| `5a80ef65` (this head) | 502 / 504 / 521 ms | 0 ms | 0 |

On the base tree the same spec also fails its mount assertion: 137 step rows
are in the DOM while every fold is closed. On this head it passes.

Under parallel load (this spec running beside the whole panel suite) the
click-to-visible number rises — 5010 ms in one such run — while the longest
main-thread task stays at 0 ms. The long task is the felt freeze; the wall
clock under shared CPU is not a stable number.
