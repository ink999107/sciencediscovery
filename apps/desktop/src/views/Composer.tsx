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
   *  than a flag because the button's tooltip has to say what is missing — a
   *  disabled paperclip with no explanation is a dead end. */
  attachBlocked?: string;
  /** The per-file ceiling to state in that tooltip, already formatted. */
  attachLimit?: string;
  models: ModelProfile[];
  onSelectModel: (modelId: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  onUpload: (files: File[]) => void;
  running: boolean;
  selectedModelId?: string;
  uploading: boolean;
}

/**
 * The input, the model pill, and the one button that switches between 发送 and
 * 停止.
 *
 * Sending is refused while a run is going rather than queued. The API would
 * accept it, but the response to a second `POST /messages` streams the *second*
 * run's events, and this view has one timeline — showing them merged would be a
 * lie about which turn each delta belongs to. So the button that sends becomes
 * the button that stops — and that switch is the whole indication: a note
 * beside it would only repeat what the transcript's run line already says.
 */
export function Composer({
  attachBlocked,
  attachLimit,
  models,
  onSelectModel,
  onSend,
  onStop,
  onUpload,
  running,
  selectedModelId,
  uploading,
}: Props) {
  const [text, setText] = useState("");
  const [picking, setPicking] = useState(false);
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
    if (!picking) return;
    const dismiss = () => setPicking(false);
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [picking]);

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
  };

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
          aria-expanded={picking}
          aria-label={TEXT.composer.modelSelect}
          className="composer-model-pill"
          onClick={(event) => {
            event.stopPropagation();
            if (running) return;
            setPicking((current) => !current);
          }}
          title={running ? TEXT.composer.pillLocked : TEXT.composer.modelSelect}
          type="button"
        >
          <span className="model-mark">
            {(selectedName ?? "◈").trim().slice(0, 1).toUpperCase()}
          </span>
          <span className="model-name">
            {selectedName ?? TEXT.errors.modelRequired}
          </span>
          <svg
            className="model-chev"
            fill="none"
            height="12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
            width="12"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* The paperclip follows the model pill: a file is a different kind of
            thing from it — it is what the turn is given, not how the turn is
            run. */}
        <button
          aria-label={TEXT.composer.attach}
          className="composer-attach"
          disabled={attachBlocked !== undefined || uploading}
          onClick={() => picker.current?.click()}
          title={attachBlocked ?? TEXT.composer.attachHint(attachLimit)}
          type="button"
        >
          {uploading ? (
            <span className="spinner" />
          ) : (
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
              {/* A paperclip, which is what the gesture is: it sends nothing on
                  its own, it puts the file within reach of what does. */}
              <path d="M20.5 11.5 12 20a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 18a2 2 0 0 1-3-3l7.5-7.5" />
            </svg>
          )}
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

      {picking ? (
        <div className="composer-dropdown" onPointerDown={(event) => event.stopPropagation()}>
          <div className="dropdown-section">
            <div className="dropdown-label">{TEXT.composer.configuredModels}</div>
            {models.map((model) => {
              const name = providerName(model.name);
              return (
                <button
                  className="dropdown-row model-row"
                  key={model.id}
                  onClick={() => {
                    setPicking(false);
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
