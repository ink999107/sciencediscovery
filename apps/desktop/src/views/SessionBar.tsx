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

import type { WorkspaceActions } from "../app/use-workspace.js";
import type { SessionDetail } from "../api/types.js";
import { TEXT } from "../text.js";
import { PromptDialog } from "./PromptDialog.js";
import { sessionTitle } from "./session-title.js";

interface Props {
  actions: WorkspaceActions;
  detail?: SessionDetail;
  onToggleWorkspace: () => void;
  workspaceOpen: boolean;
}

/**
 * Names the open session and carries the one control that acts on the panel.
 *
 * The crumb is the session alone. It used to lead with the owning Project,
 * which said nothing the user could act on: `UpdateSessionRequest` has no
 * `projectId`, so moving a session between projects is not something the API
 * can do, and this UI creates the one Project it needs anyway.
 *
 * The rename is the double-click on the crumb and the row menu in the sidebar;
 * there is no ⋯ here, because every entry it would carry — rename, archive,
 * delete — is already on the session's own sidebar row.
 */
export function SessionBar({ actions, detail, onToggleWorkspace, workspaceOpen }: Props) {
  const [renaming, setRenaming] = useState(false);
  const title = detail ? sessionTitle(detail.title) : TEXT.sessionBar.home;

  return (
    <header className="session-bar">
      <div className="breadcrumb">
        <span
          className="crumb current"
          onDoubleClick={detail ? () => setRenaming(true) : undefined}
          title={detail ? `${title} · ${TEXT.sessionBar.renameHint}` : undefined}
        >
          {title}
        </span>
      </div>
      <div className="bar-actions">
        <button
          aria-expanded={workspaceOpen}
          aria-label={TEXT.sessionBar.workspaceToggle}
          className="bar-icon-button"
          onClick={onToggleWorkspace}
          title={TEXT.sessionBar.workspaceToggle}
          type="button"
        >
          {/* A panel outline with its own right-hand pane: the shape of the
              thing the button opens, rather than a generic grid glyph. */}
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            viewBox="0 0 24 24"
            width="16"
          >
            <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="2" width="18" x="3" y="5" />
            <path d="M16 5v14" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
      {renaming && detail ? (
        <PromptDialog
          accept={TEXT.menu.confirm}
          eyebrow={TEXT.menu.rename}
          fieldLabel={TEXT.sessionBar.sessionTitle}
          onCancel={() => setRenaming(false)}
          onSubmit={(next) => {
            setRenaming(false);
            void actions.renameSession(detail, next);
          }}
          title={TEXT.menu.rename}
          value={detail.title}
        />
      ) : null}
    </header>
  );
}
