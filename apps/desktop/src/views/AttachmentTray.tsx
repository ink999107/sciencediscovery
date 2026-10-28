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

import {
  attachmentKind,
  attachmentType,
  formatFileSize,
  type Attachment,
} from "../app/attachments.js";
import { TEXT } from "../text.js";
import { FileBadge } from "./FileBadge.js";
import { RowMenu, type MenuState } from "./RowMenu.js";

interface Props {
  attachments: readonly Attachment[];
  /** Empty the tray. The menu's 清空附件, one card's problem becoming every
   *  card's. */
  onClear: () => void;
  /** Take one card out, leaving the uploaded file where it is. */
  onRemove: (id: string) => void;
  /** Upload one failed card again. */
  onRetry: (id: string) => void;
}

/** How long a press on the delete button has to last to mean the menu rather
 *  than the deletion. Long enough that a click is never mistaken for it. */
const LONG_PRESS_MS = 520;

/** The page a failed upload shows in place of its file kind: the type is no
 *  longer what the card is about. */
function WarningMark() {
  return (
    <span aria-hidden="true" className="attach-mark is-failed">
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M10.6 4.6a1.6 1.6 0 0 1 2.8 0l7 12.2a1.6 1.6 0 0 1-1.4 2.4H5a1.6 1.6 0 0 1-1.4-2.4z"
          fill="#fff"
        />
        <path d="M12 9.6v4.1" stroke="#8a8a8a" strokeLinecap="round" strokeWidth="1.6" />
        <circle cx="12" cy="16.4" fill="#8a8a8a" r=".95" />
      </svg>
    </span>
  );
}

/**
 * The files the composer is holding, above the input: one card per file, four
 * to a row, two rows before the tray scrolls (the handoff's arrangement).
 *
 * A card is also the file's status: 上传中… while it is in flight, the type and
 * size once it has landed, 上传失败 with 重试 if the route refused it. That is
 * why the strip stays visible after an upload — it is what the turn will carry,
 * not a progress bar that can disappear.
 */
export function AttachmentTray({ attachments, onClear, onRemove, onRetry }: Props) {
  /** The card whose menu is open, if any. */
  const [menu, setMenu] = useState<MenuState>();
  const timer = useRef<number | undefined>(undefined);
  /** Set while a long press has already been answered by the menu, so the
   *  click that ends the press does not also delete the card. */
  const held = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const press = (id: string, anchor: HTMLElement) => {
    held.current = false;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      held.current = true;
      openMenu(id, anchor);
    }, LONG_PRESS_MS);
  };

  const release = () => window.clearTimeout(timer.current);

  /** The menu hangs off the delete button's top-right corner, the way the
   *  handoff draws it. `RowMenu` flips and clamps it from there. */
  const openMenu = (id: string, anchor: HTMLElement | null) => {
    if (anchor === null) return;
    const box = anchor.getBoundingClientRect();
    setMenu({
      anchor,
      items: [
        { label: TEXT.attachment.delete, onSelect: () => onRemove(id) },
        { label: TEXT.attachment.clear, onSelect: onClear },
      ],
      x: box.right + 6,
      y: box.top - 2,
    });
  };

  return (
    <>
      <div aria-label={TEXT.attachment.tray} className="attach-tray" role="list">
        {attachments.map((item) => {
          const failed = item.status === "failed";
          return (
            <div
              className={`attach-card is-${item.status}`}
              key={item.id}
              role="listitem"
              // The reason lives in the toast, which has already been shown; the
              // card keeps it for whoever comes back to it later.
              title={failed ? item.error : item.name}
            >
              {failed ? (
                <WarningMark />
              ) : (
                <span className="attach-mark">
                  <FileBadge kind={attachmentKind(item.name, item.file.type)} />
                  {item.status === "uploading" ? (
                    <span aria-hidden="true" className="attach-spin" />
                  ) : null}
                </span>
              )}
              <span className="attach-text">
                <span className="attach-name">{item.name}</span>
                {failed ? (
                  <span className="attach-meta is-failed">
                    {TEXT.attachment.failed}
                    <button
                      className="attach-retry"
                      onClick={() => onRetry(item.id)}
                      type="button"
                    >
                      {TEXT.attachment.retry}
                    </button>
                  </span>
                ) : (
                  <span className="attach-meta">
                    {item.status === "uploading"
                      ? TEXT.attachment.uploading
                      : TEXT.attachment.detail(attachmentType(item.name), formatFileSize(item.size))}
                  </span>
                )}
              </span>
              <button
                aria-label={TEXT.attachment.remove(item.name)}
                className="attach-remove"
                id={`attach-remove-${item.id}`}
                onClick={() => {
                  // A press that opened the menu ends in a click too; that one
                  // must not also take the card away.
                  if (held.current) {
                    held.current = false;
                    return;
                  }
                  setMenu(undefined);
                  onRemove(item.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  openMenu(item.id, event.currentTarget);
                }}
                onPointerCancel={release}
                onPointerDown={(event) => {
                  // The press is the card's, not the document's: the menu's own
                  // dismissal must not race the press that opens it.
                  event.stopPropagation();
                  press(item.id, event.currentTarget);
                }}
                onPointerLeave={release}
                onPointerUp={release}
                type="button"
              >
                <svg aria-hidden="true" fill="none" height="10" viewBox="0 0 10 10" width="10">
                  <path d="M1 1l8 8M9 1 1 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      {/* Outside the tray, and portalled into the body by `RowMenu`: the tray
          scrolls, which would clip a bubble anchored to one of its cards. */}
      <RowMenu menu={menu} onClose={() => setMenu(undefined)} />
    </>
  );
}
