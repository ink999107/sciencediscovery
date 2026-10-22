# Frontend: `apps/desktop`

`apps/desktop` is a second React workbench in the same workspace, built from the v0.1 design. It is intended to replace `apps/web`, and it is what the Electron shell loads. `apps/web` still owns the root path until `SCIENCE_AGENT_WEB_DIR` is changed; both front ends are served by the same control API and share one token key, so switching between them needs no second sign-in.

## 1. Stack and relationship to `apps/web`

- React 19, Vite, `@vitejs/plugin-react`, plain CSS; no router, no state library, no UI kit — the same constraints as `apps/web`.
- Markdown through `react-markdown` and `remark-gfm` only.
- Types come from `@sciencediscovery/schema` through `src/api/types.ts`, which re-exports them with `import type`. That re-export is what keeps the schema barrel out of the browser bundle; adding a value import there would pull the whole catalog into `dist`.
- `apps/desktop` depends on no service and on no other app. The architecture checker treats `apps/*` as hosts, so this direction is the allowed one and packages may never reach back into it.

## 2. Source layout

| Path | Purpose |
|---|---|
| `src/main.tsx` | entry: consume `#token=`, then mount |
| `src/App.tsx` | boot gate (auth / loading / offline / wizard / shell) and the two-column assembly |
| `src/local-access-token.ts` | fragment to `localStorage["sciencediscovery-token"]`, then strip the fragment |
| `src/api/` | `client.ts`, `stream.ts`, `models.ts`, `sessions.ts`, `types.ts` |
| `src/app/use-workspace.ts` | all app state and every write; the only place that owns ordering |
| `src/app/bootstrap.ts` | the two startup decisions: connection state, and which model to adopt as default |
| `src/app/session-order.ts` | the sidebar's order rule, kept pure |
| `src/app/tool-io.ts` | a tool's input and output split for display: one labelled section per value, by the shape the value has rather than the name it was given; kept pure |
| `src/run-stream/` | `model.ts` (state shape, text merging), `reducer.ts` (event fold), `permission.ts` (which requests are still open, and which a grant would cover) and `replay.ts` (a finished run rebuilt from its events, and where it goes in the transcript) |
| `src/views/` | one file per surface: `Sidebar`, `SessionBar`, `Conversation`, `AssistantTurn`, `Composer`, `SetupWizard`, `ModelForm`, plus dialogs |
| `src/text.ts` | the active language, its store, and the `TEXT` proxy every component reads |
| `src/text/zh.ts`, `src/text/en.ts` | every user-visible string in the two languages; `Text` is `typeof ZH`, so the English dictionary is checked key for key against the Chinese one |
| `src/styles/` | the design's cascade, split at the prototype's own section markers |

## 3. Server communication

Requests go through `ApiClient`, which injects `authorization: Bearer <token>` and turns a non-2xx into an `ApiRequestError` carrying the server's own `error`, `code` and `details`. `PUT /api/settings` is a whole-object write, so `setGlobalModel()` always reads first and sends every existing override back with the one field changed; anything omitted would be erased through `store.replaceGlobalSettings`.

Streams use `fetch` plus `body.getReader()`, never `EventSource`, because the token has to travel in a header. `SseFrameDecoder` frames on the blank line, ignores `:` keep-alives, and holds a partial frame until its terminator arrives — a chunk boundary can land anywhere, including between `\r` and `\n`. Frames carry `id: <n>`, which is the `?after=` replay cursor; a reconnect resumes from the largest one seen rather than replaying the whole run.

The two stream entry points differ in what they mean:

| Call | Meaning |
|---|---|
| `POST /api/sessions/:id/messages` | sends one message and streams the run it starts; the server closes the response at the terminal status, so the end of the body is the end of the run |
| `GET /api/sessions/:id/runs/:runId/events?after=N` | follows an existing run as SSE; the same URL read as JSON is the replay of a finished run, and rebuilding a timeline uses that one because it ends by itself instead of on a stream that has to be closed |

A client disconnect cancels nothing. Only `POST /api/sessions/:id/runs/(:runId|current)/cancel` stops a run, which is why the composer's stop button is the only way out of a live turn. Leaving a session mid-run is therefore allowed: the run keeps going on the server, and opening that session again replays it and resumes following the live one. Switching away while a turn runs is how a user gets on with something else, so neither the sidebar nor the new-session button is disabled for it.

The 新增会话 button creates the Session at **click time** with `POST /api/projects/:id/sessions`, rather than waiting for the first message. The sidebar lists what the server has, so a draft that exists only in the interface makes the button look dead and makes the first message look like it conjured a second Session out of nowhere; creating first means the click, the sidebar and the composer are talking about the same Session from the first second. Sending a first message with no Session open takes the same creation path, so the two entry points produce one Session, not one each; a repeated click while that request is in flight shares the same request. Deleting the open Session returns to the no-session draft, and the next message creates one — conjuring a replacement empty Session after a deletion is not this app's call to make.

The 最近 list holds every Session rather than stopping at a fixed count: it takes the height the sidebar has left and, when that runs out, scrolls on its own with a vertical bar on the list's right edge, while the brand and 新增会话 stay put — hiding a Session that still exists reads as having been deleted. The list scrolls on one axis only: `overflow-y: auto` computes the other axis to `auto` as well, so one row a little too wide would put a horizontal bar along the bottom; `overflow-x` is therefore `hidden`, and the bar itself is a thin 8 px rail.

## 4. Event-to-UI mapping

| Event | UI |
|---|---|
| `run.queued`, `run.started` | run id and model name; the `POST` that starts a run never returns an id, so it is picked up here |
| `assistant.thinking.delta`, `assistant.thinking.snapshot` | the collapsed 思考过程 block; a snapshot replaces, a delta appends, and a truncated snapshot never shortens what is already on screen |
| `assistant.response.started`, `assistant.delta`, `assistant.snapshot` | one body block per model invocation, so a turn interrupted by a tool call renders as two |
| `assistant.response.settled` | the block stops showing a spinner |
| `run.status` | terminal-ness, using the same status set the server closes the response on; the run it carries also brings `startedAt` and `finishedAt`, which is where the fold's elapsed time comes from |
| `run.completed` | the persisted message wins over the assembled deltas; the streamed blocks are sealed |
| `run.failed`, `run.cancelled` | failure code and cancellation reason in the run status line |
| `run.history.truncated` | a note that earlier events could not be replayed |
| `tool.started`, `tool.completed` | a 工具调用 card, woven between the answer blocks at the index the call was made from |
| `permission.required`, `permission.resolved` | a 需要权限 card with three answers, keyed by request id so a redelivered snapshot cannot undo a decision |
| `artifact.*`, `plan.*`, `subagent.*`, `agent.*`, `session.updated` | deliberately deferred; counted in a separate set so they do not inflate the unknown-event counter |

Two events need more than a row. Tool calls are *placed* rather than listed: an `AssistantTool` records `after`, the index of the `responses` entry it followed, with `-1` for "before the first". Read the direction carefully: `after === i` puts the call *after* the i-th answer, because the value is recorded as `responses.length - 1` when `tool.started` arrives, and at that moment the model has just finished that answer. Treating it as "insert before the i-th" renders a tool card ahead of the sentence it explains. What the index buys is the shape of an agent loop: the model says something, calls a tool and is re-invoked. `tool.completed` does not repeat the arguments, so the reducer carries them forward from the start event; older records that do ship them again win the spread.

The layout is two sides of a conversation: the reader's own turn sits on the right with a default grey silhouette for an avatar — a shape rather than the character that used to stand for the reader, which read as a role badge — while the model's answer stays on the left under the model name's initial. The user turn's body comes *before* its avatar in the DOM and the grid places it in the right-hand column with the avatar on the outer edge, so a screen reader and a narrow window reach the text before the decoration. The bubble shrinks to its content and stops at 560 px rather than spanning the column.

Everything a run does between the question and its answer is folded into a single line, and the fold is closed from the press rather than at the end: a hundred-turn run costs one line of transcript instead of a hundred, and the line is there while the run is going instead of appearing once the answer starts. For a message just sent, the pending message is what renders it — a second after the press rather than in the same frame, because a placeholder that lands with the press reads as a canned animation rather than as a receipt, and anything the stream has actually produced is drawn at once. Its title says 正在思考 while the run is live — with a ring turning beside it, the one moving icon in the transcript, so the line says work is happening without the reader having to trust a still glyph — and 排队中 or 等待授权 when the run is waiting rather than working, where the glyph stays still because waiting is not working. Once the run is over the line reads 用时 12 分 3 秒, measured from the `startedAt` and `finishedAt` the run carried, and the ring is gone. A run with no measured span, recorded before those times existed, falls back to its status word. The streaming indicator belongs to a *response*, not to a turn: only the response whose `settled` is still false spins. Asking "is this the turn's last response" marks every turn, because every turn has a last response of its own.

Two things are deliberately outside the fold. The answer: the last response in the whole run that produced any prose, so the model can be re-invoked a dozen times and the user still watches the sentence they are waiting for grow in place, spinner and all — and, while the run is live, that has to be a response of the *newest* turn, or the sentence that introduced a running tool call would be shown as the result for as long as the tool runs and then pulled back into the fold. And an unanswered authorization card, which is a question addressed to the reader: a question folded shut behind a summary is a run that appears to have stopped for no reason. A plain question and answer has nothing in between, so it gets no line at all; and a run that left nothing at all — one that opened a turn and streamed no prose, a gateway rejection being the usual way — does not get the model-name row either, only its status line, since the alternative is a second avatar over an empty body.

And a tool's output is not in the run state at all. It is written to a substream of its own, `tool-<toolCallId>`, and the card reads it once, on first open, from `GET /api/sessions/:id/runs/:runId/streams/:streamId/events` — the one JSON read among the SSE ones, because it is a different stream. A run replayed with `?after=0` contains no `tool.output` at all, only the `tool.completed` trace pointing at the substream, which is why the trace is what carries the pointer. The live response *does* fan those frames out, and they carry no `id:` line; they are dropped in a set of their own so they neither count as unknown events nor advance the replay cursor.

Thinking has no persisted form: `ChatMessage` carries only the final text. So opening a session replays its runs and renders each reconstruction in the place of the answer that run wrote — falling back to the stored message when the replay yields nothing visible, which is what keeps a reconnect that found no events from rendering a blank answer.

*Every* finished run is replayed, not just the newest, and each is a state of its own: the reducer keys a turn by the number the event carries, and those numbers restart at 1 for every run, so folding two runs into one state would quietly merge the second run's first turn into the first run's. A session that took several turns therefore has one replay per turn — a run interrupted by an automatic wake is replayed on its own side of the wake notice, with its own thinking and its own tool calls, instead of leaving a bare answer behind. Since the turn numbers come from the server and restart per run, two segments of one transcript can both start at 第 1 轮; the numbering is not re-based, because a continuous count would print numbers the server never produced.

Placement is by message: a reconstruction takes the place of the answer its run wrote, and a run that never wrote one — cancelled first — goes after the message that started it. Only a run matching neither is left for the end of the transcript. The run still streaming has no persisted answer yet, so it renders last until the next `settle` re-reads the session and folds it in with the rest.

The wake notice itself is no longer drawn. An automatic wake carries no user-authored body — the schema keeps the model-facing prompt out of `content` precisely so a wake is never shown as something the user typed — so its card was a blank strip with an avatar, saying nothing the run below it does not say better. But the message stays in `messages` all the same: it is where the run the wake started is anchored, and dropping it would send that run to the end of the transcript instead of to the place it happened.

Two questions are asked of a replay, and they are not the same one. Whether it is worth holding at all: a run with no persisted events folds to a state with nothing in it, and holding that would hang an empty turn in the transcript. And whether it may stand in for a stored answer: only an answer can, so a run that failed or was cancelled before saying anything keeps its status line — the whole account of what became of it — while the stored message stays where it is. Losing that distinction is what makes a failed run leave no trace at all.

## 5. First run

`GET /api/models` returning an empty list is the first-run condition, because nothing can be sent without a model. The wizard then walks provider configuration and a data-location note, and the model step must pass `POST /api/models/:id/test` before the shell becomes reachable.

The order below is fixed by the API, not by preference: `PUT /api/settings` normalizes through the live model catalog and drops a `modelId` naming no existing profile.

1. `POST /api/providers` — or `PUT /api/providers/:id` when the base URL already has a provider, so a corrected key does not leave a duplicate behind.
2. `POST /api/providers/:id/models` — `{model}` is the only required field; a hand-typed name lands on the same path as a discovered one.
3. `POST /api/models/:id/test`.
4. `PUT /api/settings` with the merged overrides.

The listing button uses `POST /api/providers/preview-models`, which fetches from the form's endpoint and key and persists nothing — `GET /api/providers/:id/models` would require saving a half-filled provider first. A gateway that cannot list models is expected; the model name can always be typed.

A preset supplies `apiProtocol` and `apiVariant`; only the custom branch asks for a protocol, because a wrong variant against a right URL reads as a broken key.

The data directory is recorded in `localStorage` and displayed, not applied: no route reports or changes the live data directory, which comes from the service's launch arguments. The setup wizard says so.

Model configuration outside the first run is deliberately absent from this layer: the shell offers the configured models in the composer's pill, but the settings surface that adds or tests a profile afterwards is not part of it.

## 6. Development and tests

```bash
pnpm --filter @sciencediscovery/desktop dev      # 127.0.0.1:5174, /api and /health proxied to 4310
pnpm --filter @sciencediscovery/desktop test     # tsx --test tests/*.test.ts
pnpm --filter @sciencediscovery/desktop build    # -> apps/desktop/dist
pnpm --filter @sciencediscovery/desktop exec vite preview   # built output on 4174, same proxies
```

`localStorage` is per origin, so the token has to be injected once per front end: open `http://127.0.0.1:5174/#token=<token>` the first time. The token key is shared with `apps/web`, so on the same origin no re-injection is needed.

Serving this app at the root path instead of the built-in one is a restart with `SCIENCE_AGENT_WEB_DIR=apps/desktop/dist`; the static directory is read at boot.

Tests cover the transport (bearer header, 401 classification, SSE framing including comment frames and split chunks), the reducer (thinking and body folding, snapshot-versus-delta, truncated snapshots, terminal close, counters, permission requests and their resolution, tool traces, and the run times the fold's elapsed line is measured from — recorded once and never moved by a later snapshot), the replay layer (folding a log into a closed state, the three anchors a reconstruction can land on, and which runs are worth holding at all — an empty log is not, and a run that failed before answering keeps its status line without hiding the stored message), the transcript merge itself (a replayed run replacing its own answer in place, a run with no replay keeping its persisted answer, a run with no answer following the message that started it, a replayed run's unanswered authorization rendering disabled, the streaming run staying last, a message just sent showing its own text at once while the run's placeholder waits its beat, and a wake notice drawing no card while the run it started keeps its place), the fold (its line saying 正在思考 while the run works and 用时 … once it stops, a ring turning on that line only while the model is actually working and never while it is queued or over, falling back to a status word with no measured span, the thinking and the tool calls going inside it, and an unanswered authorization or a running tool call's sentence staying outside it), the tool card's two pure layers (the primary field picked by name rather than position, a single argument shown as its bare value, a labeled result split into sections with the leading text kept as a residual, the residual labelled Error when the call failed, and runner placeholders dropped rather than shown as data), the startup decisions (empty catalog, an existing default is not rewritten, a default naming a deleted profile is replaced), the sidebar's recency order, and the composer's model pill.

## Related documentation

- [Web frontend](web-frontend.md) — the current root front end
- [Control plane](control-plane.md) — the routes and their contract
- [Configuration reference](../reference/configuration.md) — `SCIENCE_AGENT_WEB_DIR` and `SCIENCE_AGENT_AUTH_TOKEN`
