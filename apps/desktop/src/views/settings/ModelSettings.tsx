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

import { useState } from "react";

import type { ApiClient } from "../../api/client.js";
import { testModel } from "../../api/models.js";
import type { ModelProfile } from "../../api/types.js";
import type { WorkspaceActions, WorkspaceState } from "../../app/use-workspace.js";
import { TEXT } from "../../text.js";
import { ModelForm } from "../ModelForm.js";
import { providerName } from "../provider-name.js";
import { Group, Tag } from "./rows.js";

interface Props {
  actions: WorkspaceActions;
  client: ApiClient;
  state: WorkspaceState;
}

/**
 * 设置 › 模型.
 *
 * The configured profiles, then the form that adds another one. The default is
 * not a block of its own: it is the tag on a card and a 设为默认 button beside
 * it, which is the only place it needs to appear. The form is the wizard's —
 * configuring a second model is not a different operation from configuring the
 * first, and one implementation is what keeps the create/test/default ordering
 * right in both places.
 */
export function ModelSettings({ actions, client, state }: Props) {
  const [adding, setAdding] = useState(false);
  const [probing, setProbing] = useState<string>();
  const [probe, setProbe] = useState<Record<string, string>>({});

  const isDefault = (profile: ModelProfile) => profile.id === state.defaultModelId;

  const probeModel = async (profile: ModelProfile) => {
    setProbing(profile.id);
    try {
      const result = await testModel(client, profile.id);
      setProbe((current) => ({
        ...current,
        [profile.id]: result.ok
          ? TEXT.settings.model.testOk(result.latencyMs)
          : TEXT.settings.model.testFailed(result.message || TEXT.errors.generic),
      }));
    } catch (reason) {
      setProbe((current) => ({
        ...current,
        [profile.id]: TEXT.settings.model.testFailed(
          reason instanceof Error ? reason.message : TEXT.errors.generic,
        ),
      }));
    } finally {
      setProbing(undefined);
    }
  };

  return (
    <>
      <Group heading={TEXT.settings.model.providersHeading}>
        {state.models.length === 0 ? (
          <p className="settings-empty">{TEXT.settings.model.empty}</p>
        ) : (
          <div className="settings-list">
            {state.models.map((profile) => {
              const name = providerName(profile.name);
              return (
                <div className="settings-card" key={profile.id}>
                  <span className="settings-card-mark">{name.slice(0, 1).toUpperCase()}</span>
                  <div className="settings-card-main">
                    <strong>
                      {name}
                      {isDefault(profile) ? (
                        <Tag tone="primary">{TEXT.settings.model.default}</Tag>
                      ) : null}
                    </strong>
                    <small>
                      {profile.model} · {profile.baseUrl}
                      {probe[profile.id] ? ` · ${probe[profile.id]}` : ""}
                    </small>
                  </div>
                  <div className="settings-card-actions">
                    <button
                      className="secondary-button"
                      disabled={probing === profile.id}
                      onClick={() => void probeModel(profile)}
                      type="button"
                    >
                      {probing === profile.id ? TEXT.settings.model.testing : TEXT.settings.model.test}
                    </button>
                    {isDefault(profile) ? null : (
                      <button
                        className="secondary-button"
                        onClick={() => void actions.setDefaultModel(profile.id)}
                        type="button"
                      >
                        {TEXT.settings.model.setDefault}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Group>

      <Group heading={TEXT.settings.model.add}>
        {adding ? (
          <div className="settings-card is-form">
            <div className="settings-card-form">
              <ModelForm
                client={client}
                onCancel={() => setAdding(false)}
                onConfigured={() => {
                  setAdding(false);
                  void actions.refreshCatalog();
                }}
                onProvidersChanged={actions.refreshCatalog}
                presets={state.presets}
                providers={state.providers}
                submitLabel={TEXT.settings.model.save}
              />
            </div>
          </div>
        ) : (
          <button className="secondary-button" onClick={() => setAdding(true)} type="button">
            {TEXT.settings.model.add}
          </button>
        )}
      </Group>
    </>
  );
}
