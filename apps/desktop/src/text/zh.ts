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
 * Every user-visible string, in one place — Simplified Chinese.
 *
 * This dictionary is also the shape of the interface: `Text` is `typeof ZH`,
 * so the English dictionary cannot grow or lose a key without the compiler
 * saying so. Wording is reviewable here without reading any JSX.
 */
export const ZH = {
  appName: "ScienceDiscovery",
  /** The BCP 47 tag the language calls itself, for `Intl` and `<html lang>`. */
  languageTag: "zh-CN",

  boot: {
    checking: "正在连接本地服务…",
    offlineTitle: "连不上本地服务",
    offlineBody: "没有收到本地服务的响应。请确认 ScienceDiscovery 已在运行，然后重试。",
    retry: "重试",
    noTokenTitle: "需要访问凭据",
    noTokenBody: "请把启动输出里的访问链接（结尾是 #token=…）完整粘贴到地址栏，或直接粘贴凭据。",
    tokenLabel: "访问凭据",
    tokenPlaceholder: "粘贴访问凭据",
    tokenSubmit: "进入",
    rejectedTitle: "凭据未被接受",
    rejectedBody: "本地服务拒绝了这份凭据。请从启动输出里重新复制完整的访问链接。",
  },

  sidebar: {
    newSession: "新增会话",
    recent: "最近",
    settings: "设置",
    noRecent: "还没有会话",
    /** Shown as the tooltip on a session name, for the gesture nothing else
     *  announces. The same rename is in the row's `⋯` menu. */
    renameHint: "双击改名",
  },

  sessionBar: {
    workspaceToggle: "工作区面板",
    sessionMenu: "会话菜单",
    sessionTitle: "会话名称",
    renameHint: "双击改名",
    home: "新会话",
    /** Stands in for a Session the server created without a title. */
    untitled: "未命名会话",
  },

  menu: {
    rename: "重命名",
    delete: "删除",
    confirm: "确认",
    cancel: "取消",
  },

  composer: {
    placeholder: "输入任何内容…",
    send: "发送",
    stop: "停止",
    modelSelect: "选择模型",
    addCustomModel: "添加自定义模型",
    configuredModels: "已配置模型",
    pillLocked: "这一轮跑完才能切换模型",
    stopHint: "关闭页面或刷新不会停止运行，必须在这里显式停止。",
    attach: "上传文件",
    attachHint: (limit?: string) => limit === undefined
      ? "放进本次会话的工作区，智能体就能读到。也可以直接把文件拖进界面。"
      : `放进本次会话的工作区，智能体就能读到。单个文件最大 ${limit}。也可以直接把文件拖进界面。`,
    attachArchived: "这个会话已经归档，不能再写入。取消归档后才能上传。",
  },

  /** Getting files into the workspace: the composer's button, and the overlay
   *  the whole window turns into while a file is being dragged over it. */
  upload: {
    dropTitle: "松开即上传",
    dropBody: (limit?: string) => limit === undefined
      ? "文件会放进工作区，智能体就能读到。"
      : `文件会放进工作区，智能体就能读到。单个文件最大 ${limit}。`,
    archived: "这个会话已经归档，不能再写入。",
    /** Stands in for the size when the service reports no per-file limit. */
    unlimited: "不限",
    busy: "上传中…",
    tooLarge: (name: string, limit: string) => `${name} 超过 ${limit}，没有上传。`,
    uploaded: (path: string) => `已上传 ${path}`,
    failed: (name: string, reason: string) => `${name}：${reason}`,
  },

  conversation: {
    slogan: "让科研发现更简单",
    subSlogan: "附上数据或论文，然后说明您想了解的问题。",
    /** The reader's own role, above their messages. */
    you: "你",
    /** The header of one request/answer turn inside a run. */
    turn: (turn: number) => `第 ${turn} 轮`,
    /** The system-notice kinds the transcript can carry. */
    notices: {
      review_notice: "审阅提示",
      reviewer_checkpoint: "审阅进度",
      timeout_notice: "超时",
    } as Record<string, string>,
    /** Fills in a cancellation whose reason the stream did not carry. */
    cancelledReason: "运行已取消",
    /** A run that ended in an error, with and without the server's code. */
    errorLine: (message: string) => `运行失败：${message}`,
    errorWithCode: (code: string, message: string) => `运行失败（${code}）：${message}`,
    thinking: "思考过程",
    thinkingSteps: (count: number) => `${count} 步`,
    /** The folded line standing in for a run that has not finished yet. */
    thinkingNow: "正在思考",
    /**
     * The same line once the run is over. Minutes and seconds are the units a
     * wait is actually felt in; an hour is where "72 分" stops being readable,
     * and the seconds are dropped there because by then they are noise.
     */
    elapsed: (ms: number) => {
      const seconds = Math.max(1, Math.round(ms / 1000));
      if (seconds < 60) return `用时 ${seconds} 秒`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `用时 ${minutes} 分 ${seconds % 60} 秒`;
      return `用时 ${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
    },
    expand: "▸ 展开",
    collapse: "▼ 收起",
    running: "生成中",
    queued: "排队中",
    blocked: "等待授权",
    completed: "已完成",
    failed: "运行失败",
    cancelled: "已取消",
    interrupted: "已中断",
    truncatedThinking: "思考过程较长，这里是其中一部分。",
    truncatedBody: "内容较长，这里是其中一部分。",
    droppedEvents: (count: number) => `有 ${count} 条更早的事件未能重放，以下是可恢复的部分。`,
    unknownEvents: (count: number) => `有 ${count} 个本版本不认识的事件被跳过。`,
    streamEnded: "连接已结束，运行状态未知。刷新可重新获取。",
    emptyTurn: "这一轮没有产出文本。",
    toolCall: "工具调用",
    toolRunning: "工具正在运行…",
    loadingResult: "正在加载完整结果…",
    noOutput: "工具已完成，但没有输出。",
    toolInput: "输入",
    toolCompleted: (name: string) => `已调用 ${name}`,
    toolFailed: (name: string) => `调用失败：${name}`,
    inputTruncated: "输入已被保留策略截断。",
    outputTruncated: "输出已被保留策略截断。",
    authorized: "已授权",
    /** The substream read failed — the trace is still shown, only its body is
     *  missing. Distinct from "the tool produced nothing". */
    resultUnavailable: "结果暂时读取不到。",
  },

  permission: {
    required: "需要权限",
    allowOnce: "仅允许一次",
    allowMatching: "允许同类操作",
    deny: "拒绝",
    details: "详情",
    action: "操作",
    resource: "资源",
    requested: "请求时间",
    decision: "决定",
    decided: "决定时间",
    execution: "执行",
    toolCall: "工具调用",
  },

  wizard: {
    railFoot: "模型提供方配不通就进不去主界面；数据位置不选会走默认值，不阻塞进入。",
    title: "配置你的研究工作区。",
    sub: {
      data: "数据放在哪里由你决定，跳过就用默认位置。",
      provider: "先接上一个模型提供方，之后随时可以在设置里换。",
    },
    steps: { data: "数据位置", provider: "模型提供方" },
    required: "必填",
    optional: "可选",
    provider: {
      heading: "连接模型",
      baseUrl: "基础 URL",
      apiKey: "API Key",
      reveal: "显示",
      conceal: "隐藏",
      model: "模型名",
      modelPlaceholder: "例如 gpt-4o-mini",
      fetch: "拉取模型清单",
      fetching: "正在拉取…",
      empty: "这个服务商没有返回任何模型，请确认基础 URL 与密钥。",
      selectPlaceholder: "从清单里选择",
      preset: "服务商类型",
      tokenOptional: "本地服务，可不填",
    },
    custom: {
      option: "自定义（手填地址）",
      name: "自定义网关",
      protocol: "接口协议",
      protocols: {
        "anthropic-messages": "Anthropic Messages",
        "openai-chat-completions": "OpenAI Chat Completions",
        "openai-responses": "OpenAI Responses",
      } as Record<string, string>,
    },
    data: {
      body: "产物、中间结果与日志都会落在数据目录下。",
      heading: "数据位置",
      ignoredNote: "这一项只记录你选的位置：实际数据目录由服务启动时的参数决定，改这里不会搬动已有数据。",
      label: "工作区目录",
      placeholder: "～/ScienceDiscovery/workspace",
      useDefault: "就用默认位置",
    },
    back: "返回上一步",
    next: "下一步",
    testAndContinue: "测试并继续 →",
    finish: "完成 ✓",
    skipDefault: "跳过，用默认值 →",
    testing: "正在测试…",
    testOk: (latency: number) => `✓ 连接成功（${latency} ms）`,
    missingKey: "请先填写 API Key。",
    missingModel: "请先选择或填写模型名。",
    /** Fallbacks for a connectivity failure whose message came back empty. */
    testCategories: {
      authorization: "密钥被拒绝，请确认这串 Key 与所选服务商匹配。",
      invalid_response: "地址有响应，但返回内容不是模型接口的格式，多半是基础 URL 选错了。",
      missing_token: "这个服务商需要 API Key。",
      network: "连不上这个地址，请检查网络或自定义地址是否可达。",
      not_found: "接口返回 404，请检查基础 URL 是否少了或多了路径段。",
      ok: "连接成功。",
      provider_error: "服务商返回了错误，请稍后重试。",
      rate_limited: "被限流了，密钥本身可用。",
      timeout: "连接超时。",
    } as Record<string, string>,
    testFailed: (message: string) => `✕ 连接失败：${message}`,
    saveFailed: (message: string) => `保存失败：${message}`,
    status: {
      dataChosen: "可选 · 已记录自定义目录",
      dataDefault: "可选 · 将使用默认目录",
      providerFailed: "必填 · 需要先通过连通测试",
      providerOk: "已验证，可以继续",
    },
  },

  settings: {
    title: "设置",
    close: "关闭设置",
    nav: {
      general: "通用",
      model: "模型",
      network: "网络",
      runtime: "远程",
      skills: "技能",
    },
    navHeadings: {
      system: "系统",
      connection: "连接",
      intelligence: "智能",
    },
    /** 设置 › 通用: preferences that belong to this browser rather than to the
     *  service. */
    general: {
      language: {
        heading: "语言",
        field: "界面语言",
        english: "English",
        chinese: "简体中文",
      },
    },
    loading: "正在读取…",
    loadFailed: "没能读取这一页的设置。",
    retry: "重试",
    edit: "编辑",
    saveFailed: "保存失败，请重试。",
    back: "后退",
    forward: "前进",
    cancel: "取消",
    model: {
      add: "添加模型",
      save: "保存",
      default: "默认模型",
      empty: "还没有配置模型。没有模型就无法发送消息。",
      providersHeading: "已配置的模型",
      setDefault: "设为默认",
      defaultFailed: "没能把这个模型设为默认，请重试。",
      test: "测试",
      testFailed: (message: string) => `✕ ${message}`,
      testOk: (latency: number) => `✓ 可用（${latency} ms）`,
      testing: "正在测试…",
    },
    skills: {
      detail: "详情",
      empty: "没有读到内置技能。",
      heading: "技能",
      noProject: "还没有可用的项目，无法读取技能选择。",
      off: "已停用",
      on: "已启用",
      toggle: (name: string) => `启用或停用「${name}」`,
    },
    network: {
      heading: "网络",
      sandbox: {
        heading: "沙箱网络",
        mode: "沙箱网络模式",
        modeNone: "无网络",
        modeAllowlist: "域名白名单",
        modeOpen: "开放网络",
        modeOpenWarning: "开放网络意味着沙箱里的任何代码都能访问任意地址，只保留私网过滤。确定要这样吗？",
        saved: "沙箱网络已保存",
        /** The allowlist editor. The accepted format is shown by the
         *  placeholder rather than explained in a sentence. */
        domains: "允许的域名",
        domainsPlaceholder: "example.org\n*.example.org:443",
        emptyDomains: "至少填写一个允许的域名。",
        saveDomains: "保存",
        scope: "只作用于 run_shell 与沙箱内的代码。",
      },
    },
    runtime: {
      heading: "远程",
      allowlist: {
        empty: "还没有可用的远端机器。先在上面登记一台，等它连上。",
        heading: "允许的机器",
      },
      runner: {
        add: "新增远端 Runner",
        alias: "SSH 别名或 IP/主机名",
        aliasPlaceholder: "例如：gpu-01 或 10.0.0.9",
        cancel: "取消",
        connect: "连接",
        connecting: "正在连接…",
        connectLog: {
          empty: "这次连接还没有输出。",
          heading: "连接过程",
          live: "进行中",
        },
        cpuCores: (count: number) => `${count} 核`,
        credentials: {
          cancel: "取消",
          heading: "登录凭据",
          keyKeep: "留空则沿用已存的私钥",
          note: "凭据只写不读：存进去之后接口不会再返回它们，这里留空就是沿用已存的那一份。",
          passphraseKeep: "留空则沿用已存的口令",
          passphrasePlaceholder: "私钥没有口令就留空",
          secretKeep: "留空则沿用已存的密码",
          save: "保存并测试",
        },
        delete: "删除",
        deleteBody: "删除后这台机器上已连上的 Runner 会断开，它也从本项目的允许列表里消失。已经跑完的结果不受影响。",
        deleteConfirm: (name: string) => `删除机器「${name}」？`,
        destinationUnknown: "地址未知",
        disconnect: "断开",
        empty: "没有已登记的 Runner。",
        endpoint: "地址",
        endpointPlaceholder: "10.0.0.9:4311",
        keyFile: "私钥文件",
        keyPair: {
          copied: "已复制",
          copy: "复制公钥",
          generate: "生成密钥对",
          note: "私钥留在服务的数据目录里，不经过浏览器。把这行公钥装进机器的 ~/.ssh/authorized_keys，再测一次连接。",
          title: "公钥",
        },
        keyPlaceholder: "这个服务能读到的路径，例如 ~/.ssh/id_ed25519",
        keyStored: "已存私钥",
        /** The readings a connected Runner reports about its own machine. */
        resources: {
          aria: "Runner 资源",
          cores: "CPU 核数",
          diskUnknown: "工作区磁盘：未知 · 连接 Runner 后进行测量",
          diskUsed: "磁盘已用",
          gpu: (gpu: string) => `GPU：${gpu}`,
          hours: "小时",
          load1m: "负载 · 1 分钟",
          lowDisk: (available: string, required: string) =>
            `工作区磁盘空间不足：仅剩 ${available}，Runner 必备组件加两个基础 conda 环境预估需要约 ${required}。环境安装和文件写入可能失败。`,
          memoryUsed: "内存已用",
          meterUnknown: (label: string) => `${label}：未知`,
          noMetrics: "工作区磁盘：指标暂不可用",
          updated: "更新于",
          uptime: "主机运行时长",
        },
        /** The Ascend cards a Runner may hand to a sandbox, and which of them
         *  the operator picked. */
        npu: {
          aiCore: (percent: number) => `AI Core ${percent}%`,
          aiCoreLabel: "AI Core 占用率",
          card: (chip: string, index: number) => `NPU ${index} · ${chip}`,
          cardChip: (card: number, die: number, chip: string, index: number) =>
            `NPU ${card} · die ${die} · ${chip}（设备 ${index}）`,
          count: (total: number, usable: number) => `本机 ${total} 张 · 沙箱内可用 ${usable} 张`,
          discard: "放弃修改",
          memoryCaption: "显存",
          memoryLabel: "显存用量",
          none: "本机未报告任何昇腾卡。",
          noneUsable: "本机当前没有任何一张卡能在沙箱中打开，因此无法勾选。",
          power: (watts: number) => `${watts} W`,
          powerLabel: "功率",
          renumbered: "勾选的卡在沙箱内从 0 开始重新编号，代码可以直接使用 device 0。",
          save: "保存勾选",
          saving: "保存中…",
          temperature: (celsius: number) => `${celsius} °C`,
          temperatureLabel: "温度",
          title: "NPU 卡",
          unusable: "这张卡无法在沙箱中打开。",
          unusableSelected: "使用它的执行会一直失败，直到它被释放；取消勾选即可不带这张卡运行。",
          unsaved: "有未保存的勾选",
        },
        kind: {
          direct: "自部署",
          local: "本地",
          ssh: "SSH",
        },
        kindLabel: "接入方式",
        local: "本地",
        localHelp: "本机执行，不需要登记。",
        machineDetails: "机器详情",
        noDetail: "这个 Runner 还没有回报过状态。",
        passphrase: "私钥口令",
        secret: "登录密码",
        secretStored: "已存密码",
        port: "SSH 端口",
        portLabel: "端口",
        portPlaceholder: "留空用 22",
        reachability: {
          checking: "正在探活",
          checkingHelp: "正在问这台机器是否在线。",
          offline: "机器离线",
          offlineHelp: "Runner 没连上，机器本身也没有应答。",
          online: "机器在线",
          onlineHelp: "Runner 还没接上，但机器本身有应答。",
          unknown: "机器状态未知",
          unknownHelp: "这台机器没有存下的凭据，问不到它是否在线。",
        } as Record<string, string>,
        register: "登记并测试",
        registerDirect: "登记并连接",
        /** Prefilling the form from an existing `ssh_config` entry — a
         *  convenience, since the product speaks SSH itself afterwards. */
        sshConfig: {
          import: "从 ssh_config 导入",
          importFailed: (alias: string) => `无法从 ssh_config 导入 ${alias}`,
          listFailed: "无法读取 ssh_config",
          loading: "正在读取 ssh_config…",
          none: "这份 ssh_config 里没有可导入的 Host 条目。",
          note: (alias: string, target: string, keyNote: string) =>
            `已从 ssh_config 导入 ${alias}${target}${keyNote} — 所有字段仍可编辑。`,
          noteKeyUnreadable: " — 此安装环境无法读取该私钥文件，请选择其他密钥文件或生成新密钥",
          noteTarget: (host: string) => `（连接到 ${host}）`,
          portPrefix: (port: number) => `端口 ${port}`,
        },
        /** Browsing for a key file. What is browsed is the API's own machine:
         *  a private key has to be readable where the product runs. */
        keyBrowser: {
          aria: "应用所在机器上的文件",
          browse: "浏览",
          browseFailed: "无法浏览应用所在机器",
          cancelSelection: "取消选择",
          empty: "该目录下没有文件。",
          folder: "文件夹",
          go: "前往",
          help: "这些文件属于运行 ScienceDiscovery 的机器，既不是本浏览器，也不是远端 SSH 目标机。只会填入所选路径，不会显示文件内容。",
          home: "主目录",
          loading: "正在加载文件…",
          nextPage: "下一页",
          pathLabel: "目录或文件路径",
          previousPage: "上一页",
          selectFile: "选择文件",
          title: "在应用所在机器上选择密钥",
          unavailable: "不可用",
          up: "上一级",
        },
        runnerCommand: "Runner 可执行文件",
        state: {
          connectFailed: "连接失败",
          connecting: "连接中",
          disconnected: "未连接",
          error: "异常",
          ready: "就绪",
          starting: "启动中",
          stopped: "已停止",
          unknown: "未知",
        } as Record<string, string>,
        token: "访问令牌",
        tokenPlaceholder: "远端 runner 的 SCIENCE_AGENT_RUNNER_TOKEN",
        trust: {
          cancel: "取消",
          changed: (target: string) => `${target} 的主机密钥和上次不一样了。`,
          changedBody: "要么这台机器换了密钥，要么中间有人在替它应答。核对过新指纹确实来自这台机器再继续。",
          confirm: "信任并继续",
          unknown: (target: string) => `还不认识 ${target} 的主机密钥。`,
          unknownBody: "这是第一次连这台机器。指纹和机器管理员给你的那份一致，才说明连的是它本身。",
        },
        untrusted: "主机密钥待确认",
        unusable: "当前不可用",
        username: "登录用户",
        usernamePlaceholder: "例如：researcher",
      },
    },
  },

  workspace: {
    newTab: "新标签页",
    artifacts: "产物",
    collapsible: "工作区",
    empty: "这次会话还没有产物。",
    filesEmpty: "工作区里还没有文件。",
    filesTitle: (count: number) => `工作区 · ${count} 个文件`,
    /** The count next to the 工作区 section header, which already says 工作区. */
    filesCount: (count: number) => `${count} 个文件`,
    sessionRoot: "本次会话",
    /** The tree's top row, which is the workspace itself, not a folder in it. */
    root: "工作区根目录",
    /** The age of a workspace file, as the tree states it. */
    justNow: "刚刚",
    minutesAgo: (minutes: number) => `${minutes} 分钟前`,
    hoursAgo: (hours: number) => `${hours} 小时前`,
    open: "打开",
    unsupported: "这个类型暂时没有预览。",
    addTab: "新增页签",
    closeTab: "关闭页签",
    /** The draggable left edge of the panel. */
    resize: "调整面板宽度",
  },

  /** The 三维 structure view that opens for structure files. */
  molstar: {
    loading: "正在读入结构…",
    /** Shown when the plugin itself cannot start, a WebGL context included. */
    initFailed: "结构视图没能启动。",
    viewerAria: (name: string) => `${name} 的三维结构`,
    atoms: (count: number) => `${count} 原子`,
    /** The tooltip on both ways into the full-screen view, the thumbnail and the
     *  document's name above it, which are one switch. */
    expand: "放大到全屏",
    /** The ✕ in the corner of that view. Esc does the same thing. */
    close: "退出全屏",
  },

  /** The one Project this UI keeps, which it creates when none exists. */
  project: {
    defaultName: "我的工作区",
  },

  errors: {
    generic: "操作失败",
    sessionCreate: "创建会话失败",
    /** A response that claims to be an event stream but has no body. */
    noStream: "响应没有可读的流",
    modelRequired: "还没有可用的模型，请先在设置里配置。",
    rename: "重命名失败",
    deleteWarning: (title: string) => `删除「${title}」会连同它的工作区数据一起清掉，且无法恢复。`,
  },

  status: {
    localOnline: "本地运行时 · 在线",
    localDegraded: "本地运行时 · 降级",
    localOffline: "本地运行时 · 离线",
  },
};

/** The shape every language must fill. */
export type Text = typeof ZH;
