# CLAUDE.md — Claude Code 兼容入口

共享行为规则以根目录 `AGENTS.md` 为唯一正文；Claude Code 通过本入口加载它，并继续加载本项目已有的分模块资料。

@./AGENTS.md

## 本项目模块

@./docs/environment.md
@./docs/workflow.md
@./docs/tools.md
@./docs/safety.md

## 已有工作流资产

- Skills：见 `skills/`，优先复用 `brainstorming`、`writing-plans`、`executing-plans`、`systematic-debugging` 和 `verification-before-completion`。
- Agents：见 `agents/`，探索、规划、审查和修复任务按需要使用。
- Commands：见 `commands/`，常用 `/plan`、`/review`、`/verify`、`/doctor` 和 `/backup`。
- Hooks：见 `hooks/`；安全拦截和凭证保护优先于便利性。
- Codex 模板：见 `.codex/`；不要把认证、token、session、日志或缓存复制进模板。

## 入口维护

- 修改共享行为时先更新 `AGENTS.md`，再检查本入口是否仍然正确。
- 不要把只适用于 Claude Code 的语法写进共享 `AGENTS.md`；Claude 专属能力放在本文件或 `docs/` 中。
- 需要持久化的项目纠正写入规则文件；只适用于一次任务的要求留在当前对话或计划文档中。
