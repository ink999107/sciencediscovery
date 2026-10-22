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

import type { ApiClient } from "../api/client.js";
import type { ModelProvider, ModelProviderPreset } from "../api/types.js";
import { DATA_DIR_STORAGE_KEY } from "../state/storage.js";
import { TEXT } from "../text.js";
import { ModelForm, type ModelFormResult } from "./ModelForm.js";

interface Props {
  client: ApiClient;
  onConfigured: (result: ModelFormResult) => void | Promise<void>;
  /** Re-reads the catalog so a second attempt in this session sees the provider
   *  the first one created, and updates it instead of duplicating it. */
  onProvidersChanged: () => void | Promise<void>;
  presets: ModelProviderPreset[];
  providers: ModelProvider[];
}

type Step = "data" | "provider";

const STEPS: Step[] = ["data", "provider"];

/**
 * The first run, when there is no model and therefore nothing the app can do.
 *
 * Two steps, in this order on purpose: the model is the gate, and the data
 * directory is a note-to-self that must not stand between a user and the app.
 * A user who cannot get a key working can still finish the second step and see
 * where their data would go.
 *
 * The data directory is recorded, not applied: no route in this API reports or
 * changes the live data directory, so pretending otherwise would be a control
 * that silently does nothing. The note says so in plain words.
 */
export function SetupWizard({
  client,
  onConfigured,
  onProvidersChanged,
  presets,
  providers,
}: Props) {
  const [step, setStep] = useState<Step>("data");
  const [dataDir, setDataDir] = useState(() => localStorage.getItem(DATA_DIR_STORAGE_KEY) ?? "");
  const [saved, setSaved] = useState(false);

  const rememberDataDir = () => {
    if (dataDir.trim() === "") localStorage.removeItem(DATA_DIR_STORAGE_KEY);
    else localStorage.setItem(DATA_DIR_STORAGE_KEY, dataDir.trim());
    setSaved(true);
  };

  const index = STEPS.indexOf(step);
  const stepFlag = (candidate: Step) =>
    candidate === "provider" ? TEXT.wizard.required : TEXT.wizard.optional;

  return (
    <div className="wizard-page">
      <aside className="wizard-rail">
        <div className="wizard-brand">
          <span className="boot-mark" aria-hidden="true">
            ⬡
          </span>
          <strong>{TEXT.appName}</strong>
        </div>
        <nav className="wizard-steps">
          {STEPS.map((candidate) => (
            <button
              className={`wizard-step${
                candidate === step ? " is-current" : STEPS.indexOf(candidate) < index ? " is-done" : ""
              }`}
              key={candidate}
              onClick={() => setStep(candidate)}
              type="button"
            >
              <span className="wizard-step-dot">
                {STEPS.indexOf(candidate) < index ? "✓" : STEPS.indexOf(candidate) + 1}
              </span>
              <span className="wizard-step-label">{TEXT.wizard.steps[candidate]}</span>
              <span
                className={`wizard-step-flag${
                  candidate === "provider" ? " is-required" : " is-optional"
                }`}
              >
                {stepFlag(candidate)}
              </span>
            </button>
          ))}
        </nav>
        <p className="wizard-rail-foot">{TEXT.wizard.railFoot}</p>
      </aside>

      <main className="wizard-main">
        <header className="wizard-head">
          <h1 className="wizard-title">{TEXT.wizard.title}</h1>
          <p className="wizard-sub">{TEXT.wizard.sub[step]}</p>
        </header>

        <div className="wizard-body">
          <div className="wizard-body-inner">
            {step === "data" ? (
              <section className="wizard-card">
                <div className="wizard-card-head">
                  <strong>{TEXT.wizard.data.heading}</strong>
                </div>
                <div className="wizard-card-body">
                  <label className="field">
                    <span className="field-label">{TEXT.wizard.data.label}</span>
                    <input
                      className="field-input"
                      onChange={(event) => {
                        setDataDir(event.target.value);
                        setSaved(false);
                      }}
                      placeholder={TEXT.wizard.data.placeholder}
                      spellCheck={false}
                      value={dataDir}
                    />
                    <span className="field-help">{TEXT.wizard.data.body}</span>
                  </label>
                  <div className="test-result">{TEXT.wizard.data.ignoredNote}</div>
                </div>
              </section>
            ) : (
              <section className="wizard-card">
                <div className="wizard-card-head">
                  <strong>{TEXT.wizard.provider.heading}</strong>
                </div>
                <div className="wizard-card-body">
                  <ModelForm
                    client={client}
                    onConfigured={onConfigured}
                    onProvidersChanged={onProvidersChanged}
                    presets={presets}
                    providers={providers}
                    submitLabel={TEXT.wizard.testAndContinue}
                  />
                </div>
              </section>
            )}
          </div>
        </div>

        {step === "data" ? (
          <footer className="wizard-foot">
            <span className="wizard-foot-status">
              {saved
                ? dataDir.trim() === ""
                  ? TEXT.wizard.status.dataDefault
                  : TEXT.wizard.status.dataChosen
                : ""}
            </span>
            <button
              className="secondary-button"
              onClick={() => {
                // "Skip" is not a different path from naming a directory: both
                // end up here, and an empty value is what removes the record.
                setDataDir("");
                localStorage.removeItem(DATA_DIR_STORAGE_KEY);
                setStep("provider");
              }}
              type="button"
            >
              {TEXT.wizard.skipDefault}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                rememberDataDir();
                setStep("provider");
              }}
              type="button"
            >
              {TEXT.wizard.next}
            </button>
          </footer>
        ) : (
          <footer className="wizard-foot">
            <span className="wizard-foot-status">{TEXT.wizard.status.providerFailed}</span>
            <button className="secondary-button" onClick={() => setStep("data")} type="button">
              {TEXT.wizard.back}
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}
