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
const { after, test } = createTest(import.meta.url, { tags: ["category:ut", "os:linux", "arch:amd64", "arch:arm64"] });
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { MAX_UNIX_SOCKET_PATH_BYTES } from "./egress-gateway.js";
import {
  egressSocketDirectoryName,
  resolveEgressSocketDirectory,
} from "./egress-socket-root.js";

const temporaryDirectories: string[] = [];

async function scratchDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "sciencediscovery-egress-root-"));
  temporaryDirectories.push(directory);
  return directory;
}

after(async () => {
  for (const directory of temporaryDirectories) await rm(directory, { force: true, recursive: true });
});

const uid = process.getuid?.();

test("a deep data directory no longer decides where the socket lives", async () => {
  const base = await scratchDirectory();
  // Long enough that the historical `<dataDir>/eg/<digest>` layout cannot fit.
  const dataDir = join(base, "x".repeat(MAX_UNIX_SOCKET_PATH_BYTES));
  const root = await resolveEgressSocketDirectory({
    candidates: [{ base, source: "xdg-runtime" }],
    dataDir,
    uid,
  });

  assert.equal(root.source, "xdg-runtime");
  assert.equal(root.directory, join(base, egressSocketDirectoryName(dataDir, uid)));
  assert.equal((await stat(root.directory)).isDirectory(), true);
  assert.ok(Buffer.byteLength(join(root.directory, "0".repeat(16))) <= MAX_UNIX_SOCKET_PATH_BYTES);
});

test("the socket directory is private to the runner user", async () => {
  const base = await scratchDirectory();
  const dataDir = join(base, "data");
  const name = egressSocketDirectoryName(dataDir, uid);
  // A looser pre-existing directory is tightened, not reused as-is.
  await mkdir(join(base, name), { mode: 0o755, recursive: true });

  const root = await resolveEgressSocketDirectory({
    candidates: [{ base, source: "xdg-runtime" }],
    dataDir,
    probe: false,
    uid,
  });

  assert.equal(root.directory, join(base, name));
  assert.equal((await stat(root.directory)).mode & 0o077, 0);
});

test("a directory owned by another user is skipped", async () => {
  const base = await scratchDirectory();
  const dataDir = join(base, "data");
  const otherUid = (uid ?? 0) + 1;
  // The name uses the requested owner, but the directory was created by this
  // user: the ownership check must refuse it rather than bind inside it.
  await mkdir(join(base, egressSocketDirectoryName(dataDir, otherUid)), { mode: 0o700, recursive: true });

  const root = await resolveEgressSocketDirectory({
    candidates: [{ base, source: "xdg-runtime" }],
    dataDir,
    probe: false,
    uid: otherUid,
  });

  assert.equal(root.source, "data-directory");
  assert.equal(root.directory, resolve(dataDir, "eg"));
});

test("a candidate base that is not a directory is skipped", async () => {
  const base = await scratchDirectory();
  const dataDir = join(base, "data");
  const blocked = join(base, "blocked");
  await writeFile(blocked, "not a directory");

  const root = await resolveEgressSocketDirectory({
    candidates: [{ base: blocked, source: "xdg-runtime" }],
    dataDir,
    probe: false,
    uid,
  });

  assert.equal(root.source, "data-directory");
});

test("no usable candidate falls back to the data directory", async () => {
  const dataDir = join(await scratchDirectory(), "data");
  const root = await resolveEgressSocketDirectory({ candidates: [], dataDir, uid });
  assert.equal(root.source, "data-directory");
  assert.equal(root.directory, resolve(dataDir, "eg"));
});

test("the systemd runtime directory wins over XDG_RUNTIME_DIR", async () => {
  const systemd = await scratchDirectory();
  const xdg = await scratchDirectory();
  const dataDir = join(systemd, "data");

  const root = await resolveEgressSocketDirectory({
    dataDir,
    env: { RUNTIME_DIRECTORY: systemd, XDG_RUNTIME_DIR: xdg },
    temporaryDirectory: xdg,
    uid,
  });

  assert.equal(root.source, "runtime-directory");
  assert.equal(root.directory, join(systemd, egressSocketDirectoryName(dataDir, uid)));
});

test("a colon-separated RUNTIME_DIRECTORY uses the first existing directory", async () => {
  const second = await scratchDirectory();
  const dataDir = join(second, "data");
  const missing = join(second, "missing");

  const root = await resolveEgressSocketDirectory({
    dataDir,
    env: { RUNTIME_DIRECTORY: `${missing}:${second}` },
    temporaryDirectory: second,
    uid,
  });

  assert.equal(root.source, "runtime-directory");
  assert.equal(root.directory, join(second, egressSocketDirectoryName(dataDir, uid)));
});

test("the directory name is stable per data directory and distinct across them", () => {
  assert.equal(egressSocketDirectoryName("/srv/science-data", 1000), egressSocketDirectoryName("/srv/science-data/", 1000));
  assert.notEqual(egressSocketDirectoryName("/srv/science-data", 1000), egressSocketDirectoryName("/srv/other-data", 1000));
  assert.notEqual(egressSocketDirectoryName("/srv/science-data", 1000), egressSocketDirectoryName("/srv/science-data", 1001));
});
