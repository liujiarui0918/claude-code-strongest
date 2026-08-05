from pathlib import Path

path = Path(r"C:/Users/liujiarui/claude-code-strongest/docs/claude-code-codex-strongest-guide.tex")
text = path.read_text(encoding="utf-8")

chapter5 = r'''
\chapter{为什么是 Strongest：Claude Code Codex Strongest 的核心工作系统}

\begin{infobox}
本章是全书核心。Claude Code Codex Strongest 的“强”不是来自某一个模型、某一个插件、某一个提示词，而是来自一套完整闭环：\textbf{双 CLI 栈 + 一键安装 + 模型路由 + Skills 方法论 + Subagents 分工 + Slash Commands 入口 + Hooks 安全网 + MCP 外部能力 + Codex 隔离配置 + 可验证工作流}。这些层叠加后，用户拿到的不是空白 Claude Code 或空白 Codex，而是一个从安装、登录、规划、实现、审查、调试、验证、发布到排错都预先设计好的工程系统。
\end{infobox}

\section{Strongest 的定义：不是更会聊天，而是更会把工程做完}

很多 AI 编程环境只解决“能不能问模型”这个问题。Claude Code Codex Strongest 要解决的是“能不能稳定、低成本、可验证地把真实工程任务做完”。因此本项目的目标不是让用户多装几个工具，而是把 AI 编程拆成一条可执行流水线：

\begin{enumerate}[leftmargin=2em]
  \item \textbf{环境先统一}：Windows / macOS 一键安装 VS Code、Git、Node.js、uv、Claude Code、Codex、VS Code 扩展、cc-switch 和配置模板。
  \item \textbf{入口先明确}：Claude Code 通过 \texttt{claude} 与 \texttt{anthropic.claude-code} 工作；Codex 通过 \texttt{codex} 与 \texttt{openai.chatgpt} 工作。
  \item \textbf{模型先分工}：用 cc-switch 管理 Claude Code 的 provider、Base URL、API key、模型映射和 OpenAI 格式路由；Codex 通过 \texttt{codex login} 保持独立登录态。
  \item \textbf{方法先固化}：Skills 把 brainstorming、planning、TDD、debugging、verification 等方法变成可复用规则，而不是每次重新提醒。
  \item \textbf{任务先拆开}：Subagents 让探索、审查、安全、构建修复、调试等重上下文任务交给专门角色，主线程不被污染。
  \item \textbf{风险先拦截}：Hooks 拦截危险命令、保护 secrets、记录命令、注入上下文、提示合适 skill。
  \item \textbf{外部能力先接好}：MCP servers 提供实时文档、GitHub repo 知识、浏览器验证、时间、fetch、memory、git 等能力。
  \item \textbf{验证先成为门槛}：安装器、doctor、verify 命令和工作流规则都强调“没跑过不算完成”。
\end{enumerate}

这就是 Strongest 的核心含义：\textbf{不是一次回答更漂亮，而是每一次任务都有路径、有角色、有安全边界、有验证证据。}

\section{能力分层总览}

\begin{longtable}{p{0.18\textwidth}p{0.26\textwidth}p{0.30\textwidth}p{0.18\textwidth}}
\toprule
能力层 & 项目提供什么 & 为什么强 & 典型使用场景 \\
\midrule
安装层 & Windows / macOS 一键安装器、bootstrap、Release 双击入口 & 新手不用手动拼装 Git、Node、CLI、VS Code 扩展、MCP 与配置目录 & 初次安装、换机、重装 \\
双栈 CLI & Claude Code CLI + Codex CLI & 同时保留 Claude Code 工作流和 Codex 工作流，互为补充，不把用户锁死在单一工具 & 日常开发、对比方案、备用执行 \\
VS Code 层 & \texttt{anthropic.claude-code} + \texttt{openai.chatgpt} + 中文语言包 + Office Viewer & 编辑器里同时具备 Claude / Codex 入口，中文界面和文档预览开箱即用 & 代码编辑、文档查看、插件交互 \\
模型路由层 & cc-switch、provider、模型映射、OpenAI 格式代理 & 中转站、官方 API、多模型选择都能集中管理，避免手改环境变量 & 低价模型、备用线路、多供应商 \\
方法论层 & 33 skills & 把“怎么做任务”固化成可调用流程，而不是临时发挥 & 规划、TDD、调试、验证、研究 \\
角色层 & 22 subagents & 重上下文任务由专门角色处理，主线程只编排和验收 & 大范围搜索、代码审查、安全审查 \\
命令层 & 25 slash commands & 常见工作流一条命令进入，降低新手门槛 & \texttt{/plan}、\texttt{/review}、\texttt{/debug} \\
安全层 & 12 lifecycle hooks + permissions & 危险 Git、系统命令、secrets、lint 绕过在工具调用前被拦截 & 防误删、防泄密、防绕过质量门 \\
外部知识层 & 8 MCP servers & 当前文档、GitHub repo 知识、浏览器验证、时间、fetch、memory、git 能接入工作流 & 查库文档、UI 验证、repo 研究 \\
验证层 & \texttt{/doctor}、installer verify、Codex doctor、真实命令输出 & 不靠“看起来对”，而靠 exit code、输出、文件存在、扩展列表证明 & 安装验收、发布前检查 \\
\bottomrule
\end{longtable}

\section{双 CLI 栈：Claude Code 与 Codex 为什么要一起装}

Claude Code Codex Strongest 同时安装两套 AI 编程入口：

\begin{itemize}[leftmargin=2em]
  \item \textbf{Claude Code 侧}：\texttt{@anthropic-ai/claude-code}，命令为 \texttt{claude}，VS Code 插件为 \texttt{anthropic.claude-code}，配置目录为 \texttt{\textasciitilde/.claude}。
  \item \textbf{Codex 侧}：\texttt{@openai/codex}，命令为 \texttt{codex}，VS Code 插件为 \texttt{openai.chatgpt}，配置目录为 \texttt{\textasciitilde/.codex}。
\end{itemize}

这样设计有三个实际收益。第一，Claude Code 的 skills、subagents、commands、hooks 和 MCP 工作流非常成熟，适合复杂工程编排。第二，Codex CLI 与 OpenAI/ChatGPT 插件提供另一套模型和交互路径，适合对比实现、备用执行和不同供应商策略。第三，两套工具共享项目文档和工程规则，但凭证与运行态隔离，避免一个工具的登录态或缓存污染另一个工具。

\begin{warnbox}
双栈不等于复制凭证。Claude Code 的 \texttt{settings.json}、\texttt{.claude.json}、hooks 和登录态不会原样复制给 Codex；Codex 的 \texttt{auth.json} 也不会被安装器写入或提交。两边共享的是工作流知识，不共享 secrets。
\end{warnbox}

\section{从小白到可用：完整上手路径}

本项目把 \texttt{docs/guide-for-beginners.md} 的新手流程合并到完整指南中。真正的新手路径可以按下面顺序走。

\subsection{第一步：选择 API 中转站并拿到三样东西}

直接使用官方 API 往往需要境外支付方式和稳定网络。很多用户会使用 API 中转站来解决支付、网络、价格和多模型接入问题。注册中转站后，需要准备三项信息：

\begin{longtable}{p{0.18\textwidth}p{0.30\textwidth}p{0.42\textwidth}}
\toprule
项目 & 示例 & 注意事项 \\
\midrule
URL / Base URL & \texttt{https://codex101.site} & 复制控制台提供的接口地址，末尾不要带 \texttt{/}。主域名不可用时可换备用域名。 \\
API Key & \texttt{sk-xxxxxxxx} & 从令牌管理页复制。不要粘贴到聊天、Git、截图、README 或 issue 里。 \\
模型名称 & \texttt{claude-opus-4-8}、\texttt{gpt-5.5} & 不同中转站模型 ID 可能不同，必须以控制台“模型广场”显示为准。 \\
\bottomrule
\end{longtable}

如果中转站有“分组价格”，同一模型在不同分组可能价格差很多。选择令牌和模型时要确认分组、倍率、是否支持长上下文、是否走 Anthropic 原生接口或 OpenAI 兼容接口。

\subsection{第二步：在 cc-switch 里配置 Claude Code provider}

安装器不再弹 API key 输入框。安装完成后，cc-switch 是 Claude Code 的 provider 管理入口：

\begin{enumerate}[leftmargin=2em]
  \item 打开桌面或开始菜单里的 \textbf{CC Switch}。
  \item 点击右上角 \texttt{+} 添加 provider。
  \item 填写供应商名称、API Key、请求地址。
  \item 保存后进入 provider 编辑页，点击“获取模型列表”。
  \item 在模型映射中配置 Opus / Sonnet / Haiku 三个角色。
  \item 如果中转站声明支持 1M 长上下文，勾选“声明支持 1M”。
  \item 回到主界面点击 Enable，使当前 provider 变成启用状态。
\end{enumerate}

推荐角色分工如下：

\begin{longtable}{p{0.16\textwidth}p{0.30\textwidth}p{0.34\textwidth}}
\toprule
角色 & 推荐用途 & 示例 \\
\midrule
Opus / 高智模型 & 架构设计、复杂 bug、方案评审、计划生成 & \texttt{/model opus} 或供应商里的强模型 ID \\
Sonnet / 均衡模型 & 日常开发、普通修改、解释代码 & \texttt{/model sonnet} \\
Haiku / 低成本模型 & 执行已有计划、轻量后台任务、批量整理 & \texttt{/model haiku} \\
\bottomrule
\end{longtable}

\subsection{第三步：OpenAI 格式中转站要打开 Claude 路由代理}

如果模型广场显示端点类似 \texttt{openai: /v1/chat/completions}，而不是 Anthropic 原生 \texttt{/v1/messages}，Claude Code 不能直接按 Anthropic API 读取它，需要 cc-switch 做格式转换。操作步骤：

\begin{enumerate}[leftmargin=2em]
  \item 在 cc-switch 顶部点击齿轮进入设置。
  \item 切换到“路由”选项卡。
  \item 打开“路由总开关”。
  \item 打开 Claude 对应的“路由启用”。
  \item 回到主界面，确认顶部代理图标变绿。
\end{enumerate}

纯 Anthropic 格式的 Claude 中转站一般不需要这一步；填好 Key、URL 并 Enable 即可。

\subsection{第四步：验证 Claude Code 与 Codex 都接通}

Claude Code：

\begin{lstlisting}[language={}]
claude
/model
\end{lstlisting}

若报 \texttt{auth error} 或 \texttt{connection refused}，优先检查：provider 是否 Enable、URL 是否多了尾部斜杠、OpenAI 格式模型是否打开路由代理、API key 是否属于正确分组。

Codex：

\begin{lstlisting}[language={}]
codex --version
codex login
codex doctor --summary --ascii --no-color
\end{lstlisting}

一次真实 Windows 验证中，安装器完成后输出了 \texttt{codex-cli 0.139.0}，\texttt{codex doctor} 返回 exit code 0，并显示 \texttt{15 ok | 1 idle | 2 notes | 2 warn | 0 fail degraded}。其中 WebSocket timeout warning 不等于安装失败，只表示 WebSocket 可能被网络策略拦截，HTTPS fallback 仍可能可用。

\section{为什么第 5 章是亮点：闭环工作流}

Strongest 的价值不在于“装得多”，而在于所有能力能连成闭环。下面以“实现一个复杂功能”为例。

\begin{enumerate}[leftmargin=2em]
  \item \textbf{讨论需求}：用高智模型进入 brainstorming，明确用户目标、边界、非目标、风险和验收标准。
  \item \textbf{写计划}：用 \texttt{/plan} 或 writing-plans 生成可执行计划，每个任务都有文件、改动、验证命令和成功标准。
  \item \textbf{执行计划}：低成本模型或执行窗口按 \texttt{@PLAN.md} 逐步落地，避免重新发散。
  \item \textbf{分派角色}：大范围搜索交给 explore，构建错误交给 build-fixer，安全问题交给 security-reviewer，复杂 bug 交给 debugger。
  \item \textbf{防护边界}：block-dangerous 阻止危险命令，protect-secrets 阻止读取密钥，protect-linter-configs 防止绕过质量门。
  \item \textbf{补外部知识}：context7 查实时库文档，deepwiki 读公开 GitHub repo，playwright 做浏览器验证。
  \item \textbf{真实验证}：运行测试、doctor、安装器、CLI、扩展列表或浏览器操作；没有输出证据就不算完成。
  \item \textbf{发布收口}：确认 git diff、提交信息、release 附件、bootstrap URL、README 与实际仓库一致。
\end{enumerate}

单点工具只能完成其中一两步；本项目把每一步都做成默认路径。

\section{推荐工作流：高智讨论 + 低智落地}

这是成本和效果都最优的使用方式，也是本项目最想推广的核心实践。

\subsection{核心思路}

\begin{lstlisting}[language={}]
高智模型负责“想清楚”  ->  低智模型负责“按图纸干活”
\end{lstlisting}

复杂任务真正烧钱的部分通常不是敲代码，而是需求澄清、架构权衡、边界情况、失败路径和验证设计。把这些交给最强模型，得到一份清晰计划；再把执行交给便宜模型，整体成本可以大幅下降，同时质量更稳定。

\subsection{阶段一：用最强模型讨论并产出计划}

\begin{enumerate}[leftmargin=2em]
  \item 打开 Claude Code，切到最强模型，例如 \texttt{/model opus} 或供应商提供的高智模型。
  \item 用多轮对话描述背景、目标、约束、已有代码、不能做什么、验收标准。
  \item 主动要求模型找边界情况：例如“还有哪些失败路径我没想到？”、“这个方案哪里会踩坑？”。
  \item 要求输出计划文档，例如 \texttt{PLAN.md}，计划必须包含任务、文件、改动、验证命令、成功标准。
  \item 对特别重要的任务，可以开两个窗口：一个 Claude，一个 GPT/Codex；让一个写方案，另一个审查，轮流迭代。
\end{enumerate}

\subsection{阶段二：新窗口低成本执行}

\begin{enumerate}[leftmargin=2em]
  \item 新开一个 Claude Code 窗口，保持干净上下文。
  \item 切到低成本模型，例如 \texttt{/model haiku} 或供应商中的便宜执行模型。
  \item 引用计划文档执行：
\end{enumerate}

\begin{lstlisting}[language={}]
@PLAN.md 请严格按照这份计划文档的步骤落地实现，
不要偏离计划，遇到不确定的地方先停下来问我。
\end{lstlisting}

执行中如果遇到复杂子问题，再临时切回高智模型处理。这样“思考”和“执行”分离，既省 token，也减少执行窗口被早期讨论污染。

\section{常用指令速查}

\begin{longtable}{p{0.35\textwidth}p{0.50\textwidth}}
\toprule
我想做什么 & 操作 \\
\midrule
查看当前模型 & \texttt{/model} \\
切换到最强模型 & \texttt{/model opus} 或供应商高智模型 ID \\
切换到省钱模型 & \texttt{/model haiku} 或便宜执行模型 ID \\
让模型深度思考 & 在问题前加 \texttt{think hard} / \texttt{ultrathink} \\
引用单个文件 & \texttt{@path/to/file.ts} \\
引用目录 & \texttt{@src/} \\
按计划文档执行 & \texttt{@PLAN.md 按计划落地} \\
做规划 & \texttt{/plan} \\
做代码审查 & \texttt{/review} \\
系统性调试 & \texttt{/debug} \\
验证安装/配置 & \texttt{/doctor}、\texttt{/mcp-status}、\texttt{codex doctor} \\
清空上下文重来 & \texttt{/clear} \\
\bottomrule
\end{longtable}

\section{目录结构}

安装后，\texttt{\textasciitilde/.claude} 大致包含：

\begin{lstlisting}[language={}]
~/.claude/
  CLAUDE.md
  docs/
  settings.json
  skills/
  agents/
  commands/
  hooks/
  output-styles/
\end{lstlisting}

\section{CLAUDE.md 与 docs}

\texttt{CLAUDE.md} 是 Claude Code 的全局指令入口。它引用四个核心文档：

\begin{itemize}[leftmargin=2em]
  \item \texttt{docs/environment.md}：环境、Shell、路径约定；
  \item \texttt{docs/workflow.md}：沟通、工作流、代码风格、验证要求；
  \item \texttt{docs/tools.md}：Skills、Subagents、MCP、Cron 的使用规则；
  \item \texttt{docs/safety.md}：Git、安全、destructive operations、反模式。
\end{itemize}

这四份文档构成“默认工作方式”。用户不需要每次提醒“先读文件再改”、“危险操作先问”、“没验证不算完成”，这些规则会在每次会话里被自动加载。

\section{Skills：把方法论变成可调用能力}

项目包含 33 个 skills，用于在特定任务类型中自动加载工作方法。常见 skills 包括：

\begin{itemize}[leftmargin=2em]
  \item \texttt{brainstorming}：设计前澄清和方案比较；
  \item \texttt{writing-plans}：把需求拆为可验证任务；
  \item \texttt{executing-plans}：按 1--3 个任务一批执行并验证；
  \item \texttt{subagent-driven-development}：复杂任务由 fresh subagent 实现和 review；
  \item \texttt{systematic-debugging}：复现、隔离、修复、验证；
  \item \texttt{verification-before-completion}：完成前必须真实验证；
  \item \texttt{test-driven-development}：明确规格下 RED--GREEN--REFACTOR；
  \item \texttt{using-context7}、\texttt{using-deepwiki}、\texttt{using-playwright}：外部工具使用指南。
\end{itemize}

Skills 的价值是把专家工作习惯前置。新手不知道什么时候该 TDD、什么时候该先 plan、什么时候该用 browser 验证，skills 会把这些判断变成可复用流程。

\section{Agents：把复杂任务交给专门角色}

项目包含 22 个 subagents，覆盖规划、代码审查、安全审查、调试、构建修复、性能、可访问性、SQL、迁移等专门任务。典型使用方式是：

\begin{itemize}[leftmargin=2em]
  \item 大量搜索或阅读 10 个以上文件时派 \texttt{explore}；
  \item 修复构建/类型/lint 时派 \texttt{build-fixer}；
  \item 审查代码质量时派 \texttt{code-reviewer}；
  \item 安全相关改动派 \texttt{security-reviewer}；
  \item 复杂 bug 派 \texttt{debugger}。
\end{itemize}

Subagents 不是为了“看起来高级”，而是为了隔离上下文。主线程只保留目标、约束和验收标准；重阅读、重搜索、重验证交给一次性角色，结束后只带回结论和证据。

\section{Commands：把复杂工作流变成入口}

项目包含 25 个 slash commands，包括：

\begin{itemize}[leftmargin=2em]
  \item 工作流：\texttt{/plan}、\texttt{/tdd}、\texttt{/review}、\texttt{/debug}、\texttt{/verify}、\texttt{/ship}；
  \item 诊断：\texttt{/doctor}、\texttt{/mcp-status}、\texttt{/skills}、\texttt{/agents}、\texttt{/memory-search}；
  \item 内容和开发：\texttt{/changelog}、\texttt{/gen-tests}、\texttt{/refactor}、\texttt{/explain}、\texttt{/eli5}、\texttt{/deep-research}。
\end{itemize}

命令层的意义是降低门槛：用户不用记住完整提示词，只要知道“我要规划”“我要审查”“我要调试”，就能进入正确流程。

\section{Hooks：把安全和质量边界前移}

项目包含 12 个生命周期 hooks。它们的目标不是“炫技”，而是把关键安全和质量边界前移：

\begin{itemize}[leftmargin=2em]
  \item \texttt{block-dangerous}：拦截危险命令，例如 \texttt{git push --force}、\texttt{git --no-verify}、系统删除等；
  \item \texttt{protect-secrets}：保护 \texttt{.env}、SSH key、AWS credentials；
  \item \texttt{protect-linter-configs}：防止为了通过检查而偷偷改 lint 配置；
  \item \texttt{auto-format}：编辑后自动格式化；
  \item \texttt{typecheck}：异步类型检查；
  \item \texttt{command-log}：命令审计；
  \item \texttt{session-start-context}：注入 git 和项目状态；
  \item \texttt{smart-context}：根据 prompt 提示合适 skill；
  \item \texttt{notify}、\texttt{stop-sound}：通知和完成提示；
  \item \texttt{precompact-backup}：压缩前备份 transcript；
  \item \texttt{subagent-stop}：记录 subagent 结束。
\end{itemize}

\section{settings.json 设计}

安装器不会直接复制一个固定的 \texttt{settings.json}，而是从 \texttt{settings.template.json} 渲染。这样做有三个目的：第一，路径能根据用户的 \texttt{ClaudeHome} 自动替换；第二，API token、base URL、model 只有用户显式传参时才写入；第三，PowerShell hook 路径能在 Windows 和 macOS 上保持一致的 UTF-8 无 BOM 输出。

\subsection{环境变量}

模板支持下列关键环境变量：

\begin{longtable}{p{0.30\textwidth}p{0.58\textwidth}}
\toprule
变量 & 说明 \\
\midrule
\texttt{ANTHROPIC\_AUTH\_TOKEN} & 仅当用户传入 \texttt{-ApiToken} / \texttt{--token} 时保留；默认删除。 \\
\texttt{ANTHROPIC\_BASE\_URL} & 仅当用户传入 \texttt{-BaseUrl} / \texttt{--url} 时保留；默认删除。 \\
\texttt{ANTHROPIC\_MODEL} & 仅当用户传入 \texttt{-Model} / \texttt{--model} 时保留。 \\
\texttt{ANTHROPIC\_DEFAULT\_HAIKU\_MODEL} & 与 \texttt{ANTHROPIC\_MODEL} 同步，用于单模型中转站兼容后台小模型调用。 \\
\texttt{EDITOR} & 默认设为 \texttt{code --wait}。 \\
\texttt{CLAUDE\_HOOKS\_LOG\_DIR} & 指向 \texttt{\textasciitilde/.claude/logs}，供 hooks 写日志。 \\
\texttt{CLAUDE\_DISABLED\_HOOKS} & 默认为空，可用于临时禁用部分 hook。 \\
\bottomrule
\end{longtable}

\subsection{statusLine 与 permissions}

\texttt{statusLine} 每 10 秒运行一次 \texttt{hooks/statusline.ps1}，用于显示当前项目、分支、模型或其他上下文信息。\texttt{permissions.deny} 默认拒绝一组高风险 PowerShell 命令，例如 \texttt{Format-Volume}、\texttt{Stop-Computer}、\texttt{Restart-Computer}、\texttt{Clear-RecycleBin}、\texttt{Remove-PSDrive}。

\subsection{Hook 注册矩阵}

\begin{longtable}{p{0.18\textwidth}p{0.22\textwidth}p{0.26\textwidth}p{0.24\textwidth}}
\toprule
事件 & matcher & 脚本 & 作用 \\
\midrule
PreToolUse & Bash/PowerShell & \texttt{block-dangerous.ps1} & 拦截危险 shell、Git 和系统命令。 \\
PreToolUse & Read/Edit/Write/Bash/PowerShell & \texttt{protect-secrets.ps1} & 阻止读取或写入密钥类文件。 \\
PreToolUse & Edit/Write/MultiEdit & \texttt{protect-linter-configs.ps1} & 防止通过改 linter 配置绕过质量检查。 \\
PostToolUse & Edit/Write & \texttt{auto-format.ps1} & 编辑后自动格式化。 \\
PostToolUse & Edit/Write & \texttt{typecheck.ps1} & 异步类型检查。 \\
PostToolUse & Bash/PowerShell & \texttt{command-log.ps1} & 命令审计日志。 \\
SessionStart & - & \texttt{session-start-context.ps1} & 注入 git 与项目状态。 \\
UserPromptSubmit & - & \texttt{smart-context.ps1} & 根据 prompt 提示合适 skill。 \\
Notification & - & \texttt{notify.ps1} & 桌面通知。 \\
Stop & - & \texttt{stop-sound.ps1} & 完成提示音。 \\
PreCompact & - & \texttt{precompact-backup.ps1} & 压缩前备份 transcript。 \\
SubagentStop & - & \texttt{subagent-stop.ps1} & 记录 subagent 结束。 \\
\bottomrule
\end{longtable}

\section{关键诊断命令}

\begin{itemize}[leftmargin=2em]
  \item \texttt{/doctor}：检查 \texttt{settings.json}、hook 路径、MCP 数量、skill/agent frontmatter、hook PowerShell 解析以及外部依赖。
  \item \texttt{/mcp-status}：读取 \texttt{\textasciitilde/.claude.json} 并列出 MCP 配置。注意它只看配置，不等于实时连接测试；实时状态应使用 Claude Code 内置 \texttt{/mcp}。
  \item \texttt{/backup}：调用 \texttt{backup-config.ps1} 备份 Claude Code 配置为 zip。
  \item \texttt{/changelog}：从 git 历史生成 Keep a Changelog 风格变更记录。
  \item \texttt{/deps-audit}：检查 Node/Python/Rust/Go/Java/Ruby/PHP 等依赖的过期、漏洞和未使用情况。
\end{itemize}
'''

start = text.index(r"\chapter{Claude Code 配置}")
end = text.index(r"\chapter{Codex 配置}")
text = text[:start] + chapter5 + "\n" + text[end:]
path.write_text(text, encoding="utf-8")
print("updated", path)
