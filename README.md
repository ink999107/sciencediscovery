# PR #814 — evidence

Visual evidence for the desktop program-evolution surfaces, captured from
`feat/desktop-evolve-lab` at `8636082fa87a427c3af70e5a3785a262cf59c86a` with
the desktop Playwright suite (`apps/desktop/e2e`) against its mocked API.
Not product code: this branch exists only to host the images.

These are browser captures of `apps/desktop`, not of the packaged Windows
installer. The whole UI (copy, layout, states) is the shipping client; the run
data behind it is the suite's fixture — one live PUCT search with one accepted
candidate — not a real model call.

Every state is captured in Chinese and English. The window is 1440×900 except
`*-11-result-panel-narrow-inspector`, which is 1000×760 to put the inspector
into its drawer form.

## Screenshots

| State | What it shows |
| --- | --- |
| `*-1-create-dialog` | The create dialog opened from the header capsule: goal field, search choice, the checkpoint switch on by default |
| `*-2-create-dialog-no-isolation` | The same dialog on a host that reports no sandbox (`direct`): the warning sits under the title, before any field |
| `*-3-no-isolation-confirm` | Starting that run asks once more, over the dialog; `返回` sends nothing, `仍然继续` is the only way the flag leaves |
| `*-4-checkpoint-open` | A checkpoint card in the transcript, unreplied — the page, and the card itself in `*-4a` |
| `*-5-checkpoint-folded` | The same card after it was answered: one folded row, `已回答` — `*-5a` for the card |
| `*-6-checkpoint-auto` | An `auto` card: the step is shown, but there is nothing to press — `*-6a` for the card |
| `*-7-session-shelf` | The shelf under the session header: the running search with its phase counter, and `新建实验` |
| `*-8-header-no-evolve` | A session that never used evolve: no shelf, the header capsule unchanged |
| `*-9-result-panel` | The result panel: score chart and candidate table |
| `*-10-result-panel-candidate` | One candidate selected: inspector with its scores and the diff against its parent |
| `*-11-result-panel-narrow-inspector` | The same selection on a narrow window, where the inspector becomes a drawer |

File name pattern: `<zh|en>-<n>-<state>.png`.
