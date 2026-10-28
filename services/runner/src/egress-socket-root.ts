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
 * Choose the directory that holds the egress gateways' Unix sockets.
 *
 * `sun_path` is 107 bytes on Linux (103 on macOS) and libuv truncates an
 * overlong path silently, so the socket used to be constrained by the length of
 * `SCIENCE_DISCOVERY_DATA_DIR`. That made a deep checkout unable to run any
 * network-enabled command, while execution without network stayed healthy.
 *
 * The sandbox never sees this path: bwrap binds the socket to the fixed
 * `/run/sciencediscovery/egress.sock`, so the host side is free to live in a
 * short, runner-owned runtime directory. The data directory stays the fallback
 * for hosts where none of the runtime directories is usable; only then can the
 * old length error still occur.
 *
 * Every candidate is created with mode 0700, checked for ownership and
 * probed with a real bind before it is accepted, so a foreign or unusable
 * directory is skipped instead of being reused.
 */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, rm, stat, type FileHandle } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import { MAX_UNIX_SOCKET_PATH_BYTES } from "./egress-gateway.js";

/** Hex characters of the data-directory digest in the socket directory name. */
const HASH_LENGTH = 16;

/** Short-lived name used to prove a candidate directory can bind a socket. */
const PROBE_SOCKET_NAME = "p";

export type EgressSocketRootSource =
  | "runtime-directory"
  | "xdg-runtime"
  | "run-user"
  | "tmp"
  | "os-tmp"
  | "data-directory";

export interface EgressSocketRoot {
  /** Directory that directly holds the gateway sockets. */
  directory: string;
  /** Which candidate provided the directory. */
  source: EgressSocketRootSource;
}

export interface EgressSocketRootCandidate {
  base: string;
  source: EgressSocketRootSource;
}

export interface ResolveEgressSocketRootOptions {
  dataDir: string;
  env?: NodeJS.ProcessEnv;
  /**
   * Owner the directory must belong to. Defaults to `process.getuid()`; tests
   * pass a different id to simulate a directory created by another user.
   */
  uid?: number;
  /** Defaults to `os.tmpdir()`; tests point it at a scratch directory. */
  temporaryDirectory?: string;
  /** Test seam: replaces the platform's candidate chain. */
  candidates?: EgressSocketRootCandidate[];
  /** Bind a probe socket before accepting a candidate (default true). */
  probe?: boolean;
}

/**
 * Stable, fixed-length directory name for one data directory. Two runners on
 * the same host therefore never share a socket, and a restart of the same
 * runner finds the same directory again.
 */
export function egressSocketDirectoryName(dataDir: string, uid: number | undefined): string {
  const digest = createHash("sha256").update(resolve(dataDir)).digest("hex").slice(0, HASH_LENGTH);
  return uid === undefined ? `sd-${digest}` : `sd-${uid}-${digest}`;
}

/**
 * Candidate roots, most appropriate first. `RUNTIME_DIRECTORY` is what systemd
 * sets for a unit with `RuntimeDirectory=`, which gives the right ownership,
 * SELinux label and cleanup on enterprise hosts.
 */
function defaultCandidates(
  env: NodeJS.ProcessEnv,
  uid: number | undefined,
  temporaryDirectory: string | undefined,
): EgressSocketRootCandidate[] {
  const candidates: EgressSocketRootCandidate[] = [];
  const add = (base: string | undefined, source: EgressSocketRootSource): void => {
    if (!base || !isAbsolute(base)) return;
    const resolved = resolve(base);
    if (candidates.some((candidate) => candidate.base === resolved)) return;
    candidates.push({ base: resolved, source });
  };
  // systemd sets a colon-separated list when the unit declares more than one
  // RuntimeDirectory=; each is usable, and taking the string whole would only
  // create a directory whose name contains colons.
  for (const base of (env.RUNTIME_DIRECTORY ?? "").split(":")) add(base, "runtime-directory");
  add(env.XDG_RUNTIME_DIR, "xdg-runtime");
  if (uid !== undefined) add(join("/run/user", String(uid)), "run-user");
  add("/tmp", "tmp");
  add(temporaryDirectory ?? tmpdir(), "os-tmp");
  return candidates;
}

/**
 * Create and verify `<base>/<name>`. Returns undefined when this candidate
 * cannot host the sockets, so the caller moves to the next one.
 */
async function prepareCandidate(
  candidate: EgressSocketRootCandidate,
  name: string,
  uid: number | undefined,
  probe: boolean,
): Promise<string | undefined> {
  try {
    if (!(await stat(candidate.base)).isDirectory()) return undefined;
  } catch {
    return undefined;
  }

  const directory = join(candidate.base, name);
  // The gateway appends a 16-hex socket name; reject a directory that would
  // not leave room for it before creating anything.
  if (Buffer.byteLength(join(directory, "0".repeat(HASH_LENGTH))) > MAX_UNIX_SOCKET_PATH_BYTES) {
    return undefined;
  }

  try {
    await mkdir(directory, { mode: 0o700, recursive: true });
  } catch {
    return undefined;
  }

  let handle: FileHandle | undefined;
  try {
    // O_NOFOLLOW: a symlink planted at this exact name must not redirect the
    // socket into a directory we did not verify.
    handle = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    const details = await handle.stat();
    if (!details.isDirectory()) return undefined;
    if (uid !== undefined && details.uid !== uid) return undefined;
    if ((details.mode & 0o077) !== 0) await handle.chmod(0o700);
  } catch {
    return undefined;
  } finally {
    await handle?.close().catch(() => undefined);
  }

  if (probe && !(await canBind(directory))) return undefined;
  return directory;
}

/** Prove the directory can bind the same kind of path the gateway will use. */
async function canBind(directory: string): Promise<boolean> {
  const probePath = join(directory, PROBE_SOCKET_NAME);
  await rm(probePath, { force: true }).catch(() => undefined);
  const server = createServer();
  try {
    await new Promise<void>((resolveListen, reject) => {
      server.once("error", reject);
      server.listen(probePath, () => {
        server.off("error", reject);
        resolveListen();
      });
    });
    return true;
  } catch {
    return false;
  } finally {
    try {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    } catch {
      // Not started, or already closed; nothing is left to release.
    }
    await rm(probePath, { force: true }).catch(() => undefined);
  }
}

/**
 * Resolve the directory for this runner. Never throws: when every runtime
 * directory is unusable the historical `<dataDir>/eg` is returned and the
 * gateway's own length check stays the final guard.
 */
export async function resolveEgressSocketDirectory(
  options: ResolveEgressSocketRootOptions,
): Promise<EgressSocketRoot> {
  const env = options.env ?? process.env;
  const uid = "uid" in options ? options.uid : process.getuid?.();
  const name = egressSocketDirectoryName(options.dataDir, uid);
  const probe = options.probe ?? true;
  const candidates = options.candidates ?? defaultCandidates(env, uid, options.temporaryDirectory);
  for (const candidate of candidates) {
    const directory = await prepareCandidate(candidate, name, uid, probe);
    if (directory !== undefined) return { directory, source: candidate.source };
  }
  return { directory: resolve(options.dataDir, "eg"), source: "data-directory" };
}
