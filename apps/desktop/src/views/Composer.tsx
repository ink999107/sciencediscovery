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

import { useEffect, useRef, useState } from "react";

import type { ApprovalMode, ModelProfile } from "../api/types.js";
import { TEXT } from "../text.js";
import { providerName } from "./provider-name.js";

interface Props {
  approvalMode?: ApprovalMode;
  /** Why uploading is not on offer, or `undefined` when it is. A reason rather
   *  than a flag because the button's tooltip has to say what is missing. */
  attachBlocked?: string;
  /** The per-file ceiling to state in that tooltip, already formatted. */
  attachLimit?: string;
  models: ModelProfile[];
  onApprovalMode: (mode: ApprovalMode) => void;
  onOpenSettings: () => void;
  onOpenSpecialists: () => void;
  onSelectModel: (modelId: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  onUpload: (files: File[]) => void;
  running: boolean;
  selectedModelId?: string;
  uploading: boolean;
}

type Menu = "model" | "settings";

function PlusGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24" width="17">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** The sliders beside the plus: the session's own settings, not the app's. */
function SlidersGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="17">
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.1" />
      <circle cx="9" cy="17" r="2.1" />
    </svg>
  );
}

type SettingsPanel = "experts" | "permission";

/** The shield that marks permission, and its warning form for 完全访问. */
function ShieldGlyph({ alert = false }: { alert?: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="18">
      <path d="M12 3.4 5.2 6.4v5.1c0 4.2 2.8 7.1 6.8 8.7 4-1.6 6.8-4.5 6.8-8.7V6.4z" />
      {alert ? (
        <>
          <path d="M12 8.7v3.4" />
          <path d="M12 15.6h.01" />
        </>
      ) : (
        <path d="M12 9.2v3.1" />
      )}
    </svg>
  );
}

/** The person that marks 专家. */
function PersonGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.4 19.4c.7-3.2 3.4-5.2 6.6-5.2s5.9 2 6.6 5.2" />
    </svg>
  );
}

/** The tick against the chosen option in a flyout. */
function CheckGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15">
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

function ChevronRightGlyph() {
  return (
    <svg aria-hidden="true" className="session-menu-chev" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** The dash in a quiet square: 专家's "none" option. */
function NoneGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
      <path d="M5 12h14" />
    </svg>
  );
}

/**
 * 会话设置, behind the sliders beside the plus: a column of the session's own
 * rows and, beside the open one, its choices. The two columns are separate
 * cards so a flyout is never clipped by the row column's own scroll box.
 *
 * Exported because it is only mounted while open, and a static render of the
 * composer never gets there.
 */
export function SessionSettingsMenu({
  approvalMode,
  onApprovalMode,
  onClose,
  onOpenSpecialists,
  running,
}: {
  approvalMode?: ApprovalMode;
  onApprovalMode: (mode: ApprovalMode) => void;
  onClose: () => void;
  onOpenSpecialists: () => void;
  running: boolean;
}) {
  const [panel, setPanel] = useState<SettingsPanel>();
  const fullAccess = approvalMode === "always_allow";
  const toggle = (next: SettingsPanel) => setPanel((current) => (current === next ? undefined : next));

  return (
    <div className="composer-dropdown is-settings" onPointerDown={(event) => event.stopPropagation()}>
      <div className="session-menu">
        <div className="session-menu-panel">
          <button
            aria-expanded={panel === "permission"}
            aria-haspopup="true"
            className={`session-menu-row${panel === "permission" ? " is-open" : ""}`}
            disabled={running}
            onClick={() => toggle("permission")}
            title={running ? TEXT.composer.permissionLocked : undefined}
            type="button"
          >
            <span className="session-menu-icon">
              <ShieldGlyph />
            </span>
            <span className="session-menu-label">{TEXT.composer.permissionMode}</span>
            <span className="session-menu-value">
              <span className="session-menu-value-icon">
                <ShieldGlyph />
              </span>
              {fullAccess ? TEXT.composer.permissionFull : TEXT.composer.permissionAskShort}
              <ChevronRightGlyph />
            </span>
          </button>
          <div className="session-menu-divider" />
          <button
            aria-expanded={panel === "experts"}
            aria-haspopup="true"
            aria-label={TEXT.composer.experts}
            className={`session-menu-row${panel === "experts" ? " is-open" : ""}`}
            onClick={() => toggle("experts")}
            type="button"
          >
            <span className="session-menu-icon">
              <PersonGlyph />
            </span>
            <span className="session-menu-label">{TEXT.composer.experts}</span>
            <span className="session-menu-value">
              {TEXT.composer.expertsNone}
              <ChevronRightGlyph />
            </span>
            <span className="session-menu-tip" role="tooltip">
              {TEXT.composer.expertsHint}
            </span>
          </button>
        </div>

        {panel === "permission" ? (
          <div className="session-menu-flyout">
            <button
              className={`session-flyout-row${fullAccess ? "" : " is-selected"}`}
              onClick={() => {
                onApprovalMode("ask_for_dangerous");
                onClose();
              }}
              title={TEXT.composer.permissionAskDesc}
              type="button"
            >
              <span className="session-flyout-icon">
                <ShieldGlyph />
              </span>
              <span className="session-flyout-label">{TEXT.composer.permission}</span>
              {fullAccess ? null : (
                <span className="session-flyout-check">
                  <CheckGlyph />
                </span>
              )}
            </button>
            <button
              className={`session-flyout-row is-danger${fullAccess ? " is-selected" : ""}`}
              onClick={() => {
                onApprovalMode("always_allow");
                onClose();
              }}
              title={TEXT.composer.permissionFullDesc}
              type="button"
            >
              <span className="session-flyout-icon">
                <ShieldGlyph alert />
              </span>
              <span className="session-flyout-label">{TEXT.composer.permissionFull}</span>
              {fullAccess ? (
                <span className="session-flyout-check">
                  <CheckGlyph />
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        {panel === "experts" ? (
          <div className="session-menu-flyout">
            <button className="session-flyout-row is-selected" onClick={onClose} type="button">
              <span className="session-flyout-none">
                <NoneGlyph />
              </span>
              <span className="session-flyout-label">{TEXT.composer.expertsNone}</span>
              <span className="session-flyout-check">
                <CheckGlyph />
              </span>
            </button>
            <div className="session-menu-divider" />
            <button
              className="session-flyout-row is-action"
              onClick={() => {
                onClose();
                onOpenSpecialists();
              }}
              type="button"
            >
              <span className="session-flyout-label">{TEXT.composer.expertsCreate}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Chevron({ down = true }: { down?: boolean }) {
  return (
    <svg
      className="model-chev"
      fill="none"
      height="12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      style={down ? undefined : { transform: "rotate(180deg)" }}
      viewBox="0 0 24 24"
      width="12"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * The composer, as the handoff draws it: one rounded card, the input over a
 * footer of 上传, 会话设置, the model and 发送.
 *
 * The plus does one thing — it opens the file picker, because uploading is the
 * only way of giving the turn more than text this service carries. Permission
 * and 专家 live behind the sliders beside it, the way the reference groups a
 * session's own settings.
 */
export function Composer({
  approvalMode,
  attachBlocked,
  attachLimit,
  models,
  onApprovalMode,
  onOpenSettings,
  onOpenSpecialists,
  onSelectModel,
  onSend,
  onStop,
  onUpload,
  running,
  selectedModelId,
  uploading,
}: Props) {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<Menu>();
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const selected = models.find((model) => model.id === selectedModelId) ?? models[0];
  /** The stored name is the server's; the pill shows it in the interface's
   *  language. */
  const selectedName = selected ? providerName(selected.name) : undefined;
  const canSend = text.trim() !== "" && !running;

  // Grow with the content up to the CSS max-height, then scroll. Done by hand
  // because a textarea cannot size to its content.
  useEffect(() => {
    const node = area.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    if (!menu) return;
    const dismiss = () => setMenu(undefined);
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [menu]);

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
  };

  const chooseFiles = () => {
    if (attachBlocked !== undefined || uploading) return;
    setMenu(undefined);
    picker.current?.click();
  };

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <div className="composer">
      <div className="composer-input">
        <textarea
          disabled={running}
          id="composer-textarea"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={TEXT.composer.placeholder}
          ref={area}
          rows={1}
          value={text}
        />
      </div>
      <div className="composer-footer">
        <button
          aria-label={TEXT.composer.uploadFile}
          className="composer-plus"
          disabled={attachBlocked !== undefined || uploading}
          onClick={chooseFiles}
          title={attachBlocked ?? TEXT.composer.attachHint(attachLimit)}
          type="button"
        >
          {uploading ? <span className="spinner" /> : <PlusGlyph />}
        </button>

        <button
          aria-expanded={menu === "settings"}
          aria-label={TEXT.composer.sessionSettings}
          className="composer-plus composer-settings"
          onClick={(event) => {
            event.stopPropagation();
            setMenu(menu === "settings" ? undefined : "settings");
          }}
          title={TEXT.composer.sessionSettings}
          type="button"
        >
          <SlidersGlyph />
        </button>

        <input
          className="composer-file-input"
          multiple
          onChange={(event) => {
            const chosen = [...(event.target.files ?? [])];
            // Cleared so that choosing the same file twice in a row still
            // fires a change event: the input's value would otherwise be
            // unchanged and the browser would swallow the second selection.
            event.target.value = "";
            if (chosen.length > 0) onUpload(chosen);
          }}
          ref={picker}
          type="file"
        />

        <span className="composer-spacer" />

        <button
          aria-expanded={menu === "model"}
          aria-label={TEXT.composer.modelSelect}
          className="composer-model-pill"
          onClick={(event) => {
            event.stopPropagation();
            if (running) return;
            setMenu(menu === "model" ? undefined : "model");
          }}
          title={running ? TEXT.composer.pillLocked : TEXT.composer.modelSelect}
          type="button"
        >
          <span className="model-name">
            {selectedName ?? TEXT.errors.modelRequired}
          </span>
          <Chevron down={menu !== "model"} />
        </button>

        {running ? (
          <button
            aria-label={TEXT.composer.stop}
            className="send-button-icon"
            onClick={onStop}
            title={TEXT.composer.stopHint}
            type="button"
          >
            <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
              <rect fill="currentColor" height="10" rx="2" width="10" x="7" y="7" />
            </svg>
          </button>
        ) : (
          <button
            aria-label={TEXT.composer.send}
            className="send-button-icon"
            disabled={!canSend}
            onClick={submit}
            title={TEXT.composer.send}
            type="button"
          >
            <svg
              fill="none"
              height="16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
              width="16"
            >
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        )}
      </div>

      {menu === "model" ? (
        <div className="composer-dropdown is-models" onPointerDown={stop}>
          <div className="dropdown-section">
            <div className="dropdown-label">{TEXT.composer.configuredModels}</div>
            {models.map((model) => {
              const name = providerName(model.name);
              return (
                <button
                  className="dropdown-row model-row"
                  key={model.id}
                  onClick={() => {
                    setMenu(undefined);
                    onSelectModel(model.id);
                  }}
                  type="button"
                >
                  <span className="model-mark">{name.trim().slice(0, 1).toUpperCase()}</span>
                  <span className="row-label">{name}</span>
                  {model.id === selected?.id ? <span className="row-check">✓</span> : null}
                </button>
              );
            })}
            <div className="dropdown-divider" />
            <button
              className="dropdown-row dropdown-row-sub"
              onClick={() => {
                setMenu(undefined);
                onOpenSettings();
              }}
              type="button"
            >
              <span className="row-icon">＋</span>
              <span className="row-label">{TEXT.composer.addCustomModel}</span>
            </button>
          </div>
        </div>
      ) : null}

      {menu === "settings" ? (
        <SessionSettingsMenu
          approvalMode={approvalMode}
          onApprovalMode={onApprovalMode}
          onClose={() => setMenu(undefined)}
          onOpenSpecialists={onOpenSpecialists}
          running={running}
        />
      ) : null}
    </div>
  );
}
