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

import type { ApprovalMode, ModelProfile, ModelProvider } from "../api/types.js";
import type { LandingCategory, LandingSeed } from "../app/landing.js";
import { TEXT } from "../text.js";
import { modelBrand } from "./model-brand.js";
import { modelLabel, providerName } from "./provider-name.js";

/** The category chip the welcome page puts in front of the input. */
export interface ComposerTag {
  kind: LandingCategory;
  label: string;
  onClear: () => void;
}

interface Props {
  approvalMode?: ApprovalMode;
  /** Why uploading is not on offer, or `undefined` when it is. A reason rather
   *  than a flag because the button's tooltip has to say what is missing. */
  attachBlocked?: string;
  /** The per-file ceiling to state in that tooltip, already formatted. */
  attachLimit?: string;
  /** The welcome page's arrangement: the card floats, and a grey strip under
   *  it carries the project and the permission mode. */
  landing?: boolean;
  models: ModelProfile[];
  onApprovalMode: (mode: ApprovalMode) => void;
  onOpenSettings: () => void;
  onOpenSpecialists: () => void;
  onSelectModel: (modelId: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  onUpload: (files: File[]) => void;
  /** Shown in the landing strip, beside the folder. Always known: a session
   *  belongs to a Project, and the app falls back to the unnamed workspace's
   *  name rather than to an invitation this strip cannot answer. */
  projectName: string;
  /** Where the model menu gets each row's brand mark. A profile names its
   *  provider, and the provider knows its preset. */
  providers?: ModelProvider[];
  running: boolean;
  /** A starter prompt chosen on the welcome page, to be placed in the input. */
  seed?: LandingSeed;
  selectedModelId?: string;
  /** The category the welcome page attached to this turn. */
  tag?: ComposerTag;
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

/** The ✕ that detaches the category chip from the turn. */
function CloseGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24" width="11">
      <path d="m6 6 12 12M18 6 6 18" />
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
 * 权限模式's choices, beside the row that opened them.
 *
 * Each option says under its name what it allows. That sentence used to be a
 * `title`, which only a mouse reaches — for the one switch that widens what
 * the session can touch, the consequence has to be text on screen and a
 * description a screen reader reads.
 *
 * Exported because it is only mounted while its row is open.
 */
export function PermissionFlyout({
  fullAccess,
  onApprovalMode,
  onClose,
}: {
  fullAccess: boolean;
  onApprovalMode: (mode: ApprovalMode) => void;
  onClose: () => void;
}) {
  return (
    <div className="session-menu-flyout">
      <button
        aria-describedby="session-permission-ask-desc"
        aria-label={TEXT.composer.permission}
        className={`session-flyout-row${fullAccess ? "" : " is-selected"}`}
        onClick={() => {
          onApprovalMode("ask_for_dangerous");
          onClose();
        }}
        type="button"
      >
        <span className="session-flyout-icon">
          <ShieldGlyph />
        </span>
        <span className="session-flyout-text">
          <span className="session-flyout-label">{TEXT.composer.permission}</span>
          <span className="session-flyout-desc" id="session-permission-ask-desc">
            {TEXT.composer.permissionAskDesc}
          </span>
        </span>
        {fullAccess ? null : (
          <span className="session-flyout-check">
            <CheckGlyph />
          </span>
        )}
      </button>
      <button
        aria-describedby="session-permission-full-desc"
        aria-label={TEXT.composer.permissionFull}
        className={`session-flyout-row is-danger${fullAccess ? " is-selected" : ""}`}
        onClick={() => {
          onApprovalMode("always_allow");
          onClose();
        }}
        type="button"
      >
        <span className="session-flyout-icon">
          <ShieldGlyph alert />
        </span>
        <span className="session-flyout-text">
          <span className="session-flyout-label">{TEXT.composer.permissionFull}</span>
          <span className="session-flyout-desc" id="session-permission-full-desc">
            {TEXT.composer.permissionFullDesc}
          </span>
        </span>
        {fullAccess ? (
          <span className="session-flyout-check">
            <CheckGlyph />
          </span>
        ) : null}
      </button>
    </div>
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
            aria-describedby="session-experts-hint"
            aria-expanded={panel === "experts"}
            aria-haspopup="true"
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
            {/* The row's explanation, shown over it on hover. It is aria-hidden
                because a tooltip inside the button would otherwise be read as
                part of the row's name; the hidden sentence below carries the
                same words to assistive technology. */}
            <span aria-hidden="true" className="session-menu-tip">
              {TEXT.composer.expertsHint}
            </span>
          </button>
          <span className="sr-only" id="session-experts-hint">{TEXT.composer.expertsHint}</span>
        </div>

        {panel === "permission" ? (
          <PermissionFlyout fullAccess={fullAccess} onApprovalMode={onApprovalMode} onClose={onClose} />
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
 * The model menu's contents: the models, a hairline, and the way to add one.
 *
 * One row per model, each row a single line — the provider is its icon, so the
 * words only have to say which model. Exported because the menu only exists
 * while it is open, and the rows are the part worth testing.
 */
export function ModelMenu({
  models,
  onAdd,
  onSelect,
  providers = [],
  selectedId,
}: {
  models: ModelProfile[];
  onAdd: () => void;
  onSelect: (modelId: string) => void;
  providers?: ModelProvider[];
  selectedId?: string;
}) {
  const list = useRef<HTMLDivElement>(null);

  // With more models than the list can show, the one in use may start below
  // the fold. Put it in view without moving the card.
  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <>
      <div className="model-menu-list" ref={list}>
        {models.map((model) => {
          const name = providerName(model.name);
          const current = model.id === selectedId;
          return (
            <button
              aria-current={current ? "true" : undefined}
              className="model-option"
              key={model.id}
              onClick={() => onSelect(model.id)}
              title={name}
              type="button"
            >
              <span
                aria-hidden="true"
                className="model-option-icon"
                data-brand={modelBrand(model, providers)}
              />
              <span className="model-option-label">{modelLabel(name)}</span>
              {current ? (
                <span className="model-option-check">
                  <CheckGlyph />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="model-menu-divider" />
      <button className="model-option is-add" onClick={onAdd} type="button">
        <span aria-hidden="true" className="model-option-plus">
          <PlusGlyph />
        </span>
        <span className="model-option-label">{TEXT.composer.addCustomModel}</span>
      </button>
    </>
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
  landing = false,
  models,
  onApprovalMode,
  onOpenSettings,
  onOpenSpecialists,
  onSelectModel,
  onSend,
  onStop,
  onUpload,
  projectName,
  providers = [],
  running,
  seed,
  selectedModelId,
  tag,
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

  // A starter prompt from the welcome page replaces whatever the input holds:
  // it is a deliberate choice, not text inserted at the caret. The cursor goes
  // to the end so the reader can keep typing from where the prompt stops.
  useEffect(() => {
    if (seed === undefined) return;
    setText(seed.text);
    const node = area.current;
    if (!node) return;
    const frame = window.requestAnimationFrame(() => {
      node.focus();
      const end = node.value.length;
      node.setSelectionRange(end, end);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [seed]);

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
    <div className={`composer${landing ? " is-landing" : ""}`}>
      <div className="composer-input">
        {tag ? (
          <span className="composer-tag">
            <span aria-hidden="true" className="composer-tag-icon" data-kind={tag.kind} />
            <span className="composer-tag-label">{tag.label}</span>
            <button
              aria-label={TEXT.landing.clearCategory}
              className="composer-tag-clear"
              onClick={tag.onClear}
              type="button"
            >
              <CloseGlyph />
            </button>
          </span>
        ) : null}
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
          placeholder={landing ? TEXT.landing.placeholder : TEXT.composer.placeholder}
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

        <span className="composer-menu-anchor is-settings">
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
          {menu === "settings" ? (
            <SessionSettingsMenu
              approvalMode={approvalMode}
              onApprovalMode={onApprovalMode}
              onClose={() => setMenu(undefined)}
              onOpenSpecialists={onOpenSpecialists}
              running={running}
            />
          ) : null}
        </span>

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

        <span className="composer-menu-anchor is-model">
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
          {menu === "model" ? (
            <div className="composer-dropdown is-models" onPointerDown={stop}>
              <ModelMenu
                models={models}
                onAdd={() => {
                  setMenu(undefined);
                  onOpenSettings();
                }}
                onSelect={(modelId) => {
                  setMenu(undefined);
                  onSelectModel(modelId);
                }}
                providers={providers}
                selectedId={selected?.id}
              />
            </div>
          ) : null}
        </span>

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
            <span aria-hidden="true" className="send-glyph" />
          </button>
        )}
      </div>

      {landing ? (
        <div className="composer-strip">
          <span className="composer-strip-project">
            <span aria-hidden="true" className="composer-strip-icon" data-kind="folder" />
            <span className="composer-strip-label">{projectName}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
