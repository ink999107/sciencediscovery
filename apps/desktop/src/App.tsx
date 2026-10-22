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

import { useCallback, useMemo, useState } from "react";

import { ApiClient } from "./api/client.js";
import { useWorkspace } from "./app/use-workspace.js";
import { TOKEN_STORAGE_KEY } from "./state/storage.js";
import { TEXT } from "./text.js";
import { AuthScreen } from "./views/AuthScreen.js";
import { Composer } from "./views/Composer.js";
import { ConfirmDialog } from "./views/ConfirmDialog.js";
import { Conversation } from "./views/Conversation.js";
import { OfflineScreen } from "./views/OfflineScreen.js";
import { SessionBar } from "./views/SessionBar.js";
import { SetupWizard } from "./views/SetupWizard.js";
import { Sidebar } from "./views/Sidebar.js";
import { Toasts } from "./views/Toasts.js";

interface Props {
  /** Read once in `main.tsx`, before the tree mounts. */
  initialToken: string;
}

export function App({ initialToken }: Props) {
  const [token, setToken] = useState(initialToken);
  /** Set when the server answered 401, so the gate can say "this one was
   *  refused" instead of the generic "we have no credential". */
  const [rejected, setRejected] = useState(false);

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

  return (
    <>
      <div className="app-shell">
        <Sidebar
          actions={actions}
          activeSessionId={state.sessionId}
          connection={state.connection}
          recent={state.recent}
        />

        <main className="main-area">
          <SessionBar actions={actions} detail={state.detail} />
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
            models={state.models}
            onSelectModel={(modelId) => void actions.selectModel(modelId)}
            onSend={(content) => void actions.send(content)}
            onStop={() => void actions.stop()}
            running={state.running}
            selectedModelId={state.selectedModelId}
          />
        </main>
      </div>

      <Toasts onDismiss={actions.dismissToast} toasts={state.toasts} />

      {state.confirm ? (
        <ConfirmDialog onDismiss={actions.dismissConfirm} request={state.confirm} />
      ) : null}
    </>
  );
}
