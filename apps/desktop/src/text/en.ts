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

/**
 * Every user-visible string, in English.
 *
 * Typed as `Text`, which is the Chinese dictionary's shape: a missing or
 * misspelled key is a compile error rather than a blank label at runtime.
 * Placeholders and units stay in step with `zh.ts` by construction.
 */

import type { Text } from "./zh.js";

export const EN: Text = {
  appName: "ScienceDiscovery",
  languageTag: "en-US",

  boot: {
    checking: "Connecting to the local service…",
    offlineTitle: "Cannot reach the local service",
    offlineBody:
      "The local service did not respond. Make sure ScienceDiscovery is running, then try again.",
    retry: "Retry",
    noTokenTitle: "Credential required",
    noTokenBody:
      "Paste the access link from the startup output (it ends in #token=…) into the address bar, or paste the credential itself.",
    tokenLabel: "Access credential",
    tokenPlaceholder: "Paste the access credential",
    tokenSubmit: "Continue",
    rejectedTitle: "Credential not accepted",
    rejectedBody:
      "The local service rejected this credential. Copy the full access link from the startup output again.",
  },

  /** The narrow icon rail down the left edge. */
  rail: {
    task: "Tasks",
    settings: "Settings",
  },
  sidebar: {
    title: "Research tasks",
    newTask: "New task",
    searchPlaceholder: "Search",
    project: "Projects",
    tasks: "Tasks",
    noTasks: "No tasks yet",
    noMatch: "No matching tasks",
    showMore: "Show more",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Show sidebar",
    renameHint: "Double-click to rename",
  },

  sessionBar: {
    workspaceToggle: "Workspace panel",
    sessionMenu: "Session menu",
    sessionTitle: "Session name",
    renameHint: "Double-click to rename",
    home: "New session",
    untitled: "Untitled session",
  },

  menu: {
    rename: "Rename",
    delete: "Delete",
    confirm: "Confirm",
    cancel: "Cancel",
  },

  composer: {
    placeholder: "What can I help you with? Type “/” to reference a skill or instruction",
    send: "Send",
    stop: "Stop",
    modelSelect: "Choose a model",
    addCustomModel: "Add a custom model",
    configuredModels: "Configured models",
    pillLocked: "You can switch models when this run finishes",
    stopHint: "Closing the page or reloading will not stop the run. Stop it here explicitly.",
    uploadFile: "Upload files",
    attachHint: (limit?: string) => limit === undefined
      ? "Files go into this session's workspace, where the agent can read them. You can also drag files onto the window."
      : `Files go into this session's workspace, where the agent can read them. A single file may be up to ${limit}. You can also drag files onto the window.`,
    attachArchived: "This session is archived and cannot be written to. Restore it before uploading.",
  },

  upload: {
    dropTitle: "Drop to upload",
    dropBody: (limit?: string) => limit === undefined
      ? "The files go into the workspace, where the agent can read them."
      : `The files go into the workspace, where the agent can read them. A single file may be up to ${limit}.`,
    archived: "This session is archived and cannot be written to.",
    unlimited: "unlimited",
    busy: "Uploading…",
    tooLarge: (name: string, limit: string) => `${name} exceeds ${limit} and was not uploaded.`,
    uploaded: (path: string) => `Uploaded ${path}`,
    failed: (name: string, reason: string) => `${name}: ${reason}`,
  },

  conversation: {
    slogan: "Make scientific discovery simpler",
    subSlogan: "Attach data or a paper, then describe what you want to know.",
    feedbackHelpful: "This answer was helpful",
    feedbackUnhelpful: "This answer was not helpful",
    copyAnswer: "Copy answer",
    copied: "Copied",
    turn: (turn: number) => `Turn ${turn}`,
    notices: {
      review_notice: "Review notice",
      reviewer_checkpoint: "Review progress",
      timeout_notice: "Timeout",
    },
    cancelledReason: "The run was cancelled",
    errorLine: (message: string) => `Run failed: ${message}`,
    errorWithCode: (code: string, message: string) => `Run failed (${code}): ${message}`,
    thinking: "Reasoning",
    thinkingSteps: (count: number) => `${count} ${count === 1 ? "step" : "steps"}`,
    thinkingNow: "Planning the next step",
    elapsed: (ms: number) => {
      const seconds = Math.max(1, Math.round(ms / 1000));
      if (seconds < 60) return `Worked for ${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `Worked for ${minutes}m ${seconds % 60}s`;
      return `Worked for ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    },
    expand: "▸ Expand",
    collapse: "▼ Collapse",
    running: "Generating",
    queued: "Queued",
    blocked: "Waiting for approval",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    interrupted: "Interrupted",
    truncatedThinking: "This reasoning is long; only part of it is shown.",
    truncatedBody: "This content is long; only part of it is shown.",
    droppedEvents: (count: number) =>
      `${count} earlier ${count === 1 ? "event" : "events"} could not be replayed; the recoverable part is below.`,
    unknownEvents: (count: number) =>
      `Skipped ${count} ${count === 1 ? "event" : "events"} this version does not recognise.`,
    streamEnded: "The connection ended and the run's state is unknown. Reload to fetch it again.",
    emptyTurn: "This turn produced no text.",
    toolCall: "Tool call",
    toolRunning: "Tool is running…",
    loadingResult: "Loading the full result…",
    noOutput: "The tool finished with no output.",
    toolInput: "Input",
    toolCompleted: (name: string) => `Called ${name}`,
    toolFailed: (name: string) => `Call failed: ${name}`,
    inputTruncated: "The input was truncated by the retention policy.",
    outputTruncated: "The output was truncated by the retention policy.",
    authorized: "Approved",
    resultUnavailable: "The result is temporarily unavailable.",
  },

  permission: {
    required: "Permission required",
    allowOnce: "Allow once",
    allowMatching: "Allow this kind",
    deny: "Deny",
    details: "Details",
    action: "Action",
    resource: "Resource",
    requested: "Requested",
    decision: "Decision",
    decided: "Decided",
    execution: "Execution",
    toolCall: "Tool call",
  },

  wizard: {
    railFoot:
      "The main screen opens only after a model provider works; the data location has a default and does not block entry.",
    title: "Set up your research workspace.",
    sub: {
      data: "Where the data lives is up to you; skip it to use the default.",
      provider: "Connect a model provider first; you can change it later in Settings.",
    },
    steps: { data: "Data location", provider: "Model provider" },
    required: "Required",
    optional: "Optional",
    provider: {
      heading: "Connect a model",
      baseUrl: "Base URL",
      apiKey: "API key",
      reveal: "Show",
      conceal: "Hide",
      model: "Model name",
      modelPlaceholder: "e.g. gpt-4o-mini",
      fetch: "Fetch model list",
      fetching: "Fetching…",
      empty: "The provider returned no models. Check the base URL and the key.",
      selectPlaceholder: "Choose from the list",
      preset: "Provider type",
      tokenOptional: "Local service; optional",
    },
    custom: {
      option: "Custom (enter the address yourself)",
      name: "Custom gateway",
      protocol: "API protocol",
      protocols: {
        "anthropic-messages": "Anthropic Messages",
        "openai-chat-completions": "OpenAI Chat Completions",
        "openai-responses": "OpenAI Responses",
      },
    },
    data: {
      body: "Artifacts, intermediate results and logs all land in the data directory.",
      heading: "Data location",
      ignoredNote:
        "This only records the location you pick: the service's actual data directory is set by its launch arguments, and changing this does not move existing data.",
      label: "Workspace directory",
      placeholder: "~/ScienceDiscovery/workspace",
      useDefault: "Use the default location",
    },
    back: "Back",
    next: "Next",
    testAndContinue: "Test and continue →",
    finish: "Finish ✓",
    skipDefault: "Skip and use the default →",
    testing: "Testing…",
    testOk: (latency: number) => `✓ Connected (${latency} ms)`,
    missingKey: "Enter an API key first.",
    missingModel: "Choose or enter a model name first.",
    testCategories: {
      authorization: "The key was rejected. Check that it matches the chosen provider.",
      invalid_response:
        "The address responded, but not in a model API's format — the base URL is probably wrong.",
      missing_token: "This provider requires an API key.",
      network: "Cannot reach this address. Check the network or that the custom address is reachable.",
      not_found:
        "The endpoint returned 404. Check whether the base URL is missing or has an extra path segment.",
      ok: "Connected.",
      provider_error: "The provider returned an error. Try again later.",
      rate_limited: "Rate limited; the key itself works.",
      timeout: "The connection timed out.",
    },
    testFailed: (message: string) => `✕ Connection failed: ${message}`,
    saveFailed: (message: string) => `Save failed: ${message}`,
    status: {
      dataChosen: "Optional · custom directory recorded",
      dataDefault: "Optional · will use the default directory",
      providerFailed: "Required · pass the connectivity test first",
      providerOk: "Verified; you can continue",
    },
  },

  settings: {
    title: "Settings",
    close: "Close settings",
    nav: {
      general: "General",
      model: "Models",
      network: "Network",
      runtime: "Remote",
      skills: "Skills",
    },
    navHeadings: {
      system: "System",
      connection: "Connection",
      intelligence: "Intelligence",
    },
    general: {
      language: {
        heading: "Language",
        field: "Interface language",
        english: "English",
        chinese: "Simplified Chinese",
      },
    },
    loading: "Loading…",
    loadFailed: "Could not load this page's settings.",
    retry: "Retry",
    edit: "Edit",
    saveFailed: "Save failed. Try again.",
    back: "Back",
    forward: "Forward",
    cancel: "Cancel",
    model: {
      add: "Add model",
      save: "Save",
      default: "Default model",
      empty: "No models yet. Without a model you cannot send messages.",
      providersHeading: "Configured models",
      setDefault: "Set as default",
      defaultFailed: "Could not make this the default model. Try again.",
      test: "Test",
      testFailed: (message: string) => `✕ ${message}`,
      testOk: (latency: number) => `✓ Available (${latency} ms)`,
      testing: "Testing…",
    },
    skills: {
      detail: "Details",
      empty: "No built-in skills found.",
      heading: "Skills",
      noProject: "No project is available, so skill choices cannot be read.",
      off: "Off",
      on: "On",
      toggle: (name: string) => `Enable or disable "${name}"`,
    },
    network: {
      heading: "Network",
      sandbox: {
        heading: "Sandbox network",
        mode: "Sandbox network mode",
        modeNone: "No network",
        modeAllowlist: "Domain allowlist",
        modeOpen: "Open network",
        modeOpenWarning:
          "Open network lets any code in the sandbox reach any address, keeping only private-network filtering. Continue?",
        saved: "Sandbox network saved",
        /** The allowlist editor. The accepted format is shown by the
         *  placeholder rather than explained in a sentence. */
        domains: "Allowed domains",
        domainsPlaceholder: "example.org\n*.example.org:443",
        emptyDomains: "Add at least one allowed domain.",
        saveDomains: "Save",
        scope: "Applies only to run_shell and code inside the sandbox.",
      },
    },
    runtime: {
      heading: "Remote",
      allowlist: {
        empty: "No remote machines yet. Register one above and wait for it to connect.",
        heading: "Allowed machines",
      },
      runner: {
        add: "Add a remote Runner",
        alias: "SSH alias or IP/hostname",
        aliasPlaceholder: "e.g. gpu-01 or 10.0.0.9",
        cancel: "Cancel",
        connect: "Connect",
        connecting: "Connecting…",
        connectLog: {
          empty: "No output from this connection yet.",
          heading: "Connection log",
          live: "Live",
        },
        cpuCores: (count: number) => `${count} ${count === 1 ? "core" : "cores"}`,
        credentials: {
          cancel: "Cancel",
          heading: "Login credentials",
          keyKeep: "Leave blank to keep the stored private key",
          note: "Credentials are write-only: the API never returns them, so leaving a field blank keeps the stored one.",
          passphraseKeep: "Leave blank to keep the stored passphrase",
          passphrasePlaceholder: "Leave blank if the key has no passphrase",
          secretKeep: "Leave blank to keep the stored password",
          save: "Save and test",
        },
        delete: "Delete",
        deleteBody:
          "The Runners connected on this machine will disconnect, and it will be removed from this project's allowed list. Results already produced are unaffected.",
        deleteConfirm: (name: string) => `Delete the machine "${name}"?`,
        destinationUnknown: "Address unknown",
        disconnect: "Disconnect",
        empty: "No Runners registered.",
        endpoint: "Address",
        endpointPlaceholder: "10.0.0.9:4311",
        keyFile: "Private key file",
        keyPair: {
          copied: "Copied",
          copy: "Copy public key",
          generate: "Generate a key pair",
          note: "The private key stays in the service's data directory and never passes through the browser. Add this public key line to the machine's ~/.ssh/authorized_keys, then test the connection again.",
          title: "Public key",
        },
        keyPlaceholder: "A path this service can read, e.g. ~/.ssh/id_ed25519",
        keyStored: "Private key stored",
        resources: {
          aria: "Runner resources",
          cores: "CPU cores",
          diskUnknown: "Workspace disk: unknown · measured after the Runner connects",
          diskUsed: "Disk used",
          gpu: (gpu: string) => `GPU: ${gpu}`,
          hours: "hours",
          load1m: "Load · 1 min",
          lowDisk: (available: string, required: string) =>
            `Not enough workspace disk space: only ${available} left, while the Runner's required components plus two base conda environments need about ${required}. Environment installation and file writes may fail.`,
          memoryUsed: "Memory used",
          meterUnknown: (label: string) => `${label}: unknown`,
          noMetrics: "Workspace disk: metrics unavailable",
          updated: "Updated",
          uptime: "Host uptime",
        },
        npu: {
          aiCore: (percent: number) => `AI Core ${percent}%`,
          aiCoreLabel: "AI Core utilisation",
          card: (chip: string, index: number) => `NPU ${index} · ${chip}`,
          cardChip: (card: number, die: number, chip: string, index: number) =>
            `NPU ${card} · die ${die} · ${chip} (device ${index})`,
          count: (total: number, usable: number) =>
            `${total} on this host · ${usable} usable in the sandbox`,
          discard: "Discard changes",
          memoryCaption: "Memory",
          memoryLabel: "Memory usage",
          none: "This host reports no Ascend cards.",
          noneUsable:
            "No card on this host can currently be opened in a sandbox, so none can be selected.",
          power: (watts: number) => `${watts} W`,
          powerLabel: "Power",
          renumbered:
            "Selected cards are renumbered from 0 inside the sandbox, so code can use device 0 directly.",
          save: "Save selection",
          saving: "Saving…",
          temperature: (celsius: number) => `${celsius} °C`,
          temperatureLabel: "Temperature",
          title: "NPU cards",
          unusable: "This card cannot be opened in a sandbox.",
          unusableSelected:
            "Runs that use it will keep failing until it is released; clear the checkbox to run without this card.",
          unsaved: "Selection not saved",
        },
        kind: {
          direct: "Self-hosted",
          local: "Local",
          ssh: "SSH",
        },
        kindLabel: "Connection type",
        local: "Local",
        localHelp: "Runs on this machine; no registration needed.",
        machineDetails: "Machine details",
        noDetail: "This Runner has not reported its status yet.",
        passphrase: "Key passphrase",
        secret: "Login password",
        secretStored: "Password stored",
        port: "SSH port",
        portLabel: "Port",
        portPlaceholder: "Blank for 22",
        reachability: {
          checking: "Checking",
          checkingHelp: "Asking whether this machine is online.",
          offline: "Machine offline",
          offlineHelp: "The Runner is not connected and the machine itself does not respond.",
          online: "Machine online",
          onlineHelp: "The Runner is not connected yet, but the machine responds.",
          unknown: "Machine status unknown",
          unknownHelp:
            "No credentials are stored for this machine, so it cannot be asked whether it is online.",
        },
        register: "Register and test",
        registerDirect: "Register and connect",
        sshConfig: {
          import: "Import from ssh_config",
          importFailed: (alias: string) => `Could not import ${alias} from ssh_config`,
          listFailed: "Could not read ssh_config",
          loading: "Reading ssh_config…",
          none: "This ssh_config has no Host entries to import.",
          note: (alias: string, target: string, keyNote: string) =>
            `Imported ${alias}${target}${keyNote} — every field is still editable.`,
          noteKeyUnreadable:
            " — this installation cannot read that key file; choose another key file or generate a new key",
          noteTarget: (host: string) => ` (connecting to ${host})`,
          portPrefix: (port: number) => `port ${port}`,
        },
        keyBrowser: {
          aria: "Files on the machine running the app",
          browse: "Browse",
          browseFailed: "Cannot browse the app's machine",
          cancelSelection: "Clear selection",
          empty: "This directory has no files.",
          folder: "Folder",
          go: "Go",
          help: "These files belong to the machine running ScienceDiscovery — not this browser, and not the remote SSH target. Only the selected path is filled in; file contents are never shown.",
          home: "Home",
          loading: "Loading files…",
          nextPage: "Next page",
          pathLabel: "Directory or file path",
          previousPage: "Previous page",
          selectFile: "Select file",
          title: "Choose a key on the app's machine",
          unavailable: "unavailable",
          up: "Up one level",
        },
        runnerCommand: "Runner executable",
        state: {
          connectFailed: "Connection failed",
          connecting: "Connecting",
          disconnected: "Disconnected",
          error: "Error",
          ready: "Ready",
          starting: "Starting",
          stopped: "Stopped",
          unknown: "Unknown",
        },
        token: "Access token",
        tokenPlaceholder: "The remote runner's SCIENCE_AGENT_RUNNER_TOKEN",
        trust: {
          cancel: "Cancel",
          changed: (target: string) => `The host key of ${target} differs from last time.`,
          changedBody:
            "Either the machine changed its key, or something in between is answering for it. Continue only after checking that the new fingerprint really belongs to this machine.",
          confirm: "Trust and continue",
          unknown: (target: string) => `${target}'s host key is not known yet.`,
          unknownBody:
            "This is the first connection to this machine. It is the machine itself only if the fingerprint matches the one its administrator gave you.",
        },
        untrusted: "Host key unverified",
        unusable: "Currently unavailable",
        username: "Login user",
        usernamePlaceholder: "e.g. researcher",
      },
    },
  },

  workspace: {
    newTab: "New tab",
    artifacts: "Artifacts",
    collapsible: "Workspace",
    empty: "This session has no artifacts yet.",
    filesEmpty: "No files in the workspace yet.",
    filesTitle: (count: number) => `Workspace · ${count} ${count === 1 ? "file" : "files"}`,
    filesCount: (count: number) => `${count} ${count === 1 ? "file" : "files"}`,
    sessionRoot: "This session",
    root: "Workspace root",
    justNow: "just now",
    minutesAgo: (minutes: number) => `${minutes} min ago`,
    hoursAgo: (hours: number) => `${hours} h ago`,
    daysAgo: (days: number) => `${days} d ago`,
    weeksAgo: (weeks: number) => `${weeks} w ago`,
    open: "Open",
    unsupported: "No preview for this type yet.",
    addTab: "Add tab",
    closeTab: "Close tab",
    resize: "Resize panel",
  },

  molstar: {
    loading: "Loading structure…",
    initFailed: "The structure view could not start.",
    viewerAria: (name: string) => `3D structure of ${name}`,
    atoms: (count: number) => `${count} atoms`,
    expand: "Expand to full screen",
    close: "Exit full screen",
  },

  project: {
    defaultName: "My workspace",
  },

  errors: {
    generic: "Something went wrong",
    sessionCreate: "Could not create the session",
    noStream: "The response has no readable stream",
    modelRequired: "No model is available yet. Configure one in Settings.",
    rename: "Rename failed",
    deleteWarning: (title: string) =>
      `Deleting "${title}" also removes its workspace data, and cannot be undone.`,
  },

  status: {
    localOnline: "Local runtime · Online",
    localDegraded: "Local runtime · Degraded",
    localOffline: "Local runtime · Offline",
  },
};
