# 前端：`apps/desktop`

`apps/desktop` 是同一 workspace 内的第二个 React 工作台，按 v0.1 设计稿实现，目标是替换 `apps/web`，也是 Electron 外壳加载的前端。在 `SCIENCE_AGENT_WEB_DIR` 改指之前，根路径仍由 `apps/web` 提供；两个前端共用同一个控制 API 和同一个 token key，因此切换时不需要二次登录。

## 1. 技术栈与和 `apps/web` 的关系

- React 19、Vite、`@vitejs/plugin-react`、原生 CSS；没有 router、状态库和 UI kit，约束与 `apps/web` 相同。
- Markdown 只经由 `react-markdown` 与 `remark-gfm` 渲染。
- 类型来自 `@sciencediscovery/schema`，由 `src/api/types.ts` 用 `import type` 再导出。这个再导出把 schema 的 barrel 挡在浏览器 bundle 之外；在那里加一个值导入会把整个 catalog 拉进 `dist`。
- `apps/desktop` 不依赖任何 service，也不依赖其他 app。架构检查把 `apps/*` 视为 host，所以这个方向是允许的，而 package 永远不能反向依赖它。

## 2. 源码布局

| 路径 | 用途 |
|---|---|
| `src/main.tsx` | 入口：消费 `#token=`，然后挂载 |
| `src/App.tsx` | 启动闸门（auth / loading / offline / wizard / shell）与两栏装配 |
| `src/local-access-token.ts` | fragment 写入 `localStorage["sciencediscovery-token"]` 后清除 fragment |
| `src/api/` | `client.ts`、`stream.ts`、`models.ts`、`sessions.ts`、`types.ts` |
| `src/app/use-workspace.ts` | 全部应用状态和所有写入；唯一负责顺序的地方 |
| `src/app/bootstrap.ts` | 两个启动判断：连接状态，以及采用哪个模型作为默认 |
| `src/app/session-order.ts` | 侧栏排序规则，纯函数 |
| `src/run-stream/` | `model.ts`（状态形状、文本合并）与 `reducer.ts`（事件折叠） |
| `src/views/` | 一个界面一个文件：`Sidebar`、`SessionBar`、`Conversation`、`Composer`、`SetupWizard`、`ModelForm`，以及若干对话框 |
| `src/text.ts` | 当前语言、语言 store，以及所有组件读取的 `TEXT` proxy |
| `src/text/zh.ts`、`src/text/en.ts` | 两种语言的全部用户可见文案；`Text` 即 `typeof ZH`，英文词典会逐 key 校验 |
| `src/styles/` | 设计稿的级联，按原型自身的分节标记拆分 |

## 3. 与服务端通信

请求统一走 `ApiClient`：注入 `authorization: Bearer <token>`，非 2xx 转成携带服务端 `error`、`code`、`details` 的 `ApiRequestError`。`PUT /api/settings` 是整对象写入，所以 `setGlobalModel()` 总是先读、再把已有 override 原样回传、只改一个字段；省略的字段会被 `store.replaceGlobalSettings` 抹掉。

流式响应使用 `fetch` 加 `body.getReader()`，不用 `EventSource`，因为 token 必须走 header。`SseFrameDecoder` 以空行分帧、忽略 `:` 保活、并缓存尚未收到结束符的半帧——chunk 边界可能落在任何位置，包括 `\r` 与 `\n` 之间。帧携带 `id: <n>`，即 `?after=` 的续传游标；重连时从已见的最大值继续，而不是重放整个 run。

两个流入口含义不同：

| 调用 | 含义 |
|---|---|
| `POST /api/sessions/:id/messages` | 发送一条消息并流式返回它启动的 run；服务端在终态关闭响应，所以响应体结束即 run 结束 |
| `GET /api/sessions/:id/runs/:runId/events?after=N` | 跟进一个仍在运行的 run；打开一个最新 run 尚未结束的 Session 时从这里续接 |

客户端断开不会取消任何东西。只有 `POST /api/sessions/:id/runs/(:runId|current)/cancel` 能停止 run，因此输入区的停止按钮是离开正在运行的回合的唯一出口。也正因如此，允许在 run 运行中离开 Session：run 在服务端继续，再次打开该 Session 会重新跟进。运行中切走是用户继续处理其他事情的方式，所以侧栏和新建会话按钮都不会因此禁用。

新增会话按钮在**点击时**就用 `POST /api/projects/:id/sessions` 创建 Session，而不是等第一条消息。侧栏列的是服务端已有的 Session，一个只存在于界面里的草稿会让按钮看起来失效，也会让第一条消息像是凭空多创建了一个 Session；先创建意味着点击、侧栏和输入区从第一秒起说的就是同一个 Session。没有打开 Session 时发送第一条消息走同一条创建路径，所以两个入口只产生一个 Session；创建请求在途时重复点击会复用同一个请求。删除当前打开的 Session 会回到无 Session 的草稿态，下一条消息再创建——删除之后自行补一个空 Session 不是这个应用该做的决定。

最近列表保留全部 Session，而不是停在某个固定条数：它占用侧栏剩余高度，超出后自行滚动，滚动条在列表右缘，品牌区和新增会话保持不动——隐藏一个仍然存在的 Session，读起来就像它被删了。列表只在一个方向滚动：`overflow-y: auto` 会把另一轴也算成 `auto`，一行稍宽就会在底部出现横向滚动条；因此 `overflow-x` 设为 `hidden`，滚动条本身是一条 8 px 的细轨道。

## 4. 事件到 UI 的映射

| 事件 | UI |
|---|---|
| `run.queued`、`run.started` | run id 与模型名；启动 run 的 `POST` 不返回 id，所以在这里取得 |
| `assistant.thinking.delta`、`assistant.thinking.snapshot` | 折叠的「思考过程」块；snapshot 替换、delta 追加，截断的 snapshot 不会让屏幕上已有的内容变短 |
| `assistant.response.started`、`assistant.delta`、`assistant.snapshot` | 每次模型调用一个正文块，所以被工具调用打断的回合会渲染成两段 |
| `assistant.response.settled` | 正文块停止显示 spinner |
| `run.status` | 终态判断，使用与服务端关闭响应时相同的状态集合 |
| `run.completed` | 已持久化的消息优先于拼装的 delta；流式块被封口 |
| `run.failed`、`run.cancelled` | 失败码与取消原因显示在 run 状态行 |
| `run.history.truncated` | 提示更早的事件无法重放 |
| `artifact.*`、`plan.*`、`subagent.*`、`agent.*`、`session.updated` | 有意延后；单独计数，不计入「未知事件」 |

对话是两个人的两侧：读者自己的回合在右侧，头像是一个默认的灰色人形剪影——用形状而不是过去代表读者的字，因为那个字读起来像角色徽标；模型回答在左侧，配模型名的首字母。用户回合的正文在 DOM 中位于头像**之前**，网格把它放在右列、头像在外缘，这样读屏软件和窄窗口都会先遇到正文再遇到装饰。气泡按内容收缩，最宽 560 px，而不是铺满整列。

正在运行的 run 追加在已持久化的对话之后，并在运行结束后由重新读取清除，所以答案只出现一次。对于刚刚发送的消息，先由 pending 消息渲染出来——它比按下发送晚一秒出现，而不是同一帧，因为与按下同时出现的占位符读起来像预设动画而不是回执；而流真正产生的内容立即绘制。流式指示属于**某个 response**，而不是整个 turn：只有 `settled` 仍为 false 的那个 response 在转。用「是不是这个 turn 的最后一个 response」判断会给每个 turn 都画上转圈，因为每个 turn 都有自己的最后一个 response。

自动唤醒不绘制卡片。唤醒本身没有用户撰写的正文——schema 有意把面向模型的 prompt 排除在 `content` 之外，正是为了不让唤醒被当成用户输入——所以它的卡片曾是一条带头像的空白条，说不出任何下面那个 run 没说清楚的事。该消息仍保留在 `messages` 中，它属于服务端持久化的对话记录。

## 5. 首次运行

`GET /api/models` 返回空列表即首次运行条件，因为没有模型就什么都发不出去。向导随后走完 provider 配置和数据目录说明，模型步骤必须通过 `POST /api/models/:id/test` 才能进入主界面。

下面的顺序由 API 决定，而不是偏好：`PUT /api/settings` 会按当前模型目录归一化，并丢弃指向不存在 profile 的 `modelId`。

1. `POST /api/providers` —— 当 base URL 已有 provider 时改走 `PUT /api/providers/:id`，以免修正 key 后留下重复项。
2. `POST /api/providers/:id/models` —— `{model}` 是唯一必填字段；手填的模型名与自动发现的走同一条路径。
3. `POST /api/models/:id/test`。
4. `PUT /api/settings`，带上合并后的 overrides。

列表按钮走 `POST /api/providers/preview-models`，用表单里当前的 endpoint 和 key 现场拉取且不持久化——`GET /api/providers/:id/models` 要求先保存一个半填好的 provider。列不出模型的网关是预期情况，模型名始终可以手填。

preset 提供 `apiProtocol` 与 `apiVariant`；只有自定义分支才询问 protocol，因为正确的 URL 配错 variant 会被读成 key 有问题。

数据目录记录在 `localStorage` 中并且只用于显示，不生效：没有任何路由可以读取或修改运行中的数据目录，它来自服务的启动参数。向导会说明这一点。

首次运行之外的模型配置有意不在这一层：主界面会在输入区的模型 pill 里列出已配置的模型，但之后新增或测试 profile 的设置界面不属于这一层。

## 6. 开发与测试

```bash
pnpm --filter @sciencediscovery/desktop dev      # 127.0.0.1:5174，/api 与 /health 代理到 4310
pnpm --filter @sciencediscovery/desktop test     # tsx --test tests/*.test.ts
pnpm --filter @sciencediscovery/desktop build    # -> apps/desktop/dist
pnpm --filter @sciencediscovery/desktop exec vite preview   # 构建产物跑在 4174，同样代理
```

`localStorage` 按 origin 隔离，所以 token 每个前端都要注入一次：首次打开 `http://127.0.0.1:5174/#token=<token>`。token key 与 `apps/web` 共用，同 origin 下不需要重复注入。

要让这个应用占用根路径而不使用内置路径，用 `SCIENCE_AGENT_WEB_DIR=apps/desktop/dist` 重启即可；静态目录在启动时读取。

测试覆盖传输层（bearer header、401 归类、SSE 分帧，包括注释帧和拆分 chunk）、reducer（思考与正文折叠、snapshot 与 delta、截断 snapshot、终态封口、计数器，以及只会前进的续传游标）、启动判断（空目录、已有默认不被改写、默认指向已删除 profile 时被替换）、侧栏的最近排序、对话（运行中的 run 始终在末尾、刚发送的消息立即显示自己的文本而 run 占位符要等一拍、唤醒通知不绘制卡片、读者回合使用默认剪影且正文在头像之前），以及输入区的模型 pill。

## 相关文档

- [Web 前端](web-frontend.md) — 当前根路径前端
- [控制面](control-plane.md) — 路由及其契约
- [配置参考](../reference/configuration.md) — `SCIENCE_AGENT_WEB_DIR` 与 `SCIENCE_AGENT_AUTH_TOKEN`
