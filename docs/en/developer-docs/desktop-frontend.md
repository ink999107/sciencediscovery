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
| `src/run-stream/` | `model.ts` (state shape, text merging) and `reducer.ts` (event fold) |
| `src/views/` | one file per surface: `Sidebar`, `SessionBar`, `Conversation`, `Composer`, `SetupWizard`, `ModelForm`, plus dialogs |
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
| `GET /api/sessions/:id/runs/:runId/events?after=N` | follows a run that is still going; opening a session whose newest run has not finished resumes here |

A client disconnect cancels nothing. Only `POST /api/sessions/:id/runs/(:runId|current)/cancel` stops a run, which is why the composer's stop button is the only way out of a live turn. Leaving a session mid-run is therefore allowed: the run keeps going on the server, and opening that session again resumes following it. Switching away while a turn runs is how a user gets on with something else, so neither the sidebar nor the new-session button is disabled for it.

The 新增会话 button creates the Session at **click time** with `POST /api/projects/:id/sessions`, rather than waiting for the first message. The sidebar lists what the server has, so a draft that exists only in the interface makes the button look dead and makes the first message look like it conjured a second Session out of nowhere; creating first means the click, the sidebar and the composer are talking about the same Session from the first second. Sending a first message with no Session open takes the same creation path, so the two entry points produce one Session, not one each; a repeated click while that request is in flight shares the same request. Deleting the open Session returns to the no-session draft, and the next message creates one — conjuring a replacement empty Session after a deletion is not this app's call to make.

The 最近 list holds every Session rather than stopping at a fixed count: it takes the height the sidebar has left and, when that runs out, scrolls on its own with a vertical bar on the list's right edge, while the brand and 新增会话 stay put — hiding a Session that still exists reads as having been deleted. The list scrolls on one axis only: `overflow-y: auto` computes the other axis to `auto` as well, so one row a little too wide would put a horizontal bar along the bottom; `overflow-x` is therefore `hidden`, and the bar itself is a thin 8 px rail.

## 4. Event-to-UI mapping

| Event | UI |
|---|---|
| `run.queued`, `run.started` | run id and model name; the `POST` that starts a run never returns an id, so it is picked up here |
| `assistant.thinking.delta`, `assistant.thinking.snapshot` | the collapsed 思考过程 block; a snapshot replaces, a delta appends, and a truncated snapshot never shortens what is already on screen |
| `assistant.response.started`, `assistant.delta`, `assistant.snapshot` | one body block per model invocation, so a turn interrupted by a tool call renders as two |
| `assistant.response.settled` | the block stops showing a spinner |
| `run.status` | terminal-ness, using the same status set the server closes the response on |
| `run.completed` | the persisted message wins over the assembled deltas; the streamed blocks are sealed |
| `run.failed`, `run.cancelled` | failure code and cancellation reason in the run status line |
| `run.history.truncated` | a note that earlier events could not be replayed |
| `artifact.*`, `plan.*`, `subagent.*`, `agent.*`, `session.updated` | deliberately deferred; counted in a separate set so they do not inflate the unknown-event counter |

The layout is two sides of a conversation: the reader's own turn sits on the right with a default grey silhouette for an avatar — a shape rather than the character that used to stand for the reader, which read as a role badge — while the model's answer stays on the left under the model name's initial. The user turn's body comes *before* its avatar in the DOM and the grid places it in the right-hand column with the avatar on the outer edge, so a screen reader and a narrow window reach the text before the decoration. The bubble shrinks to its content and stops at 560 px rather than spanning the column.

The run in flight is appended after the persisted transcript and cleared again by the post-run re-read, so its answer appears once. For a message just sent, the pending message is what renders it — a second after the press rather than in the same frame, because a placeholder that lands with the press reads as a canned animation rather than as a receipt, and anything the stream has actually produced is drawn at once. The streaming indicator belongs to a *response*, not to a turn: only the response whose `settled` is still false spins. Asking "is this the turn's last response" marks every turn, because every turn has a last response of its own.

The wake notice is not drawn. An automatic wake carries no user-authored body — the schema keeps the model-facing prompt out of `content` precisely so a wake is never shown as something the user typed — so its card was a blank strip with an avatar, saying nothing the run below it does not say better. The message stays in `messages` all the same; it is part of the transcript the server persisted.

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

Tests cover the transport (bearer header, 401 classification, SSE framing including comment frames and split chunks), the reducer (thinking and body folding, snapshot-versus-delta, truncated snapshots, terminal close, counters, and the replay cursor that only moves forward), the startup decisions (empty catalog, an existing default is not rewritten, a default naming a deleted profile is replaced), the sidebar's recency order, the transcript (the streaming run staying last, a message just sent showing its own text at once while the run's placeholder waits its beat, a wake notice drawing no card, and the reader's turn carrying the default silhouette with its text ahead of the avatar in the DOM), and the composer's model pill.

## Related documentation

- [Web frontend](web-frontend.md) — the current root front end
- [Control plane](control-plane.md) — the routes and their contract
- [Configuration reference](../reference/configuration.md) — `SCIENCE_AGENT_WEB_DIR` and `SCIENCE_AGENT_AUTH_TOKEN`
