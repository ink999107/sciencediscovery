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

import { useEffect, useState } from "react";

import type { ApiClient } from "../api/client.js";
import type { WorkspaceActions, WorkspaceState } from "../app/use-workspace.js";
import { TEXT } from "../text.js";
import { claimsEscape } from "./dialog-escape.js";
import { ModelSettings } from "./settings/ModelSettings.js";
import { NetworkSettings } from "./settings/NetworkSettings.js";
import { RuntimeSettings } from "./settings/RuntimeSettings.js";
import { SkillsSettings } from "./settings/SkillsSettings.js";

interface Props {
  actions: WorkspaceActions;
  client: ApiClient;
  onClose: () => void;
  state: WorkspaceState;
}

export type Section = "model" | "network" | "runtime" | "skills";

type Group = keyof typeof TEXT.settings.navHeadings;

/** The nav is the design's pages in their groups. `data-section` is what
 *  colours the ::before square, which is why the key and the section id are
 *  the same string. Every page here is server-backed. */
const SECTIONS: { group: Group; id: Section }[] = [
  { group: "intelligence", id: "model" },
  { group: "intelligence", id: "skills" },
  { group: "connection", id: "network" },
  { group: "connection", id: "runtime" },
];

const GROUPS = ["intelligence", "connection"] as const;

/**
 * 设置.
 *
 * One page per nav entry, each owning its own reads and writes against the
 * control API. The dialog itself keeps only what is dialog-shaped: which page
 * is open, and Escape closing the whole thing.
 *
 * Nothing here is cached between visits. Every page re-reads when it mounts,
 * which is what lets a value changed in one window show up in another: the
 * server owns these settings, and this app never pretends to.
 */
export function SettingsDialog({ actions, client, onClose, state }: Props) {
  const [section, setSection] = useState<Section>("model");

  // Escape closes this dialog only if no dialog stacked above it has claimed
  // the key — a confirmation opened from a page here is rendered outside this
  // component and sees the key first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (claimsEscape(event)) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const body = () => {
    switch (section) {
      case "model":
        return <ModelSettings actions={actions} client={client} state={state} />;
      case "skills":
        return <SkillsSettings activeProjectId={state.activeProjectId} client={client} />;
      case "network":
        return (
          <NetworkSettings client={client} onConfirm={actions.confirmAction} toast={actions.toast} />
        );
      case "runtime":
        return (
          <RuntimeSettings
            activeProjectId={state.activeProjectId}
            client={client}
            onConfirm={actions.confirmAction}
          />
        );
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-panel settings-panel" role="dialog" aria-label={TEXT.settings.title}>
        <nav className="settings-nav" aria-label={TEXT.settings.title}>
          {GROUPS.map((group) => (
            <div className="settings-nav-section" key={group}>
              <div className="settings-nav-heading">{TEXT.settings.navHeadings[group]}</div>
              {SECTIONS.filter((entry) => entry.group === group).map((entry) => (
                <button
                  aria-current={entry.id === section ? "page" : undefined}
                  className={`settings-nav-item${entry.id === section ? " active" : ""}`}
                  data-section={entry.id}
                  key={entry.id}
                  onClick={() => setSection(entry.id)}
                  type="button"
                >
                  {TEXT.settings.nav[entry.id]}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="settings-content">
          <header className="settings-content-header">
            <h2 className="settings-breadcrumb">{TEXT.settings.nav[section]}</h2>
            <div className="settings-actions">
              <button
                aria-label={TEXT.settings.close}
                className="icon-button"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </div>
          </header>

          <div className="settings-content-body">{body()}</div>
        </div>
      </div>
    </div>
  );
}
