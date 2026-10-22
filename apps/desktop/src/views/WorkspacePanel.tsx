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

import { lazy, Suspense, useEffect, useState } from "react";

import type { PanelResize } from "../app/use-panel-width.js";
import type { PreviewSlot, TabState, WorkspaceActions } from "../app/use-workspace.js";
import { buildFileTree, countFiles, type FileTreeNode } from "../app/file-tree.js";
import { fileName } from "../app/paths.js";
import { PANEL_MAX_WIDTH, PANEL_MIN_WIDTH, PANEL_NUDGE_STEP, PANEL_NUDGE_STRIDE } from "../app/panel-width.js";
import { Markdown } from "../Markdown.js";
import { detectStructureFormat } from "../molecular.js";
import type { ScientificArtifactKind, SessionArtifactOutput, WorkspaceFile } from "../api/types.js";
import { TEXT } from "../text.js";

/** Loaded on the first structure that is opened. Mol* is an order of magnitude
 *  larger than the rest of the app together, and most sessions never show one. */
const StructureViewer = lazy(() => import("./StructureViewer.js"));

interface Props {
  actions: WorkspaceActions;
  files: WorkspaceFile[];
  onCollapse: () => void;
  outputs: SessionArtifactOutput[];
  resize: PanelResize;
  tabs: TabState;
}

/** The dot in front of an artifact name, coloured by what the artifact is —
 *  the prototype's own four-colour marker. */
const KIND_DOT: Record<ScientificArtifactKind, string> = {
  dataset: "var(--insight-strong)",
  figure: "var(--discovery)",
  html: "var(--text-secondary)",
  json: "var(--insight-strong)",
  latex: "var(--primary)",
  markdown: "var(--primary)",
  notebook: "var(--primary)",
  other: "var(--text-secondary)",
  report: "var(--discovery)",
  structure: "var(--discovery)",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatTime(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return TEXT.workspace.justNow;
  if (minutes < 60) return TEXT.workspace.minutesAgo(minutes);
  if (minutes < 60 * 24) return TEXT.workspace.hoursAgo(Math.round(minutes / 60));
  return new Date(time).toLocaleDateString(TEXT.languageTag);
}

/** The full-screen view's switch. The panel holds it because one of its two
 *  buttons is in the panel's own header. */
interface Expandable {
  expanded: boolean;
  onExpand: (next: boolean) => void;
}

/** An artifact may have no source path — a generated `.pdb` is one — so the
 *  name to read an extension off, and to give the viewer, is whichever of the
 *  two has one. */
function previewName(label: string, path: string): string {
  return path === "" ? label : path;
}

/** Markdown and JSON get a rendered/textual preview; a structure file gets the
 *  3D view; everything else is shown as source, because this version has no
 *  PDF, image or notebook renderer. */
function Preview({ content, expanded, label, onExpand, path }: Expandable & { content: string; label: string; path: string }) {
  const name = previewName(label, path);
  const format = detectStructureFormat({ content, name });
  if (format !== undefined) {
    return (
      <Suspense fallback={<div className="workspace-empty"><span className="spinner" /></div>}>
        <StructureViewer content={content} expanded={expanded} format={format} name={name} onExpand={onExpand} />
      </Suspense>
    );
  }
  const lower = name.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return (
      <div className="text">
        <Markdown>{content}</Markdown>
      </div>
    );
  }
  if (lower.endsWith(".json")) {
    let pretty = content;
    try {
      pretty = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      // Not JSON after all; the raw text is what the user should see.
    }
    return <pre className="tab-content-source">{pretty}</pre>;
  }
  if (content === "") return <div className="tab-content">{TEXT.workspace.unsupported}</div>;
  return <pre className="tab-content-source">{content}</pre>;
}

/** One directory level: the directories inside it first, each its own fold,
 *  then the files that sit directly in it.
 *
 * Recursive because the tree is: every path segment is a row the reader can
 * fold on its own, and the nesting gives the depth its indent. The root is not
 * a row — the path bar above already names it — so the files at the top of the
 * workspace open the section. */
function TreeLevel({ actions, node }: { actions: WorkspaceActions; node: FileTreeNode }) {
  return (
    <>
      {node.subdirectories.map((child) => (
        <details className="tree-dir" key={child.path} open>
          <summary>
            <div className="tree-row">
              <span className="tree-chev">▸</span>
              <span className="tree-icon">📁</span>
              <span className="tree-name">{child.name}</span>
              <span className="tree-size" />
              <span className="tree-age">{TEXT.workspace.filesCount(countFiles(child))}</span>
            </div>
          </summary>
          <div className="tree-children">
            <TreeLevel actions={actions} node={child} />
          </div>
        </details>
      ))}
      {node.files.map((file) => (
        <button
          className="tree-row is-file"
          key={file.path}
          onClick={() => void actions.openFile(file)}
          title={file.path}
          type="button"
        >
          <span />
          <span className="tree-icon">▫</span>
          <span className="tree-name">{fileName(file.path)}</span>
          <span className="tree-size">{formatSize(file.size)}</span>
          <span className="tree-age">{formatTime(file.modifiedAt)}</span>
        </button>
      ))}
    </>
  );
}

/** Files are listed in the directories their paths imply, one foldable row per
 *  directory at every depth, so a run that wrote twenty files into one folder
 *  reads as one folder rather than twenty rows — and a folder three levels down
 *  is still three rows, not one row with two slashes in its name. */
function FileTree({ actions, files }: { actions: WorkspaceActions; files: WorkspaceFile[] }) {
  return <TreeLevel actions={actions} node={buildFileTree(files)} />;
}

/**
 * The 产物 section. It lists what this session produced, by name.
 *
 * A name and a dot is the whole row. The description the server sends with an
 * artifact is a paragraph about its contents, and a paragraph per row turned a
 * list of files into a wall of text that made the names — the one thing needed
 * to pick one — the hardest thing to find. The description is still the row's
 * tooltip, and the contents are one click away in a tab.
 */
function Artifacts({
  actions,
  outputs,
}: {
  actions: WorkspaceActions;
  outputs: SessionArtifactOutput[];
}) {
  if (outputs.length === 0) return <div className="workspace-empty">{TEXT.workspace.empty}</div>;
  return (
    <ul className="artifacts-list">
      {outputs.map((output) => (
        <li className="artifact-item" key={output.version.id}>
          <button
            className="artifact-open"
            onClick={() => void actions.openArtifact(output)}
            title={output.artifact.description ?? output.artifact.name}
            type="button"
          >
            <span
              aria-hidden="true"
              className="artifact-dot"
              style={{ background: KIND_DOT[output.artifact.kind] }}
            />
            <span className="artifact-name">{fileName(output.artifact.name)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * What the panel shows before anything has been opened: the artifacts section
 * above the workspace tree. This is the initial tab's content and the only
 * content a document is ever allowed to overwrite.
 */
function PanelHome({ actions, files, outputs }: Omit<Props, "tabs" | "fullscreen" | "onToggleFullscreen" | "onCollapse" | "resize">) {
  return (
    <>
      <details className="panel-section artifacts-section" open>
        <summary>
          <span className="artifacts-title">{TEXT.workspace.artifacts}</span>
          <span className="artifacts-count">{outputs.length}</span>
          <span className="artifacts-chev">▾</span>
        </summary>
        <Artifacts actions={actions} outputs={outputs} />
      </details>

      <details className="panel-section workspace-tree-section" open>
        <summary>
          <span className="artifacts-title">{TEXT.workspace.collapsible}</span>
          <span className="artifacts-count">{TEXT.workspace.filesCount(files.length)}</span>
          <span className="artifacts-chev">▾</span>
        </summary>
        <div className="tree-pathbar">
          <span className="tree-rootname">📁 {TEXT.workspace.root}</span>
          <span className="tree-filecount">{TEXT.workspace.sessionRoot} ↗</span>
        </div>
        {files.length === 0 ? (
          <div className="workspace-empty">{TEXT.workspace.filesEmpty}</div>
        ) : (
          <FileTree actions={actions} files={files} />
        )}
      </details>
    </>
  );
}

/** A document tab: one artifact or workspace file, read on open. */
function Document({ expanded, onExpand, slot }: Expandable & { slot: PreviewSlot }) {
  if (slot.loading) return <div className="workspace-empty"><span className="spinner" /></div>;
  if (slot.error !== undefined) return <div className="error-card">{slot.error}</div>;
  return <Preview content={slot.content ?? ""} expanded={expanded} label={slot.label} onExpand={onExpand} path={slot.path} />;
}

/**
 * The right column: what the session produced, and what is on disk.
 *
 * It starts collapsed and stays that way until asked for — the conversation is
 * the primary surface, and the design's rule is that a panel which opens itself
 * steals the width the answer needs.
 *
 * The tab bar holds one tab per open document, on top of the initial 新标签页
 * tab. Opening the first document replaces that tab in place rather than adding
 * to it, so the common case — look at one artifact — never costs a second tab.
 */
export function WorkspacePanel({
  actions,
  files,
  onCollapse,
  outputs,
  resize,
  tabs,
}: Props) {
  const active = tabs.tabs.find((slot) => slot.id === tabs.activeTabId);
  /** The full-screen view is of one document, so it closes with it: another tab,
   *  or no tab, and there is nothing left to be looking at. */
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [tabs.activeTabId]);

  // The document's name is the second way into the full-screen view, and it is
  // only a way in when what it names is a structure.
  const activeName = active === undefined ? "" : previewName(active.label, active.path);
  const structure =
    active !== undefined
    && !active.home
    && !active.loading
    && detectStructureFormat({ content: active.content ?? "", name: activeName }) !== undefined;

  return (
    <aside className="workspace-panel">
      {/* The panel's left edge, which is the only thing in the window that can
          be dragged. It is a separator with arrow keys rather than a mouse-only
          affordance: a resize is a layout decision, and a keyboard is a
          perfectly good way to make one. */}
      <div
        aria-label={TEXT.workspace.resize}
        aria-orientation="vertical"
        aria-valuemax={PANEL_MAX_WIDTH}
        aria-valuemin={PANEL_MIN_WIDTH}
        aria-valuenow={resize.width}
        className="workspace-splitter"
        onKeyDown={(event) => {
          // The panel is on the right, so the edge moving left is the panel
          // growing — the keys point the way the edge goes, not the way the
          // width does.
          const grow = event.key === "ArrowLeft";
          if (!grow && event.key !== "ArrowRight") return;
          event.preventDefault();
          const step = event.shiftKey ? PANEL_NUDGE_STRIDE : PANEL_NUDGE_STEP;
          resize.nudge(grow ? step : -step);
        }}
        onPointerDown={resize.start}
        role="separator"
        tabIndex={0}
      />
      <header className="workspace-tabbar">
        <div className="workspace-tabs" role="tablist">
          {tabs.tabs.map((slot) => {
            const isActive = slot.id === tabs.activeTabId;
            return (
              <div
                className={`workspace-tab${isActive ? " active" : ""}`}
                key={slot.id}
                role="presentation"
              >
                <button
                  aria-selected={isActive}
                  className="workspace-tab-open"
                  onClick={() => actions.selectPanelTab(slot.id)}
                  role="tab"
                  title={slot.path === "" ? undefined : slot.path}
                  type="button"
                >
                  <span className="tab-icon">{slot.home ? "⊕" : "▤"}</span>
                  <span className="tab-title">
                    {slot.home ? TEXT.workspace.newTab : slot.label}
                  </span>
                </button>
                <button
                  aria-label={TEXT.workspace.closeTab}
                  className="tab-close"
                  onClick={() => {
                    if (actions.closeTab(slot.id)) onCollapse();
                  }}
                  title={TEXT.workspace.closeTab}
                  type="button"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <button
          aria-label={TEXT.workspace.addTab}
          className="tab-add"
          onClick={actions.addPanelTab}
          title={TEXT.workspace.addTab}
          type="button"
        >
          +
        </button>
      </header>

      <div className="workspace-body">
        {active === undefined || active.home ? (
          <PanelHome actions={actions} files={files} outputs={outputs} />
        ) : (
          <div className="artifact-view">
            <header className="artifact-view-header">
              <h3>
                {structure ? (
                  <button
                    className="artifact-view-title"
                    onClick={() => setExpanded(true)}
                    title={TEXT.molstar.expand}
                    type="button"
                  >
                    {active.label}
                  </button>
                ) : (
                  active.label
                )}
              </h3>
              {active.path === "" ? null : <small>{active.path}</small>}
            </header>
            <div className="artifact-view-body">
              <Document expanded={expanded} onExpand={setExpanded} slot={active} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
