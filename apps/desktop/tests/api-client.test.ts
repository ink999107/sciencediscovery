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

import { ApiClient, ApiRequestError, isAbortError, isAuthFailure } from "../src/api/client.js";
import { SseFrameDecoder } from "../src/api/stream.js";

/** Replace `globalThis.fetch` for one test, restore it afterwards, and hand
 *  back what the client actually sent. */
async function withFetch(
  handler: (url: string, init: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
): Promise<{ init: RequestInit; url: string }[]> {
  const original = globalThis.fetch;
  const calls: { init: RequestInit; url: string }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const resolved = init ?? {};
    calls.push({ init: resolved, url });
    return handler(url, resolved);
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
  return calls;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

test("every request carries the bearer token, including streamed ones", async () => {
  const seen: RequestInit[] = [];
  const client = new ApiClient("secret-token");

  await withFetch(
    (_url, init) => {
      seen.push(init);
      return Promise.resolve(jsonResponse({ ok: true }));
    },
    async () => {
      await client.request("/api/models");
      await client.request("/api/sessions", { body: "{}", method: "POST" });
      await client.fetchStream("/api/sessions/one/runs/two/events?after=0");
    },
  );

  assert.equal(seen.length, 3);
  const headers = (init: RequestInit | undefined) =>
    (init?.headers ?? {}) as Record<string, string>;
  assert.equal(headers(seen[0]).authorization, "Bearer secret-token");
  assert.equal(headers(seen[1]).authorization, "Bearer secret-token");
  assert.equal(headers(seen[2]).authorization, "Bearer secret-token");
  // Only a body gets a content-type: an SSE GET with one would be wrong.
  assert.equal(headers(seen[0])["content-type"], undefined);
  assert.equal(headers(seen[1])["content-type"], "application/json");
  assert.equal(headers(seen[2])["content-type"], undefined);
});

test("a 401 is reported to the caller and stays distinguishable from other failures", async () => {
  let rejected = 0;
  const client = new ApiClient("stale", () => {
    rejected += 1;
  });

  await withFetch(
    () => Promise.resolve(jsonResponse({ error: "unauthorized" }, 401)),
    async () => {
      await assert.rejects(
        () => client.request("/api/models"),
        (reason: unknown) => {
          assert.ok(isAuthFailure(reason));
          const error = reason as ApiRequestError;
          assert.equal(error.status, 401);
          assert.equal(error.message, "unauthorized");
          return true;
        },
      );
    },
  );
  assert.equal(rejected, 1);

  await withFetch(
    () => Promise.resolve(jsonResponse({ error: "boom" }, 500)),
    async () => {
      await assert.rejects(
        () => client.request("/api/models"),
        (reason: unknown) => {
          // A 5xx must never be mistaken for a credential problem: the two lead
          // to opposite instructions.
          assert.equal(isAuthFailure(reason), false);
          return true;
        },
      );
    },
  );
  assert.equal(rejected, 1);
});

test("a non-JSON error body still produces a readable message", async () => {
  const client = new ApiClient("t");
  await withFetch(
    () => Promise.resolve(new Response("<html>502</html>", { status: 502 })),
    async () => {
      await assert.rejects(
        () => client.request("/api/models"),
        (reason: unknown) => {
          assert.equal((reason as ApiRequestError).message, "Request failed (502)");
          return true;
        },
      );
    },
  );
});

test("the error code and details survive so a caller can act on them", async () => {
  const client = new ApiClient("t");
  await withFetch(
    () =>
      Promise.resolve(
        jsonResponse({ code: "run_active", details: { sessions: ["a"] }, error: "busy" }, 409),
      ),
    async () => {
      await assert.rejects(
        () => client.request("/api/projects/p", { method: "DELETE" }),
        (reason: unknown) => {
          const error = reason as ApiRequestError;
          assert.equal(error.code, "run_active");
          assert.deepEqual(error.details, { sessions: ["a"] });
          return true;
        },
      );
    },
  );
});

test("frames split across chunk boundaries are held until the blank line", () => {
  const decoder = new SseFrameDecoder();
  // A boundary can land mid-number, mid-JSON, or between \r and \n.
  assert.deepEqual(decoder.push("id: 1\ndata: {\"type\":\"run.que"), []);
  assert.deepEqual(decoder.push("ued\"}\n\n"), [{ data: '{"type":"run.queued"}', id: 1 }]);
  assert.deepEqual(decoder.push("id: 2\r\ndata: {}\r\n\r\n"), [{ data: "{}", id: 2 }]);
});

test("several frames in one chunk arrive in order", () => {
  const decoder = new SseFrameDecoder();
  const frames = decoder.push("id: 1\ndata: a\n\nid: 2\ndata: b\n\nid: 3\ndata: c\n\n");
  assert.deepEqual(frames, [
    { data: "a", id: 1 },
    { data: "b", id: 2 },
    { data: "c", id: 3 },
  ]);
});

test("comment keep-alives carry no event and do not advance the cursor", () => {
  const decoder = new SseFrameDecoder();
  // `: ping` is what the server sends while a run is quiet. Emitting it as an
  // event would make the reducer count it as unknown; worse, treating it as a
  // frame would reset the replay cursor.
  assert.deepEqual(decoder.push(": ping\n\n"), []);
  assert.deepEqual(decoder.push(": ping\nid: 7\ndata: x\n\n"), [{ data: "x", id: 7 }]);
});

test("a stream that ends without a final blank line still yields its last frame", () => {
  const decoder = new SseFrameDecoder();
  assert.deepEqual(decoder.push("id: 9\ndata: tail"), []);
  assert.deepEqual(decoder.flush(), [{ data: "tail", id: 9 }]);
  // Flushing twice must not re-emit.
  assert.deepEqual(decoder.flush(), []);
});

test("a frame with no id keeps its data and reports no cursor", () => {
  const decoder = new SseFrameDecoder();
  assert.deepEqual(decoder.push("data: no-id\n\n"), [{ data: "no-id" }]);
});

test("multi-line data fields are joined the way SSE specifies", () => {
  const decoder = new SseFrameDecoder();
  assert.deepEqual(decoder.push("data: one\ndata: two\n\n"), [{ data: "one\ntwo" }]);
});

test("abort detection is by name, which is all fetch guarantees", () => {
  const abort = new Error("aborted");
  abort.name = "AbortError";
  assert.equal(isAbortError(abort), true);
  assert.equal(isAbortError(new Error("boom")), false);
  assert.equal(isAbortError(undefined), false);
});
