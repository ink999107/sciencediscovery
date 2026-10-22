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

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { ApiClient } from "./api/client.js";
import { useFileDrop } from "./app/use-file-drop.js";
import { usePanelWidth } from "./app/use-panel-width.js";
import { useWorkspace } from "./app/use-workspace.js";
import { formatByteLimit } from "./app/upload.js";
import {
  RIGHT_PANEL_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  readStoredFlag,
  writeStoredFlag,
} from "./state/storage.js";
import { TEXT } from "./text.js";
import { AuthScreen } from "./views/AuthScreen.js";
import { Composer } from "./views/Composer.js";
import { ConfirmDialog } from "./views/ConfirmDialog.js";
import { Conversation } from "./views/Conversation.js";
import { OfflineScreen } from "./views/OfflineScreen.js";
import { SessionBar } from "./views/SessionBar.js";
import { SettingsDialog } from "./views/SettingsDialog.js";
import { SetupWizard } from "./views/SetupWizard.js";
import { Sidebar } from "./views/Sidebar.js";
import { Toasts } from "./views/Toasts.js";
import { WorkspacePanel } from "./views/WorkspacePanel.js";

interface Props {
  /** Read once in `main.tsx`, before the tree mounts. */
  initialToken: string;
}

export function App({ initialToken }: Props) {
  const [token, setToken] = useState(initialToken);
  /** Set when the server answered 401, so the gate can say "this one was
   *  refused" instead of the generic "we have no credential". */
  const [rejected, setRejected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(() =>
    readStoredFlag(localStorage, RIGHT_PANEL_STORAGE_KEY),
  );

  const onAuthRejected = useCallback(() => {
    setRejected(true);
    setToken("");
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // A credential we could not clear is still one we do not use.
    }
  }, []);

  // The client is rebuilt with the token, because every request carries it. A
  // token change is rare enough that re-creating it is cheaper than threading
  // a mutable header through every call site.
  const client = useMemo(() => new ApiClient(token, onAuthRejected), [onAuthRejected, token]);
  const { actions, boot, state } = useWorkspace(client, onAuthRejected);
  const resize = usePanelWidth();

  useEffect(() => {
    writeStoredFlag(localStorage, RIGHT_PANEL_STORAGE_KEY, workspaceOpen);
  }, [workspaceOpen]);

  /**
   * Upload, then show where the file went.
   *
   * The files land in the workspace tree, which lives on the panel's home tab
   * — and the panel starts collapsed and stays that way until asked for. An
   * upload that produced only a toast would leave the user with exactly the
   * question this answers: where is it now. Only a file that actually landed
   * moves the panel; a refusal already says so, and rearranging the screen
   * around a failure would be motion about nothing.
   */
  const upload = useCallback(
    async (files: File[]) => {
      if (!(await actions.uploadFiles(files))) return;
      const home = state.tabs.tabs.find((slot) => slot.home);
      if (home) actions.selectPanelTab(home.id);
      setWorkspaceOpen(true);
    },
    [actions, state.tabs.tabs],
  );

  // Uploading needs a session, and opens one if there is none — so the only
  // thing it cannot survive is an archived session, which the server refuses
  // to write into. The listeners are installed regardless of that: a file
  // dropped on a page that ignores it would otherwise navigate away from the
  // app entirely.
  const canUpload = boot === "ready" && state.detail?.archivedAt === undefined;
  const dragging = useFileDrop((files) => void upload(files), canUpload);

  const acceptToken = (next: string) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, next);
    } catch {
      // Session-only credential; the app still works until the tab closes.
    }
    setRejected(false);
    setToken(next);
    actions.retryBoot();
  };

  // No token is its own screen, ahead of the boot states: without one nothing
  // the app can say about the server is knowable, including whether it is up.
  if (token === "") {
    return (
      <>
        <AuthScreen onSubmit={acceptToken} rejected={rejected} />
        <Toasts onDismiss={actions.dismissToast} toasts={state.toasts} />
      </>
    );
  }

  if (boot === "loading") {
    return (
      <div className="boot-page">
        <div className="boot-card">
          <div className="boot-mark" aria-hidden="true">
            ⬡
          </div>
          <h1 className="boot-title">{TEXT.appName}</h1>
          <p className="boot-body">{TEXT.boot.checking}</p>
        </div>
      </div>
    );
  }

  if (boot === "offline") {
    return <OfflineScreen onRetry={actions.retryBoot} reason="unreachable" />;
  }

  // The wizard replaces the shell rather than sitting over it: with no model
  // there is no session to send from, so there is nothing behind it to see.
  if (boot === "setup") {
    return (
      <>
        <SetupWizard
          client={client}
          onConfigured={() => actions.finishSetup()}
          onProvidersChanged={actions.refreshCatalog}
          presets={state.presets}
          providers={state.providers}
        />
        <Toasts onDismiss={actions.dismissToast} toasts={state.toasts} />
      </>
    );
  }

  const panelOpen = workspaceOpen;

  /** The ceiling as a phrase, for the two places that state it: the attach
   *  button's tooltip and the drop overlay. `undefined` means the service never
   *  said, and then no number is shown rather than a guessed one. */
  const limit = state.uploadLimit;
  const attachLimit = limit === undefined
    ? undefined
    : formatByteLimit(limit) ?? TEXT.upload.unlimited;

  // The panel has no collapsed state of its own: closing its last tab lands
  // here, and so does the toolbar's panel toggle.
  const collapsePanel = () => {
    setWorkspaceOpen(false);
  };

  // The column width is published as a custom property rather than written into
  // the grid here, because two things have to agree on it: the shell's third
  // track, and the panel that fills it. `--panel-width` inherits, so setting it
  // once on the shell reaches both, and neither has to be told twice.
  const shellStyle = { "--panel-width": `${resize.width}px` } as CSSProperties;

  return (
    <>
      <div className={`app-shell${panelOpen ? "" : " workspace-hidden"}`} style={shellStyle}>
        <Sidebar
          actions={actions}
          activeSessionId={state.sessionId}
          connection={state.connection}
          onOpenSettings={() => setSettingsOpen(true)}
          recent={state.recent}
        />

        <main className="main-area">
          <SessionBar
            actions={actions}
            detail={state.detail}
            onToggleWorkspace={() => {
              if (workspaceOpen) collapsePanel();
              else setWorkspaceOpen(true);
            }}
            workspaceOpen={workspaceOpen}
          />
          <Conversation
            client={client}
            detail={state.detail}
            loading={state.loadingSession}
            onDecidePermission={(request, decision) => actions.decidePermission(request.id, decision)}
            pending={state.pendingMessage}
            replays={state.replays}
            run={state.run}
          />
          <Composer
            attachBlocked={canUpload ? undefined : TEXT.composer.attachArchived}
            attachLimit={attachLimit}
            models={state.models}
            onOpenSettings={() => setSettingsOpen(true)}
            onSelectModel={(modelId) => void actions.selectModel(modelId)}
            onSend={(content) => void actions.send(content)}
            onStop={() => void actions.stop()}
            onUpload={(files) => void upload(files)}
            running={state.running}
            selectedModelId={state.selectedModelId}
            uploading={state.uploading}
          />
        </main>

        <WorkspacePanel
          actions={actions}
          files={state.panelFiles}
          onCollapse={collapsePanel}
          outputs={state.outputs}
          resize={resize}
          tabs={state.tabs}
        />
      </div>

      {/* The whole window is the drop target, so the whole window is what has
          to say so. It is drawn only while a file is actually over the app,
          and it repeats the reason when there is no session — a drop that does
          nothing is the one outcome the user cannot diagnose. */}
      {dragging ? (
        <div className="drop-overlay">
          <div className={`drop-card${canUpload ? "" : " is-blocked"}`}>
            <span className="drop-mark" aria-hidden="true">{canUpload ? "⬇" : "⊘"}</span>
            <strong className="drop-title">
              {canUpload ? TEXT.upload.dropTitle : TEXT.upload.archived}
            </strong>
            {canUpload ? <span className="drop-body">{TEXT.upload.dropBody(attachLimit)}</span> : null}
          </div>
        </div>
      ) : null}

      <Toasts onDismiss={actions.dismissToast} toasts={state.toasts} />

      {settingsOpen ? (
        <SettingsDialog
          actions={actions}
          client={client}
          onClose={() => setSettingsOpen(false)}
          state={state}
        />
      ) : null}

      {state.confirm ? (
        <ConfirmDialog onDismiss={actions.dismissConfirm} request={state.confirm} />
      ) : null}
    </>
  );
}
