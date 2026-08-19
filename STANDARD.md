# DSH 插件规范（DSH Plugin Standard）

> 本文件是 DSH 插件开发的**正式规范**，不是建议文档。新插件必须遵循，存量插件必须限期整改。

| 项目 | 值 |
|---|---|
| 规范状态 | **Adopted（正式生效）** |
| 规范版本 | 2.0.0 |
| 生效日期 | 2026-08-19 |
| 维护者 | DSH 插件维护组（本仓库） |
| 适用范围 | 本仓库所有插件、profile `web` 装配的插件、官方外部插件集成、host-plane 插件、agent preset、workspace 插件族 |
| 关联文档 | 《插件评审报告》、`.dshwolf/buglog.json`、`dsh-agent-teams/docs/developing-dsh-plugins.md`、`dsh-ai-prompt-optimizer/docs/develop-ts-plugin.md` |
| 合规校验 | `npx dsh-plugin-standard <插件目录>` 或 `node scripts/verify-plugin.mjs <插件目录>`（见附录 A） |

---

## 0. 强制语义与裁决

### 0.1 语义等级（RFC 2119 风格）

- **MUST**：绝对要求。不满足 = 不合规，**不得发布、不得装配、评审直接拒绝**。
- **MUST NOT**：绝对禁止。出现即不合规。
- **SHOULD**：强烈建议。不满足需在文档中记录取舍理由，否则评审应指出。
- **SHOULD NOT**：强烈不建议。除非有明确理由。
- **MAY**：可选项，无强制。

### 0.2 违规后果矩阵

| 等级 | 后果 |
|---|---|
| MUST / MUST NOT 违规 | 阻塞发布与装配；CI `verify-plugin` 失败；code review 直接拒绝 |
| SHOULD 违规 | 评审必须指出；作者需说明理由或列入整改 TODO |
| 安全/数据红线（§9） | 立即隔离（fail-soft）、回滚、限期修复 |

### 0.3 例外流程

1. 申请例外必须写成书面说明，包含：违反的条文号、违反原因、缓解措施、恢复计划。
2. 例外必须由维护组评审通过，并记录在本规范“变更记录”中。
3. 例外默认有效期为一个发布周期，到期未恢复视为 MUST 违规。

### 0.4 变更流程

- 修改本规范必须更新版本号与“变更记录”，并跑通 `dsh-plugin-standard/scripts/verify-plugin.mjs` 全量回归。
- 新增 MUST 条文必须配套可执行检查项
- （`verify-plugin.mjs` 同步更新），防止“规范写了但无人检查”。

---

## 1. 核心原则

- **P1（MUST）最小运行面**：只有需要浏览器 UI 才声明 client；只有需要运行时能力（服务、HTTP、持久化、工具、定时器）才做 bundle 插件；只改 prompt/工具面/装配、无运行时能力时用 agent preset。
- **P2（MUST）单一事实源**：包名、patch name、源码导出 name、client wrapper id、README 安装命令必须一致；Remote 契约只保留一份 descriptor，其他投影由生成或测试比对。
- **P3（MUST）生命周期可清理**：route、listener、timer、watcher、DOM、React root、子进程、临时 service 全部归 `ctx.effect`/disposer；卸载后不得残留回调、样式、进程或文件句柄。
- **P4（MUST）默认拒绝 / 最小暴露**：本地 HTTP 一律校验回环 + Host + Origin/Sec-Fetch-Site；body 设上限；错误不向客户端透传内部细节；高权限操作必须鉴权、确认、可回滚。
- **P5（MUST）可验证、可发布**：`typecheck/build/test/verify/npm pack` 脚本齐备；发布产物（tgz/Git）必须与 `files` 和 README 声明一致；关键正确性修复必须带回归测试。

---

## 2. 包与装配契约

### 2.1 package.json

- **2.1.1（MUST）** `"type": "module"`。
- **2.1.2（MUST）** `main`、`types`、`exports` 全部指向真实存在的 `lib/` 产物；任何入口不得指向不存在的文件。
- **2.1.3（MUST）** 有 client 的包必须同时存在 `exports["./client"]` 与 `dsh.client.platform: "web"`；host-only 包不得声明 `./client` 或 `dsh.client`。
- **2.1.4（MUST）** `dsh.bundle.patch` 必须指向真实存在的顶层数组 YAML（通常是 `cordis.patch.yml`）。
- **2.1.5（MUST）** `dsh.client.inject` 写**包名**（浏览器模块依赖），不是 Cordis 服务名；服务名写在 client 源码的 `export const inject`。
- **2.1.6（MUST）** 共享 DSH/Cordis/React 运行时放 `peerDependencies`；`dependencies` 中出现 `@deepseek-ai/*` 视为 MUST 违规（除非例外获批）。
- **2.1.7（MUST）** 包名一致性：`package.json.name` = `cordis.patch.yml` 中 insert 的 `name` = client wrapper 的 `id` = Remote/Typert manifest 的 `package` = README 安装命令使用的包名。源码 `export const name` 是 Cordis 插件标识，可为短名（如 `agent-teams`），但**若带 scope（含 `/`）则必须等于包名**，禁止旧 scope 残留（`verify-plugin` 自动检查）。
- **2.1.8（SHOULD）** 声明 `engines.node`（如 `>=22`），CI 锁同一 Node 版本。
- **2.1.9（SHOULD）** `files` 使用显式清单并覆盖 package.json `scripts` 与 README 引用的全部相对路径（含截图/资产）。
- **2.1.10（SHOULD）** `private: false` 时提供 `publishConfig`、`repository`、`homepage`、`bugs`、`license`。

### 2.2 cordis.patch.yml

- **2.2.1（MUST）** 顶层 YAML 数组，`insert` 行 `id` 全局唯一、`name` 等于包名。
- **2.2.2（MUST）** 覆盖前层时 `config` 按行 id 整段替换并重述所需键，不依赖深合并。
- **2.2.3（MUST NOT）** 不手写用户 profile manifest；`dsh plugin` 负责维护 bundles 列表。
- **2.2.4（MUST）** patch insert 的 `name` 必须可解析：等于 bundle 包名，或为聚合 bundle（一个包装配多个插件行）下被本包 `dependencies`/`peerDependencies` 引用的子包名；禁止指向旧 scope 或未声明依赖的包。
- **2.2.5（MUST NOT）** `id` 与客户端/服务 key 隐含耦合。

### 2.3 多包 workspace / 发布产物

- **2.3.1（MUST）** 每个子包的 `exports` 必须与构建脚本实际产物逐一核对；tsc 输出 `lib/client/index.js` 时不得声明 `exports["./client"]: "./lib/client.js"`。
- **2.3.2（MUST）** 声明 `exports["./client"]` 的包必须配套 `dsh.client` 字段；client 构建必须产出对应 `.d.ts` 或调整 types 指向。
- **2.3.3（MUST）** `npm pack --dry-run` 必须通过；发布前比对 tgz 内 `package.json`、`cordis.patch.yml`、`lib/` 与源树一致（`verify-plugin` 提供 `--pack` 检查）。
- **2.3.4（MUST）** README 的 Files 段、安装命令、截图路径必须与实际目录/包内容一致；跨平台命令必须标注平台限制。

---

## 3. Host 开发规范

### 3.1 插件形态

- **3.1.1（MUST）** 函数插件：`export const name/inject/Config/apply`；`Config` 用 `@deepseek-ai/schemastery`，默认值放 schema。
- **3.1.2（MUST）** Service 插件：`Service` + `[Service.init]` 异步启动；构造器只声明 service key。
- **3.1.3（MUST）** `inject` 只等服务，不等兄弟插件的 provider effect；依赖兄弟行为必须在首次真正使用处 fail-loud，不在 `apply()` 抢跑。

### 3.2 生命周期与资源所有权

- **3.2.1（MUST）** route、listener、timer、watcher、socket、React root、DOM、临时 service、子进程全部由当前 fiber 的 `ctx.effect(() => disposer, label)` 拥有。
- **3.2.2（MUST）** `ctx.on`/`host.on`/`window.addEventListener` 必须显式包进 `ctx.effect` 或由 disposer 移除，不得依赖框架隐式清理。
- **3.2.3（MUST）** disposer 顺序：停止外部入口/注销 registry → 取消/等待在途工作 → 关闭资源。
- **3.2.4（MUST）** 异步轮询、fetch、timeout、归档必须带 cancelled/unmount 守卫；卸载后不得 setState/回写旧输入。

### 3.3 HTTP / WebServer 路由

- **3.3.1（MUST）** 所有自定义路由（含只读 GET）统一做**回环 + Host + Origin/Sec-Fetch-Site** 校验；禁止“只读路由例外”。
- **3.3.2（MUST）** 写操作路由：方法白名单、body 大小上限（256KB–1MB）、JSON 形状校验、参数白名单。
- **3.3.3（MUST）** 路径参数防路径穿越：`decodeURIComponent` 包 try、剥离路径后查白名单、`realpath` 二次 confine。
- **3.3.4（MUST）** 敏感/实时快照响应 `Cache-Control: no-store`；错误统一返回固定 code/文案，`error.message`/`String(error)` 只写服务端日志。
- **3.3.5（MUST NOT）** 让任意网页通过 DNS rebinding/CSRF 触发本机高成本操作（LLM 调用、注入、卸载、文件改写、配置变更）。

### 3.4 工具（tools）

- **3.4.1（MUST）** `description` 写清何时调用、前置条件、失败语义和副作用；`parameters` 与 `output.schema` 使用 `@deepseek-ai/dsh-tools` value-schema DSL。
- **3.4.2（MUST）** `output.render` 返回稳定、紧凑、可判定的文本。
- **3.4.3（MUST）** 从 `exec.agent` 取会话/工作区/owner，不从全局进程状态猜。
- **3.4.4（MUST）** 长任务观察/转发 `exec.signal`；写操作有幂等、锁或冲突策略。
- **3.4.5（MUST）** 高成本/长耗时工具必须有超时、预算上限、异步化或成本提示。
- **3.4.6（SHOULD）** 子代理/成员工具隔离使用 `toolFilter.deny` 明确裁剪高权限工具（bash/fs/web），默认拒绝高于默认放行。

### 3.5 持久化与并发

- **3.5.1（MUST）** 人可读 JSON 写入：同目录临时文件 + `fsync` + `rename` 原子发布；禁止 `writeFileSync` 直接覆盖。
- **3.5.2（MUST）** 同一资源读改写串行化：进程内 promise 链/锁；跨进程用 no-clobber（`link()`+`unlink()`）或数据库事务。
- **3.5.3（MUST）** 追加日志处理 torn tail；增量统计必须检测日志重写/收缩（首 seq/长度/revision），不能只 `consumed < count`。
- **3.5.4（MUST）** 数据库 CAS：`UPDATE` 与版本递增必须在同一事务；失败不得 bump。
- **3.5.5（MUST）** 所有 timer/interval/异步初始化清理必须注册进 disposer，不能只在失败分支清理。
- **3.5.6（MUST NOT）** 用 `rename()` 静默覆盖并发创建目标；依赖 `process.cwd()` 散落用户数据。
- **3.5.7（MUST NOT）** 删除/恢复逻辑按“字符串行号”截断 patch/配置；必须以解析后的完整块为单位操作并保留后续内容。

### 3.6 子进程 / 外部程序

- **3.6.1（MUST）** 使用 `spawn` 非 shell 执行，参数固定数组；禁止拼接 shell 字符串。
- **3.6.2（MUST）** 可执行文件路径固定包内路径或校验绝对路径/白名单；用户可配置的 `pythonBin`/CLI 路径等同代码执行入口，必须有明确警告或确认。
- **3.6.3（MUST）** 子进程有超时、退出/error 监听、`kill` 兜底；后台/缓存路径也要可取消，不留孤儿进程。
- **3.6.4（MUST）** 透传凭据只取当前后端所需的最小环境变量。

### 3.7 高权限操作（注入器、隔离器、文件改写等）

- **3.7.1（MUST）** 任意代码执行（`new Function`/eval/动态 import 用户脚本）、shell、HTTP 写、patch/profile/package.json 改写、官方文件打补丁，都要：鉴权 + 显式确认 + 可回滚 + 操作审计。
- **3.7.2（MUST）** 改写内核/第三方文件：先备份原文件，按内容 hash/模板锚点校验后再写；禁止无备份“特征重打”。
- **3.7.3（MUST）** 自愈/自动恢复必须有失败退避和最大轮次；坏版本不得导致宿主启动循环崩溃。

---

## 4. Client 开发规范

### 4.1 类型与构建

- **4.1.1（MUST）** Host 与 Client 使用两个 tsc program（host 排除 `src/client`，client 含 DOM/react-jsx），避免 `Context` 同名声明污染。
- **4.1.2（MUST）** 含 JSX 的文件必须是 `.tsx`。
- **4.1.3（MUST）** Client bundle 输出 `window.__ModuleLoader__.load({ id, factory })`；`react` 外部化，`zod` 等浏览器模块表不认识的运行时按需内联。
- **4.1.4（MUST）** 浏览器 import 遵守模块表：纯类型可跨包；跨插件值协作走 Cordis service/remote/slot。

### 4.2 UI 生命周期与安全

- **4.2.1（MUST）** slot 注册、controller、listener、style、DOM、React root 全部随 client fiber dispose；使用 `ctx.effect(() => ctx.slots.inject(...))`。
- **4.2.2（MUST）** per-session 状态按 `SessionId` 分桶；会话 close/dispose 时清理缓存（fetches、listeners、entry map），不能只靠全局 reset/TTL。
- **4.2.3（MUST NOT）** 用户/模型内容禁止 `dangerouslySetInnerHTML`；错误消息、候选文本用 React 文本节点渲染。
- **4.2.4（MUST）** 轮询：`no-store`、in-flight 防重叠、响应形状校验、unmount 防护；失败保留最后成功快照。
- **4.2.5（MUST）** 弹窗/浮层支持 Esc、焦点陷阱/还原、`aria-*`、`:focus-visible`、reduced motion；导航即收起。
- **4.2.6（MUST）** 异步提交按钮有 ref 互斥，不能只依赖 state 渲染后的 disabled。
- **4.2.7（SHOULD）** 优先语义化 slot，不用 body portal；确需 portal 时按 `shell.overlay` 等官方接缝。

---

## 5. 数据正确性规范

- **5.1（MUST）** 增量统计必须检测日志重写/收缩并整体重折；重复 `(turn,step)` 样本必须按 key 索引扣除旧值，不能只与 last 比较。
- **5.2（MUST）** 消息投递：一个消息只能投一次；入队成功不等于消费成功，ack 应在实际消费/下一 idle 后；mailbox fallback 与 live wake 必须共享同一 per-recipient FIFO/锁。
- **5.3（MUST）** 业务 id 生成规则在 host/client 必须一致；可重复业务 id 作历史/归档 key 时要复合 owner。
- **5.4（MUST）** attempt/capability 边界对非 owner 强制校验；reassign/remove 清空 attemptId 时不得留下可绕过窗口。
- **5.5（MUST）** 进程内任务/历史在文档中标注“重启丢失”；所有进程内 Map 要有清理策略（LRU、会话删除、链尾删除）。

---

## 6. 验证与发布门禁

- **6.1（MUST）** package.json scripts 至少覆盖：`typecheck`、`build`、`test`（有逻辑时）、`verify`、`pack`（或 `npm pack --dry-run`）。
- **6.2（MUST）** CI：typecheck + test + build + `npm pack --dry-run` + `npm audit`；`engines.node` 与 CI Node 一致。
- **6.3（MUST）** 关键修复必须配套回归测试：超时/取消、卸载清理、并发竞态、重写检测、patch 去重、路径逃逸、ReDoS。
- **6.4（MUST）** 发布前校验：`npm pack --dry-run` 只含必要文件；tgz 内 `package.json`/`cordis.patch.yml` 与源树一致；README 引用的资源全部在 `files` 内。
- **6.5（MUST）** 从全新 profile 按 README 命令安装成功，`--dump-config` 能看到插件行；Host/Client 接口变更后在隔离 DSH_HOME + 独立端口做 e2e，不碰运行实例。
- **6.6（MUST NOT）** 发布 `private: true` 或包含 `.venv`、`node_modules`、`scores/`、`backup/` 等非必要产物。
- **6.7（MUST NOT）** README 声称 UI/功能但发布物中不存在对应代码/文件。

---

## 7. 特殊形态规范

### 7.1 Host-plane 插件（mode-boost、super-injector 等）

- **7.1.1（MUST）** 满足标准 bundle 契约；打包后 tgz 内仍有 `dsh.bundle.patch` 与 `cordis.patch.yml`。
- **7.1.2（MUST）** 替换 system prompt 时禁止整段丢弃既有 persona/section；采用 section 合并并保留安全/语言约束。
- **7.1.3（MUST）** 高权限能力按 §3.7 执行。

### 7.2 Agent preset（router-standard 等）

- **7.2.1（MUST）** 边界：仅改 prompt/工具面/装配、无服务/timer/HTTP/持久化/client → agent preset；有任一运行时能力 → bundle 插件。
- **7.2.2（MUST）** `files` 覆盖 `scripts` 引用的所有路径；`npm test` 的 import 必须与真实目录结构一致。
- **7.2.3（MUST）** 装配引用只允许目录内文件；README Files 段、安装命令、文件名保持单一事实源。
- **7.2.4（MUST）** 每个修复配单测锚定；发布前比对 tgz 与当前 `files` 产物。

### 7.3 官方外部插件（modlens、openwolf 等）

- **7.3.1（MUST）** 集成前按本规范安全基线审查：HTTP 鉴权一致、临时文件/子进程策略、默认资源开销、隐式写入用户工作区、工具数量对上下文的膨胀。
- **7.3.2（MUST NOT）** 对上游问题本地 patch 后自行发布；优先提交/等待上游修复，本地只通过配置关闭对应入口。
- **7.3.3（MUST）** 会写 `AGENTS.md`/`.dshwolf` 的插件，首次启用前明确告知用户，或默认关闭。

---

## 8. 合规门禁（落地方式）

为了让规范真正被执行，所有插件必须满足以下落地要求：

1. **（MUST）合规校验脚本**：每个插件仓库 `package.json` 的 `verify` 必须运行 `node scripts/verify-plugin.mjs .`（或引用本仓库的共享校验脚本），CI 中必须包含该检查。
2. **（MUST）评审门禁**：code review 以本规范为唯一依据，评审时按附录 B Checklist 逐项核对；MUST 违规直接拒绝合并。
3. **（MUST）发布门禁**：打 tag/发布前必须通过 `verify-plugin --pack`，确认 tgz 与源树一致。
4. **（SHOULD）README 声明**：插件 README 增加“规范遵循：DSH 插件规范 v2.0（DSH_PLUGIN_RULES.md）”一行，并注明已运行 `verify-plugin`。
5. **（SHOULD）AGENTS.md 引用**：插件仓库的 `AGENTS.md` 指向本规范，让后续 coding agent 在开工前加载。

---

## 9. 红线清单（Do-Not-Repeat，全部 MUST）

以下问题在本仓库真实发生，任何插件不得重新引入：

1. **dsh-at-file 不用本地 link 修改版**：profile 使用官方 release；本地工作区修改必须与官方版本明确区分。
2. **patch 去重必须“同 id 保留最后一条”**：src/scripts 共用同一 `lib/patch.js`。
3. **增量统计必须检测日志重写**：live 会话校验首 seq/长度/revision；重复样本按 key 扣除旧值；HTTP 回环端点校验 Origin/Sec-Fetch-Site。
4. **autoDream 机器写入必须传 `{ actor: 'autoDream' }`**：避免污染反思数据。
5. **update_task 对成员强制 attempt_id**：attemptId 缺失/清空/重派窗口不得提交终态。
6. **LLM 流必须有超时/取消**：Host 60s AbortController + Promise.race；Client 65s 超时 + mountedRef + disposer abort。
7. **文件读取工具必须与索引共用敏感文件 denylist**：`wolf_file` 之类不能绕过 `.env`/密钥跳过规则；symlink 用 `realpath` 二次 confine。
8. **隔离/恢复工具不得截断 patch**：按完整块删除并保留后续内容；写配置/补丁先备份、原子写、可回滚。
9. **坏插件自愈必须有退避**：不得让自动恢复导致宿主启动循环崩溃；测试期用 `dev_inject_plugin`，验证通过后才持久化装配。
10. **patch name / client wrapper id / Remote/Typert package 必须等于包名**；源码 `export const name` 若带 scope 必须等于包名（禁止旧 scope 残留）。发布前 `verify-plugin` 自动检查。
11. **打包后必须校验 tgz 元数据**：tgz 内必须含 `dsh.bundle.patch` 与 `cordis.patch.yml`。
12. **Remote 契约禁止三处手写**：以 descriptor 为唯一源，Typert manifest 自动派生或用测试比对。

---

## 附录 A：合规校验脚本用法

```sh
# 方式一：从规范包/全局运行（无需复制到插件仓库）
npx dsh-plugin-standard .

# 方式二：插件仓库内置校验脚本（复制自规范包 scripts/verify-plugin.mjs）
node scripts/verify-plugin.mjs

# 校验指定插件目录
node scripts/verify-plugin.mjs /path/to/dsh-my-plugin

# 发布前深度校验（含 npm pack --dry-run 与 tgz 内容比对）
node scripts/verify-plugin.mjs /path/to/dsh-my-plugin --pack

# JSON 输出（供 CI 解析）
node scripts/verify-plugin.mjs /path/to/dsh-my-plugin --json
```

退出码：0 = 无 MUST 违规；1 = 存在 MUST 违规；2 = 目录不可用/参数错误。

检查范围（对应本规范条文）：
- 2.1.1–2.1.10 manifest 完整性
- 2.2.1–2.2.4 patch 契约
- 2.3.1–2.3.4 exports/files/发布一致性
- 2.1.7 包名一致性（name / patch / src / client id）
- 2.1.6 共享运行时 peer 化
- 6.1 scripts 门禁

## 附录 B：评审 Checklist（Code Review 必过）

- [ ] `verify-plugin` 通过（0 MUST 违规）
- [ ] `package.json.name`、patch `name`、源码 `export const name`、client wrapper `id`、README 安装名一致
- [ ] `exports`/`types`/`files` 指向真实产物；`npm pack --dry-run` 通过；tgz 与源树一致
- [ ] host-only 无 `./client`/`dsh.client`；client 包有 `exports["./client"]` + `dsh.client.platform: "web"` + 包名 `inject`
- [ ] 所有资源（route/listener/timer/watcher/DOM/style/React root/子进程/临时 service）在 `ctx.effect`/disposer 内
- [ ] 所有 HTTP 路由做回环 + Host + Origin/Sec-Fetch-Site；body 上限；错误不泄露
- [ ] 持久化：tmp + fsync + rename；并发锁/no-clobber；重写检测；事务原子
- [ ] 工具 schema/description/render 完整；长任务有超时/预算/异步；高权限工具有隔离
- [ ] client 无 `dangerouslySetInnerHTML`；per-session 缓存随会话清理；轮询有 unmount 防护
- [ ] `typecheck`、`build`、`test`、`verify`、`pack` 全部通过；CI 含 audit/pack
- [ ] 从全新 profile 按 README 安装成功；隔离 e2e 通过；未触碰运行实例
- [ ] 红线清单（§9）全部满足

---

## 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2026-08-19 | 初稿（规则文档） |
| 2.0.0 | 2026-08-19 | 升级为正式规范：RFC 2119 强制语义、违规后果矩阵、例外流程、变更流程、合规门禁（verify-plugin）、附录 A/B、红线清单编号化 |
