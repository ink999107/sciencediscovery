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
 * The schema surface this app actually uses, re-exported as types.
 *
 * Views import from here rather than from `@sciencediscovery/schema` so that
 * the one place the two are wired together stays visible. Everything is
 * `import type`, which is what keeps the schema barrel (and the JSON property
 * import it reaches through `@sciencediscovery/external-urls`) out of the
 * browser bundle: a type-only re-export is erased at build time.
 */

import type {
  EffectiveRuntimeSettings,
  ModelProvider,
  ModelProviderPreset,
  RuntimeSettingsOverrides,
} from "@sciencediscovery/schema";

export type {
  ChatMessage,
  CreateModelProviderRequest,
  CreateSessionRequest,
  EffectiveRuntimeSettings,
  ModelConnectivityTestResult,
  ModelProfile,
  ModelProvider,
  ModelProviderPreset,
  ProviderModelEntry,
  ProviderModelPreview,
  Project,
  RunStreamEvent,
  RuntimeSettingsOverrides,
  SendMessageRequest,
  Session,
  SessionDetail,
  SessionListState,
  SessionRun,
  SessionRunStatus,
  UpdateSessionRequest,
} from "@sciencediscovery/schema";

/** `GET /api/providers` answers both halves in one round trip. */
export interface ProviderCatalog {
  presets: ModelProviderPreset[];
  providers: ModelProvider[];
}

/**
 * `GET /api/settings` — the global layer. `overrides` is what a write must
 * send back verbatim; `effective` and `sources` are read-only output.
 */
export interface GlobalSettings {
  effective: EffectiveRuntimeSettings;
  overrides: RuntimeSettingsOverrides;
  sources: Record<string, string>;
}

/** Shape of every non-2xx body the API sends. */
export interface ApiErrorBody {
  code?: string;
  details?: Record<string, unknown>;
  error?: string;
}
