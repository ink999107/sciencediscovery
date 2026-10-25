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

import type { ModelProfile } from "../api/types.js";
import { TEXT } from "../text.js";
import { providerName } from "./provider-name.js";

interface Props {
  /** Why uploading is not on offer, or `undefined` when it is. A reason rather
   *  than a flag because the button's tooltip has to say what is missing. */
  attachBlocked?: string;
  /** The per-file ceiling to state in that tooltip, already formatted. */
  attachLimit?: string;
  models: ModelProfile[];
  onOpenSettings: () => void;
  onSelectModel: (modelId: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  onUpload: (files: File[]) => void;
  running: boolean;
  selectedModelId?: string;
  uploading: boolean;
}

type Menu = "model";

function PlusGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24" width="17">
      <path d="M12 5v14M5 12h14" />
    </svg>
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
 * footer of 上传, the model and 发送.
 *
 * The plus does one thing — it opens the file picker, because uploading is the
 * only way of giving the turn more than text this service carries.
 */
export function Composer({
  attachBlocked,
  attachLimit,
  models,
  onOpenSettings,
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

    </div>
  );
}
