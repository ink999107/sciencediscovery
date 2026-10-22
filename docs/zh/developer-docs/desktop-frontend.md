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
| `src/app/tool-io.ts` | 把工具的入参与结果拆成可展示的分节：每个值一节，按值的形状而不是它被起的名字来分；纯函数 |
| `src/run-stream/` | `model.ts`（状态形状、文本合并）、`reducer.ts`（事件折叠）、`permission.ts`（哪些请求还没答复、一条授权会覆盖哪些请求）与 `replay.ts`（用事件重建一次已结束的 run，以及它在 transcript 里的落点） |
| `src/views/` | 一个界面一个文件：`Sidebar`、`SessionBar`、`Conversation`、`AssistantTurn`、`Composer`、`SetupWizard`、`ModelForm`，以及若干对话框 |
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
| `GET /api/sessions/:id/runs/:runId/events?after=N` | 以 SSE 跟随一个已存在的 run；同一个 URL 按 JSON 读就是已结束 run 的重放，重建时间线走的是这一条，因为它自己会结束，而不是一条需要主动关闭的流 |

客户端断开不会取消任何东西。只有 `POST /api/sessions/:id/runs/(:runId|current)/cancel` 能停止 run，因此输入区的停止按钮是离开正在运行的回合的唯一出口。也正因如此，允许在 run 运行中离开 Session：run 在服务端继续，再次打开该 Session 会重放它并接着跟随还活着的那条。运行中切走是用户继续处理其他事情的方式，所以侧栏和新建会话按钮都不会因此禁用。

新增会话按钮在**点击时**就用 `POST /api/projects/:id/sessions` 创建 Session，而不是等第一条消息。侧栏列的是服务端已有的 Session，一个只存在于界面里的草稿会让按钮看起来失效，也会让第一条消息像是凭空多创建了一个 Session；先创建意味着点击、侧栏和输入区从第一秒起说的就是同一个 Session。没有打开 Session 时发送第一条消息走同一条创建路径，所以两个入口只产生一个 Session；创建请求在途时重复点击会复用同一个请求。删除当前打开的 Session 会回到无 Session 的草稿态，下一条消息再创建——删除之后自行补一个空 Session 不是这个应用该做的决定。

最近列表保留全部 Session，而不是停在某个固定条数：它占用侧栏剩余高度，超出后自行滚动，滚动条在列表右缘，品牌区和新增会话保持不动——隐藏一个仍然存在的 Session，读起来就像它被删了。列表只在一个方向滚动：`overflow-y: auto` 会把另一轴也算成 `auto`，一行稍宽就会在底部出现横向滚动条；因此 `overflow-x` 设为 `hidden`，滚动条本身是一条 8 px 的细轨道。

## 4. 事件到 UI 的映射

| 事件 | UI |
|---|---|
| `run.queued`、`run.started` | run id 与模型名；启动 run 的 `POST` 不返回 id，所以在这里取得 |
| `assistant.thinking.delta`、`assistant.thinking.snapshot` | 折叠的「思考过程」块；snapshot 替换、delta 追加，截断的 snapshot 不会让屏幕上已有的内容变短 |
| `assistant.response.started`、`assistant.delta`、`assistant.snapshot` | 每次模型调用一个正文块，所以被工具调用打断的回合会渲染成两段 |
| `assistant.response.settled` | 正文块停止显示 spinner |
| `run.status` | 终态判断，使用与服务端关闭响应时相同的状态集合；它带的那个 run 同时带来 `startedAt` 与 `finishedAt`，折叠行的「用时」就取自这两者 |
| `run.completed` | 已持久化的消息优先于拼装的 delta；流式块被封口 |
| `run.failed`、`run.cancelled` | 失败码与取消原因显示在 run 状态行 |
| `run.history.truncated` | 提示更早的事件无法重放 |
| `tool.started`、`tool.completed` | 「工具调用」卡片，按调用发生时所在的回答下标插进回答块之间 |
| `permission.required`、`permission.resolved` | 带三个按钮的「需要权限」卡片，按 `request.id` 归并，因此重发来的快照不会把决定撤销掉 |
| `artifact.*`、`plan.*`、`subagent.*`、`agent.*`、`session.updated` | 有意延后；单独计数，不计入「未知事件」 |

有两个事件需要表格之外的解释。工具调用是**落位**的而不是罗列的：`AssistantTool` 记下 `after`，即它所跟随的那条 `responses` 的下标，`-1` 表示「在第一条回答之前」。方向要看准：`after === i` 是排在第 i 条回答**之后**，因为这个值是在 `tool.started` 到达时按 `responses.length - 1` 记下的，而那一刻模型刚刚说完第 i 条；把它当成「插在第 i 条之前」会让工具卡跑在它所解释的那句话前面。这正是 agent 循环的形状：模型说一段话、调一次工具、再被重新调用。`tool.completed` 不重复携带参数，所以 reducer 从 start 事件把它们带过来；更早的记录若仍然重复携带，则以完成事件里那份为准。

对话是两个人的两侧：读者自己的回合在右侧，头像是一个默认的灰色人形剪影——用形状而不是过去代表读者的字，因为那个字读起来像角色徽标；模型回答在左侧，配模型名的首字母。用户回合的正文在 DOM 中位于头像**之前**，网格把它放在右列、头像在外缘，这样读屏软件和窄窗口都会先遇到正文再遇到装饰。气泡按内容收缩，最宽 560 px，而不是铺满整列。

一次 run 在提问与回答之间做的所有事情都折进一行，而且这一行从 run 一开始就是折叠着的、不是等结束才折：一次上百轮的 run 只占 transcript 的一行而不是上百行，而且它在 run 工作的整个过程中都在，而不是停下之后才出现。刚发出的消息靠那条待发消息来渲染它，但要晚一秒才画，而不是跟按下发送挤在同一帧——占位行跟按键同时出现，看起来像一段写死的动画，而不是收到了消息；而流里真正产出东西时则立刻画出来。运行时那行标题写「正在思考」，旁边是一圈转动的圆环，这也是 transcript 里唯一会动的图标，于是这行不用让人去信一个静止的字形就知道正在干活；run 在等待而不是在工作时写「排队中」或「等待授权」，图标保持静止，因为等待不等于工作。结束后写「用时 12 分 3 秒」，取自 run 带来的 `startedAt` 与 `finishedAt`，圆环也随之消失。这两个时间还不存在时记下的老 run 没有可度量的跨度，退回显示它的状态词。流式指示属于**某个 response**，而不是整个 turn：只有 `settled` 仍为 false 的那个 response 在转。用「是不是这个 turn 的最后一个 response」判断会给每个 turn 都画上转圈，因为每个 turn 都有自己的最后一个 response。

有两样东西刻意留在折叠之外。一是回答：整个 run 里**最后一条有正文的** response，于是模型可以被重新调用十几次，用户看到的一直是他在等的那句话边生成边长（带转圈）；而且在 run 还在跑时它必须属于**最新那一轮**，否则那句引出工具调用的话会在整个工具执行期间被当成结果显示，之后再被收进折叠里。二是未答复的授权卡，那是一句问**读者**的话：把提问折进收起的一行里，会让这次 run 看起来毫无来由地停住了。普通的一问一答中间什么都没有，因此一行也不出；同理，一个什么都没留下的 run（开了轮次却没吐出任何正文，比如网关直接拒了）连角色名那行也不出——只有状态条，否则屏幕上会多出一个顶着第二个头像、底下一片空白的模型名。

工具的输出根本不在 run state 里。它写进自己的子流 `tool-<toolCallId>`，卡片在第一次展开时读一次 `GET /api/sessions/:id/runs/:runId/streams/:streamId/events`——这是几个读取入口里唯一的 JSON 路由，因为它读的是另一条流。用 `?after=0` 重放的 run 里**完全没有** `tool.output`，只有指向子流的 `tool.completed` trace，所以指针必须由 trace 携带。直播响应确实会把那些帧扇出来，而它们不带 `id:` 行；它们被单独放进一个集合丢弃，既不计数为未知事件，也不推进重放游标。

思考过程没有持久化形式：`ChatMessage` 只带最终文本。因此打开会话时会重放它的 run，并把每一条重建放回**它自己那条**回答的位置；当重放没有产生可见内容时回退到已存储消息——这正是「重连后什么都没拿到」不会渲染出空白回答的原因。

被重放的是**每一次已终结的 run**，不只是最近那一次，而且每次 run 各占一份 state：reducer 用事件自带的 `turn` 号做 key，而这些编号在每个 run 里都从 1 重新开始，把两次 run 折进同一份 state 会让第二次 run 的第 1 轮悄悄并进第一次的。一个跑过好几轮的会话因此每次 run 一份重建——被自动唤醒打断的那一次，会在「唤醒」通知的另一侧带着自己的思考与工具调用重现，而不是只留下一句没有来历的回答。轮次编号来自服务端、每个 run 各自从 1 开始，所以同一段 transcript 的两节可能都从「第 1 轮」起；这里不做重新编号，因为连续编号会打印出服务端从未给过的数字。

落位按消息走：一条重建会顶替它那次 run 写下的回答，而没写过回答的 run（比如先被取消）跟在开启它的那条消息之后。两处都对不上的 run 才会落到 transcript 末尾。还在直播的 run 还没有持久化回答，所以它一直排在最后，直到下一次 `settle` 重新读取会话、把它和其余的一起折进去。

自动唤醒本身不再绘制卡片。唤醒没有用户撰写的正文——schema 有意把面向模型的 prompt 排除在 `content` 之外，正是为了不让唤醒被当成用户输入——所以它的卡片曾是一条带头像的空白条，说不出任何下面那个 run 没说清楚的事。但那条消息仍留在 `messages` 里：唤醒所启动的那次 run 正锚在它这里，删掉它会把那次 run 送到 transcript 末尾，而不是送到事情发生的位置。

对一次重放要问两个问题，而它们并不相同。第一个是值不值得留下：没有任何持久化事件的 run 会折成一个空 state，留下它等于在 transcript 里挂一段空白的回合。第二个是能不能顶替已存储的回答：只有写出回答的 run 才能，所以在开口之前就失败或被取消的 run 保留它的状态行——那是它全部的下落说明——而已存储的消息留在原地。混淆这两者，正是让一次失败的 run 在界面上不留任何痕迹的原因。

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

测试覆盖传输层（bearer header、401 归类、SSE 分帧，包括注释帧和拆分 chunk）、reducer（思考与正文折叠、snapshot 与 delta、截断 snapshot、终态封口、各类计数、权限请求与答复、工具 trace，以及折叠行「用时」所依据的那两个时间——记下之后不会被后来的快照挪动）、重放层（把一份日志折成收口状态、重建的三种锚点，以及哪些 run 值得留——空日志不值得，回答之前就失败的 run 保留状态条但不隐藏已存储消息）、transcript 合并本身（重放的 run 就地顶替自己那条回答、没有重放的 run 保留持久化回答、没有回答的 run 跟在开启它的消息之后、重放里没被答复的授权渲染为不可点、直播中的 run 排在最后、刚发出的消息先立刻画出自己、run 的占位行则等到那一拍之后、唤醒通知不画卡片但那次 run 仍锚在它发生的位置）、折叠本身（运行时写「正在思考」、结束写「用时 …」、只有模型真的在工作时那一行才转圆环而排队和结束时都不转、没有跨度时退回状态词、思考与工具调用在折叠内、未答复的授权或正在运行的工具调用那句话在折叠外）、工具卡的两个纯函数层（主字段按名字而不是按位置选取、单个参数显示为裸值而不是 JSON、带标记的结果拆成多节且标记前的文字留作残余节、调用失败时残余节标注为 Error、Runner 占位符被丢弃而不是当成数据显示）、启动判断（空目录、已有默认不被改写、默认指向已删除 profile 时被替换）、侧栏的最近排序，以及输入区的模型 pill。

## 相关文档

- [Web 前端](web-frontend.md) — 当前根路径前端
- [控制面](control-plane.md) — 路由及其契约
- [配置参考](../reference/configuration.md) — `SCIENCE_AGENT_WEB_DIR` 与 `SCIENCE_AGENT_AUTH_TOKEN`
