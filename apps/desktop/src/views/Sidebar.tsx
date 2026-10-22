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

import type { Connection, WorkspaceActions } from "../app/use-workspace.js";
import type { Session } from "../api/types.js";
import { TEXT } from "../text.js";
import { RowMenu, type MenuState } from "./RowMenu.js";
import { sessionTitle } from "./session-title.js";

interface Renaming {
  id: string;
  value: string;
}

interface Props {
  actions: WorkspaceActions;
  activeSessionId?: string;
  connection: Connection;
  onOpenSettings: () => void;
  recent: Session[];
}

/** Only the class is static: the label is a translated string, so it is read
 *  at render time instead of being frozen into this table. */
const CONNECTION_CLASS: Record<Connection, string> = {
  degraded: "is-degraded",
  offline: "is-offline",
  online: "",
};

function connectionLabel(connection: Connection): string {
  const status = TEXT.status;
  if (connection === "degraded") return status.localDegraded;
  if (connection === "offline") return status.localOffline;
  return status.localOnline;
}

function basename(session: Session): string {
  return sessionTitle(session.title);
}

/**
 * The left column: one flat list of sessions, most recently used first.
 *
 * There is no 项目 block. Sessions do belong to a Project — the API has no
 * Session without one — but this UI never asks about the owner: it creates the
 * Project it needs at startup and every session it makes lands there. Naming
 * that owner here only ever raised a question the user could not act on.
 */
export function Sidebar({ actions, activeSessionId, connection, onOpenSettings, recent }: Props) {
  const [menu, setMenu] = useState<MenuState>();
  const [renaming, setRenaming] = useState<Renaming>();
  const statusClass = CONNECTION_CLASS[connection];

  const anchor = (event: { clientX: number; clientY: number }) => ({
    x: event.clientX,
    y: event.clientY,
  });

  const commitRename = (next: Renaming) => {
    const name = next.value.trim();
    setRenaming(undefined);
    const session = recent.find((candidate) => candidate.id === next.id);
    if (session && name !== "" && name !== session.title) void actions.renameSession(session, name);
  };

  const renameField = (next: Renaming) => (
    <input
      autoFocus
      className="side-rename-input"
      onBlur={() => commitRename(next)}
      onChange={(event) => setRenaming({ ...next, value: event.target.value })}
      onKeyDown={(event) => {
        if (event.key === "Enter") commitRename(next);
        if (event.key === "Escape") setRenaming(undefined);
      }}
      value={next.value}
    />
  );

  const sessionRow = (session: Session) => {
    const active = session.id === activeSessionId;
    const editing = renaming !== undefined && renaming.id === session.id;
    return (
      <div className={`side-row${active ? " is-active" : ""}`} key={session.id}>
        <button
          className={`side-session${active ? " active" : ""}`}
          onClick={() => void actions.openSession(session.id)}
          // Double-click is the design's own rename gesture, and it is not the
          // only one: the `⋯` menu beside the name opens the same field, which
          // is what keeps the gesture discoverable.
          onDoubleClick={() => setRenaming({ id: session.id, value: session.title })}
          title={`${basename(session)} · ${TEXT.sidebar.renameHint}`}
          type="button"
        >
          {editing ? renameField(renaming) : <span className="side-session-name">{basename(session)}</span>}
        </button>
        <div className="side-actions">
          <button
            aria-label={TEXT.sessionBar.sessionMenu}
            className="side-mini-button"
            onClick={(event) =>
              setMenu({
                ...anchor(event),
                items: [
                  {
                    icon: "✎",
                    label: TEXT.menu.rename,
                    onSelect: () => setRenaming({ id: session.id, value: session.title }),
                  },
                  {
                    icon: "🗑",
                    label: TEXT.menu.delete,
                    onSelect: () => void actions.deleteSession(session),
                  },
                ],
              })
            }
            title={TEXT.sessionBar.sessionMenu}
            type="button"
          >
            ⋯
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div aria-hidden="true" className="brand-mark">
          <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
            <path
              d="M9 3v5L4.2 17.4A2 2 0 0 0 6 20.5h12a2 2 0 0 0 1.8-3.1L15 8V3"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
            <path d="M8 3h8" stroke="#fff" strokeLinecap="round" strokeWidth="1.6" />
            <circle cx="10" cy="15" fill="#fff" r="1.1" />
            <circle cx="13.5" cy="17" fill="#fff" r="0.9" />
            <circle cx="14" cy="13.5" fill="#fff" r="0.7" />
          </svg>
        </div>
        <div className="brand-text">
          <strong>{TEXT.appName}</strong>
          <span className={`brand-status ${statusClass}`.trim()}>
            <span className="dot" />
            {connectionLabel(connection)}
          </span>
        </div>
      </div>

      <section className="resource-block">
        <button className="new-session-btn" onClick={actions.newSession} type="button">
          <span className="new-session-plus">＋</span>
          <span>{TEXT.sidebar.newSession}</span>
        </button>

        <div className="resource-label recent-label">
          <span>{TEXT.sidebar.recent}</span>
        </div>
        <div className="recent-list">
          {recent.length === 0 ? (
            <div className="side-empty">{TEXT.sidebar.noRecent}</div>
          ) : (
            recent.map((session) => sessionRow(session))
          )}
        </div>
      </section>

      <div className="sidebar-spacer" />

      <div className="sidebar-foot">
        <button className="side-action" onClick={onOpenSettings} title={TEXT.sidebar.settings} type="button">
          <span className="side-action-icon">⚙️</span>
          <span>{TEXT.sidebar.settings}</span>
        </button>
      </div>

      <RowMenu menu={menu} onClose={() => setMenu(undefined)} />
    </aside>
  );
}
