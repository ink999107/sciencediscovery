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
 * Which Session the sidebar puts first.
 *
 * Kept out of `use-workspace` because the answer is pure: it depends only on
 * what the server listed, so it can be tested without a browser.
 */

/**
 * The Sessions as the sidebar lists them: most recently used first.
 *
 * `updatedAt` is an ISO-8601 string from the server's clock, so comparing the
 * strings orders them exactly as comparing the instants would. The sort is
 * stable, which leaves sessions touched in the same millisecond in the order
 * the server listed them.
 */
export function byRecency<T extends { updatedAt: string }>(sessions: readonly T[]): T[] {
  return [...sessions].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
