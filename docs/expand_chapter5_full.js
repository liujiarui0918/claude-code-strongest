const fs = require('fs');
const path = 'C:/Users/liujiarui/claude-code-strongest/docs/claude-code-codex-strongest-guide.tex';
let tex = fs.readFileSync(path, 'utf8');

const skills = [
['mcp-builder','构建新的 MCP server，覆盖 stdio/HTTP、tool schema、错误处理。','当要给 Claude/Codex 增加外部工具能力时使用。'],
['document-handling','处理 docx/xlsx/pptx/pdf 等二进制文档。','生成或读取 Office/PDF 文件，避免用 cat/grep 读二进制。'],
['lean-context','控制上下文体积，只读取必要内容。','长任务、长文件、多轮会话中防止上下文污染。'],
['using-superpowers','会话开始时选择正确 skill。','进入新任务时先判断该用哪个工作方法。'],
['brainstorming','设计前澄清需求、比较 2--3 个方案。','需求不清、架构选择、产品方案讨论。'],
['writing-plans','把方案拆成可验证的执行任务。','准备落地复杂功能或修复前写 PLAN。'],
['executing-plans','按 1--3 个任务一批执行、验证、汇报。','已经有计划文档，需要稳步落地。'],
['subagent-driven-development','复杂任务每个任务派 fresh subagent，并做 spec review。','计划很长、文件很多、主上下文会被污染。'],
['dispatching-parallel-agents','多个独立任务并行分派。','搜索、审查、验证等可以并行完成的工作。'],
['test-driven-development','严格 RED--GREEN--REFACTOR。','明确 bug 复现或明确 API/行为规格。'],
['systematic-debugging','复现、隔离、修复、验证四阶段调试。','任何真实 bug、安装失败、CLI 异常。'],
['verification-before-completion','完成前必须跑真实验证并读输出。','准备声明 done、提交、发布前。'],
['requesting-code-review','交付前自检和请求代码审查。','完成改动但还没交付/commit 前。'],
['receiving-code-review','处理审查反馈，不盲从也不防御。','收到 reviewer 或用户指出问题后。'],
['using-git-worktrees','用 git worktree 隔离 feature。','需要在不污染 main 的情况下做大改动。'],
['finishing-a-development-branch','收尾分支并给出 merge/PR/keep/discard 选项。','功能完成、测试通过后准备收口。'],
['writing-skills','编写新 skill 的模板和反模式。','要把某套工作方法沉淀成 skill。'],
['condition-based-waiting','异步等待必须等条件，不盲目 sleep。','服务启动、CI、后台任务、文件生成。'],
['root-cause-tracing','沿调用链追到根因，不停在症状。','调试和修复阶段防止补丁式修复。'],
['defense-in-depth','关键不变量需要多层防护。','安全、数据删除、权限、凭证保护。'],
['using-context7','查实时库/框架/SDK 文档。','涉及库 API、配置、版本迁移时。'],
['using-deepwiki','理解公开 GitHub repo 的结构和设计。','研究外部仓库、框架、工具实现。'],
['using-sequential-thinking','复杂多步推理和架构选择。','需要分支、修正、逐步推理的问题。'],
['using-playwright','浏览器自动化、截图和 UI 验证。','前端/UI/网页抓取/真实交互验证。'],
['using-mcp-memory','使用知识图谱 memory MCP。','需要实体、关系、观察记录的长期知识。'],
['using-cron','提醒、定时、循环任务。','每 N 分钟检查、每日运行、定时提醒。'],
['using-task-list','判断是否需要任务列表并维护任务。','3+ 步可追踪工作或多人/多 agent 协作。'],
['using-claude-api','Claude API / Anthropic SDK 参考。','写 Anthropic SDK、模型、tool use、缓存、流式。'],
['extracting-from-images','从截图/图片提取文字、布局、意图。','用户贴图、UI 截图、错误截图。'],
['prompt-engineering','编写和改进 LLM prompt。','需要结构化输出、few-shot、评测 prompt。'],
['incremental-context-building','进入陌生大代码库时分层建立理解。','新项目 onboarding、大型代码库探索。'],
['skill-creator','创建新 skill 的标准化流程。','把成熟流程产品化成可复用 skill。'],
['using-memory','使用 auto-memory 系统，判断什么该记。','用户要求记住偏好或项目事实时。']
];

const agents = [
['planner','规划非平凡实现，输出步骤、关键文件、风险。'],
['code-reviewer','代码质量、可维护性、正确性审查，只读。'],
['security-reviewer','OWASP、secrets、注入、鉴权鉴权审查。'],
['tdd-guide','用 TDD 驱动新功能或 bug 修复。'],
['debugger','系统性复现、隔离、修复、验证 bug。'],
['test-runner','运行测试并解释失败。'],
['refactor-assistant','安全重构，保持行为不变。'],
['doc-writer','README、API 文档、变更日志写作。'],
['api-designer','REST/GraphQL/gRPC API schema 设计。'],
['performance-analyst','先 profiling 后优化，定位性能热点。'],
['pr-reviewer','PR 描述与 diff review。'],
['research-agent','多步研究、资料综合。'],
['explore','快速只读代码库探索、定位符号和引用。'],
['build-fixer','修复构建、类型、lint、工具链错误。'],
['typescript-reviewer','TypeScript 专项审查，关注 any、断言、泛型、async。'],
['python-reviewer','Python 专项审查，关注可变默认值、async、类型。'],
['git-operator','高级 Git 操作，如 rebase、cherry-pick、reflog 恢复。'],
['regex-expert','编写、解释、调试正则。'],
['sql-expert','SQL 查询、schema、索引、迁移和 explain。'],
['prompt-engineer','Prompt 设计、结构化输出、反模式。'],
['migration-assistant','语言/框架迁移，如 Python、React、Django。'],
['accessibility-auditor','WCAG、ARIA、键盘、屏幕阅读器、对比度审查。']
];

const commands = [
['/plan','进入规划模式，先 brainstorm 再写可执行计划。'],
['/tdd','用严格 TDD 实现功能或修 bug。'],
['/verify','运行真实命令验证 claim。'],
['/review','审查当前 diff 或指定路径。'],
['/security-scan','安全扫描：OWASP、secrets、注入、鉴权。'],
['/debug','系统性调试：复现、隔离、修复、验证。'],
['/refactor','安全重构，先看测试覆盖。'],
['/worktree','创建隔离 git worktree。'],
['/deep-research','多源深度研究并综合报告。'],
['/ship','分支收尾：验证后选择 merge/PR/keep/discard。'],
['/onboard','新代码库 onboarding，识别结构、栈和关键文件。'],
['/think','用 sequential-thinking 做复杂推理。'],
['/explain','解释代码、错误或概念。'],
['/gen-tests','为文件或函数生成测试。'],
['/changelog','根据 git 历史生成 Keep a Changelog 条目。'],
['/eli5','用类比给小白解释技术概念。'],
['/regex','按需求编写正则和测试用例。'],
['/cleanup','清理当前 diff 中死代码、未用 import、TODO、console.log。'],
['/deps-audit','审计依赖过期、漏洞、未使用。'],
['/skills','列出可用 skills。'],
['/memory-search','搜索 auto-memory。'],
['/mcp-status','检查 MCP 配置状态。'],
['/backup','备份 Claude Code 配置为 zip。'],
['/agents','列出可用 agents。'],
['/doctor','诊断 Claude Code 配置健康。']
];

const hooks = [
['block-dangerous.ps1','PreToolUse Bash/PowerShell','拦截 git reset --hard、force push、--no-verify、系统关机/格式化等危险命令。'],
['protect-secrets.ps1','PreToolUse Read/Edit/Write/Bash/PowerShell','保护 .env、SSH private key、AWS credentials、auth.json、token 等敏感文件。'],
['protect-linter-configs.ps1','PreToolUse Edit/Write/MultiEdit','防止为了通过检查而修改 ESLint、Prettier、tsconfig 等质量门配置。'],
['auto-format.ps1','PostToolUse Edit/Write','编辑后自动格式化，减少风格噪音。'],
['typecheck.ps1','PostToolUse Edit/Write async','编辑后异步类型检查，尽早发现破坏。'],
['command-log.ps1','PostToolUse Bash/PowerShell','记录命令审计日志，方便追溯。'],
['session-start-context.ps1','SessionStart','注入 git 状态、最近提交、可用 skills/agents/MCPs。'],
['smart-context.ps1','UserPromptSubmit','根据用户 prompt 提示合适 skill 和注意事项。'],
['notify.ps1','Notification','桌面通知。'],
['stop-sound.ps1','Stop','任务完成提示音。'],
['precompact-backup.ps1','PreCompact','压缩上下文前备份 transcript。'],
['subagent-stop.ps1','SubagentStop','记录 subagent 结束事件。'],
['statusline.ps1','statusLine','每 10 秒刷新状态行，显示项目、分支、模型等上下文。'],
['backup-config.ps1','命令辅助','供 /backup 调用，备份配置。'],
['mcp-doctor.ps1','诊断辅助','检查 MCP 配置和依赖。'],
['post-compact-restore.ps1','压缩辅助','压缩后恢复或提示上下文。']
];

function esc(s){return s.replace(/\\/g,'\\textbackslash{}').replace(/_/g,'\\_').replace(/&/g,'\\&').replace(/%/g,'\\%').replace(/#/g,'\\#').replace(/\$/g,'\\$').replace(/\{/g,'\\{').replace(/\}/g,'\\}').replace(/\^/g,'\\^{}').replace(/~/g,'\\textasciitilde{}');}
function rows(arr){return arr.map(r => r.map(esc).join(' & ') + ' \\\\').join('\n');}
function table(cols, header, arr){return `\\begin{longtable}{${cols}}\n\\toprule\n${header} \\\\\n\\midrule\n${rows(arr)}\n\\bottomrule\n\\end{longtable}`;}

const screenshotText = String.raw`
\section{小白图文流程：从中转站到 cc-switch}

下面九张图来自 \texttt{docs/images/}，对应 \texttt{guide-for-beginners.md} 的完整上手流程。它们被合并进 PDF，是为了让没有任何基础的用户也能按图操作。

\subsection{中转站控制台：URL、Key、模型名}

图 \ref{fig:relay-api-info} 展示中转站控制台右侧 API 信息区域，用户需要复制一个接口 URL。注意 URL 末尾不要加 \texttt{/}。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/1.png}
\caption{中转站控制台：右侧 API 信息区域显示多个可用域名。}
\label{fig:relay-api-info}
\end{figure}

图 \ref{fig:relay-token} 展示令牌管理页面，用户从这里复制 API Key。Key 只能放在 cc-switch 或脚本参数里，不能提交到 Git，也不能写进文档。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/2.png}
\caption{令牌管理页：复制 API Key。}
\label{fig:relay-token}
\end{figure}

图 \ref{fig:model-id} 展示模型广场里模型详情页右上角的模型 ID。不同中转站模型名可能不同，必须以控制台显示为准。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/3.png}
\caption{模型详情：复制模型 ID。}
\label{fig:model-id}
\end{figure}

图 \ref{fig:model-price} 展示分组价格。相同模型在不同分组可能价格差很多，选择令牌前要确认分组和倍率。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/4.png}
\caption{模型详情：查看分组价格，选择成本合适的分组。}
\label{fig:model-price}
\end{figure}

\subsection{cc-switch：添加 provider、模型映射、路由代理}

图 \ref{fig:ccswitch-provider} 展示 cc-switch 添加 provider 的界面。这里填写供应商名称、API Key 和请求地址。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/5.png}
\caption{cc-switch provider 编辑页：填写 API Key 和请求地址。}
\label{fig:ccswitch-provider}
\end{figure}

图 \ref{fig:ccswitch-models} 展示获取模型列表和模型映射。推荐把 Opus 映射到最强模型，Sonnet 映射到日常模型，Haiku 映射到低成本执行模型。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/6.png}
\caption{cc-switch 获取模型列表：为 Opus / Sonnet / Haiku 配置映射。}
\label{fig:ccswitch-models}
\end{figure}

图 \ref{fig:openai-endpoint} 展示模型端点类型。如果显示 \texttt{openai: /v1/chat/completions}，Claude Code 侧需要开启 cc-switch 的 Claude 路由转换。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/7.png}
\caption{模型广场：端点显示 openai，说明需要路由转换。}
\label{fig:openai-endpoint}
\end{figure}

图 \ref{fig:ccswitch-route} 展示路由设置页。需要打开路由总开关，并启用 Claude 路由。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/8.png}
\caption{cc-switch 路由设置：打开总开关和 Claude 路由。}
\label{fig:ccswitch-route}
\end{figure}

图 \ref{fig:ccswitch-proxy-green} 展示主界面代理图标变绿，表示路由代理已启用。

\begin{figure}[htbp]
\centering
\includegraphics[width=0.82\textwidth]{images/9.png}
\caption{cc-switch 主界面：代理图标变绿表示路由已启用。}
\label{fig:ccswitch-proxy-green}
\end{figure}
`;

const chapter = String.raw`
\chapter{为什么是 Strongest：完整配置资产逐项拆解}

\begin{infobox}
本章是全书亮点。Claude Code Codex Strongest 的强，不是因为名字里有 Strongest，而是因为它把 Claude Code 与 Codex 两套 CLI、VS Code 插件、cc-switch 模型路由、CLAUDE.md 全局规则、docs 方法文档、33 个 skills、22 个 agents、25 个 commands、16 个 hook 脚本、settings.json 生命周期配置、MCP servers、安全边界和真实验证流程整合为一套可安装、可复用、可审计的工程系统。
\end{infobox}

\section{Strongest 的判定标准}

一个真正强的 AI 编程配置，不应该只回答“能不能聊天”，而要回答五个工程问题：第一，普通用户能否一键装好；第二，复杂任务能否被拆成计划、实现、审查、验证；第三，危险操作和密钥泄漏能否提前拦住；第四，模型、工具、文档、浏览器、Git 能否接入同一条工作流；第五，产物能否被真实命令证明可用。

本项目的答案是：用一键安装器负责环境，用 \texttt{CLAUDE.md} 和 docs 负责规则，用 skills 负责方法，用 agents 负责角色分工，用 commands 负责入口，用 hooks 负责安全和自动化，用 settings.json 负责生命周期注册，用 MCP 负责外部能力，用 Codex 的 \texttt{AGENTS.md} 和 \texttt{config.toml} 负责第二套 CLI 的隔离配置。

\section{CLAUDE.md：全局入口，不是普通 README}

\texttt{CLAUDE.md} 是 Claude Code 每次会话自动加载的高优先级指令入口。它本身很短，但通过模块引用把真正的规则拆到四个文档：

${table('p{0.22\\textwidth}p{0.66\\textwidth}','文件 & 作用',[
['CLAUDE.md','会话总入口。声明全局规则、模块引用、已安装 skills/agents/commands/MCPs/hooks、备份和 doctor 命令。'],
['docs/environment.md','定义 OS、Shell、PowerShell 兼容规则、路径约定、不要用 Unix-only 命令等环境规则。'],
['docs/workflow.md','定义沟通风格、非平凡任务先 plan、Edit 前必须 Read、验证要求、研究搜索策略。'],
['docs/tools.md','定义 skills、subagents、MCP、cron 的使用边界，强调优先用工具而不是重头实现。'],
['docs/safety.md','定义 Git、安全、destructive ops、反模式，明确 reset/force push/删除目录/改系统配置前必须确认。']
])}

这种拆分的强点在于：\texttt{CLAUDE.md} 不臃肿，规则又足够完整；每个模块可以单独维护，安装器只要部署整套目录，就能让新会话自动继承工作方法。

` + screenshotText + String.raw`

\section{33 个 Skills：把专家方法固化成可触发流程}

Skills 是本项目最核心的“方法论层”。它们不是简单提示词，而是给不同任务类型准备的操作规程。下面逐个列出：

${table('p{0.24\\textwidth}p{0.38\\textwidth}p{0.28\\textwidth}','Skill & 作用 & 典型场景', skills)}

\section{22 个 Agents：把复杂任务交给专门角色}

Agents 是“角色层”。当任务需要大量上下文、专项知识或并行处理时，主线程不应该自己吞下所有文件，而应把任务分给专门 agent。

${table('p{0.26\\textwidth}p{0.62\\textwidth}','Agent & 职责', agents)}

\section{25 个 Commands：把工作流变成一条入口}

Commands 是“入口层”。新手不用背完整 prompt，只要知道自己要规划、调试、审查、验证，就能通过 slash command 进入正确流程。

${table('p{0.24\\textwidth}p{0.64\\textwidth}','Command & 用途', commands)}

\section{Hooks：把安全、质量和上下文自动化}

Hooks 是“安全网”。模型可能忘记规则，但 hook 在工具调用前后执行，能把关键边界从“靠自觉”变成“靠机制”。仓库中 hook 脚本如下：

${table('p{0.26\\textwidth}p{0.24\\textwidth}p{0.40\\textwidth}','Hook & 注册/用途位置 & 作用', hooks)}

\section{settings.json：生命周期编排核心}

\texttt{settings.template.json} 是 Claude Code 侧的生命周期编排模板。安装器不会简单复制固定 \texttt{settings.json}，而是渲染占位符：\texttt{\{\{CLAUDE\_HOME\}\}}、\texttt{\{\{ANTHROPIC\_AUTH\_TOKEN\}\}}、\texttt{\{\{ANTHROPIC\_BASE\_URL\}\}}、\texttt{\{\{ANTHROPIC\_MODEL\}\}}、\texttt{\{\{TIMEZONE\}\}} 等。

\subsection{环境变量设计}

${table('p{0.34\\textwidth}p{0.54\\textwidth}','变量 & 说明',[
['ANTHROPIC_AUTH_TOKEN','只有用户显式传入 token 时才写入；默认删除，避免安装器保存凭证。'],
['ANTHROPIC_BASE_URL','只有用户显式指定 Base URL 时写入；通常推荐由 cc-switch 管理。'],
['ANTHROPIC_MODEL','可选模型钉住，用于中转站或脚本化安装。'],
['ANTHROPIC_DEFAULT_HAIKU_MODEL','与 ANTHROPIC_MODEL 同步，兼容后台轻量模型调用。'],
['EDITOR','默认 code --wait，让编辑操作进入 VS Code。'],
['CLAUDE_HOOKS_LOG_DIR','指向 ~/.claude/logs，供 hooks 写审计和诊断日志。'],
['CLAUDE_DISABLED_HOOKS','保留禁用 hook 的开关，便于临时排障。']
])}

\subsection{statusLine 与 permissions}

\texttt{statusLine} 每 10 秒执行 \texttt{hooks/statusline.ps1}。它让会话底部能显示项目、分支、模型或其他上下文。\texttt{permissions.deny} 默认拒绝高危 PowerShell 命令：\texttt{Format-Volume}、\texttt{Stop-Computer}、\texttt{Restart-Computer}、\texttt{Clear-RecycleBin}、\texttt{Remove-PSDrive}。这属于防御纵深：即使模型误判，权限层和 hook 层也会先拦一次。

\subsection{生命周期注册矩阵}

${table('p{0.18\\textwidth}p{0.22\\textwidth}p{0.24\\textwidth}p{0.26\\textwidth}','事件 & Matcher & 脚本 & 效果',[
['PreToolUse','Bash|PowerShell','block-dangerous.ps1','命令执行前拦截危险 shell/Git/系统操作。'],
['PreToolUse','Read|Edit|Write|Bash|PowerShell','protect-secrets.ps1','读取或修改前保护密钥类文件。'],
['PreToolUse','Edit|Write|MultiEdit','protect-linter-configs.ps1','防止通过改 linter 配置绕过质量检查。'],
['PostToolUse','Edit|Write','auto-format.ps1','编辑后自动格式化。'],
['PostToolUse','Edit|Write','typecheck.ps1','编辑后异步类型检查。'],
['PostToolUse','Bash|PowerShell','command-log.ps1','记录命令审计。'],
['SessionStart','-','session-start-context.ps1','会话开始注入 git 状态和项目上下文。'],
['UserPromptSubmit','-','smart-context.ps1','根据用户 prompt 提醒合适 skill。'],
['Notification','-','notify.ps1','桌面通知。'],
['Stop','-','stop-sound.ps1','结束提示音。'],
['PreCompact','-','precompact-backup.ps1','上下文压缩前备份 transcript。'],
['SubagentStop','-','subagent-stop.ps1','记录 subagent 停止。']
])}

\section{为什么这些组合起来才是 Strongest}

单独的 \texttt{CLAUDE.md} 只是规则；单独的 skill 只是方法；单独的 agent 只是角色；单独的 hook 只是拦截器；单独的 MCP 只是工具。Claude Code Codex Strongest 的强点，是把它们串成闭环：用户提出需求后，smart-context 提醒方法，skills 定义流程，commands 提供入口，agents 分担复杂任务，hooks 防止越界，MCP 补充外部能力，settings.json 负责注册，doctor/verify 给出证据，Codex 作为独立第二栈补充执行与对照能力。

这就是第五章要论证的重点：Strongest 不是“大而全”的堆料，而是“每一层都有职责，每一层都能被安装器部署，每一层都能被验证”的工程化系统。
`;

const start = tex.indexOf('\\chapter{为什么是 Strongest');
const end = tex.indexOf('\\chapter{Codex 配置}');
if (start < 0 || end < 0 || end <= start) throw new Error(`bad boundaries ${start} ${end}`);
tex = tex.slice(0,start) + chapter + '\n' + tex.slice(end);
fs.writeFileSync(path, tex, 'utf8');
console.log('rewrote chapter5 full inventory');
