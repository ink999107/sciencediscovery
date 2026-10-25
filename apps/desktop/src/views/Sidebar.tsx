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
import type { Session } from "../api/types.js";
import { TEXT } from "../text.js";
import { RowMenu, type MenuState } from "./RowMenu.js";
import { sessionTitle } from "./session-title.js";
import { SidebarToggle } from "./SidebarToggle.js";

interface Renaming {
  id: string;
  value: string;
}

interface Props {
  actions: WorkspaceActions;
  activeSessionId?: string;
  onToggleSidebar?: () => void;
  projectName: string;
  recent: Session[];
  /** The task the open session is running, if it is running one. */
  taskTitle?: string;
  running?: boolean;
}

function basename(session: Session): string {
  return sessionTitle(session.title);
}

/** The handoff's relative stamp: 15:46 today, then 1天前, 3天前, 1周前. */
function stamp(session: Session): string {
  const raw = session.updatedAt ?? session.createdAt;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) return "";
  const now = Date.now();
  const minutes = Math.round((now - time) / 60000);
  if (minutes < 60) return new Date(time).toLocaleTimeString(TEXT.languageTag, { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor(minutes / 60 / 24);
  if (days < 1) return new Date(time).toLocaleTimeString(TEXT.languageTag, { hour: "2-digit", minute: "2-digit" });
  if (days < 7) return TEXT.workspace.daysAgo(days);
  return TEXT.workspace.weeksAgo(Math.floor(days / 7));
}

const PAGE_SIZE = 6;

/**
 * The task column: 科研任务, the two ways in, and the sessions under the one
 * Project this app creates for itself.
 *
 * Two sections, as the handoff draws them: the project's sessions, then the
 * tasks those sessions queued. This product has no separate task queue, so the
 * second section says 暂无任务 unless a run is going — a task is the run, and
 * pretending otherwise would invent a second object to keep in step.
 */
export function Sidebar({
  actions,
  activeSessionId,
  onToggleSidebar,
  projectName,
  recent,
  running,
  taskTitle,
}: Props) {
  const [menu, setMenu] = useState<MenuState>();
  const [renaming, setRenaming] = useState<Renaming>();
  const [projectOpen, setProjectOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

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

  const needle = query.trim().toLowerCase();
  const visible = needle === ""
    ? recent
    : recent.filter((session) => basename(session).toLowerCase().includes(needle));
  const shown = expanded || needle !== "" ? visible : visible.slice(0, PAGE_SIZE);

  const sessionRow = (session: Session) => {
    const active = session.id === activeSessionId;
    const editing = renaming !== undefined && renaming.id === session.id;
    return (
      <div className={`side-row side-sub${active ? " is-active" : ""}`} key={session.id}>
        <button
          className="side-session"
          onClick={() => void actions.openSession(session.id)}
          // Double-click is the design's own rename gesture; the `⋯` menu
          // beside the name opens the same field, which keeps it discoverable.
          onDoubleClick={() => setRenaming({ id: session.id, value: session.title })}
          title={`${basename(session)} · ${TEXT.sidebar.renameHint}`}
          type="button"
        >
          {editing ? renameField(renaming) : <span className="side-session-name">{basename(session)}</span>}
          {editing ? null : <span className="side-session-time">{stamp(session)}</span>}
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
      <div className="side-head">
        <span className="side-title">{TEXT.sidebar.title}</span>
        {onToggleSidebar ? <SidebarToggle onClick={onToggleSidebar} open /> : null}
      </div>

      <button className="side-new" onClick={actions.newSession} type="button">
        <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>{TEXT.sidebar.newTask}</span>
      </button>
      <label className="side-search">
        <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <circle cx="11" cy="11" r="6.2" />
          <path d="M16 16l4 4" />
        </svg>
        <input
          aria-label={TEXT.sidebar.searchPlaceholder}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={TEXT.sidebar.searchPlaceholder}
          type="search"
          value={query}
        />
      </label>

      <div className="side-label">{TEXT.sidebar.project}</div>
      <div className="side-scroll">
        <div className={`side-row side-project${projectOpen ? " is-open" : ""}`}>
          <button
            aria-expanded={projectOpen}
            className="side-project-toggle"
            onClick={() => setProjectOpen((current) => !current)}
            type="button"
          >
            <svg aria-hidden="true" fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="15">
              <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
            </svg>
            <span className="label">{projectName}</span>
            <svg aria-hidden="true" className="chev" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        {projectOpen ? (
          shown.length === 0 && needle !== "" ? (
            <div className="side-empty">{TEXT.sidebar.noMatch}</div>
          ) : (
            shown.map((session) => sessionRow(session))
          )
        ) : null}
        {!expanded && needle === "" && visible.length > PAGE_SIZE ? (
          <button className="side-more" onClick={() => setExpanded(true)} type="button">
            {TEXT.sidebar.showMore}
          </button>
        ) : null}

        <div className="side-label side-label-spaced">{TEXT.sidebar.tasks}</div>
        {running && taskTitle ? (
          <button className="side-row side-task-row" onClick={() => void actions.openSession(activeSessionId ?? "")} type="button">
            <span className="label">{taskTitle}</span>
            <span aria-hidden="true" className="side-spinner" />
          </button>
        ) : (
          <div className="side-empty">{TEXT.sidebar.noTasks}</div>
        )}
      </div>


      <RowMenu menu={menu} onClose={() => setMenu(undefined)} />
    </aside>
  );
}
