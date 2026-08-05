# Plan: 修复 Claude 安装器并生成高度一致的 Claude Code Codex Strongest / claude-code-codex-strongest 配置项目

## Context

本计划基于对以下两个位置的审阅：

- Claude Code 当前运行配置目录：`C:\Users\liujiarui\.claude`
- Claude Code Strongest 源码仓库：`C:\Users\liujiarui\claude-code-strongest`

关键结论：

1. `C:\Users\liujiarui\.claude\install-windows.bat` 只是远程入口；它下载 GitHub main 分支压缩包，并执行仓库内 `install\install-windows.ps1`。真正要修复发布后一键包行为，必须修改源码仓库 `C:\Users\liujiarui\claude-code-strongest`。
2. Windows 桌面没有 VS Code 的根因是 VS Code winget/Inno Setup override 没有包含 `desktopicon`，且已安装 VS Code 时 Inno task 可能不再执行。因此修复必须采用“双保险”：`desktopicon` + 手工创建/刷新 `Visual Studio Code.lnk`。
3. VS Code 扩展需要新增：
   - `MS-CEINTL.vscode-language-pack-zh-hans`
   - `cweijan.vscode-office`
4. Codex CLI 安装主路径采用 `npm install -g @openai/codex`；Codex VS Code 扩展 ID 是 `openai.chatgpt`，不是 `openai.codex`。
5. Codex 默认配置目录是 `~/.codex`，Windows 原生路径为 `C:\Users\liujiarui\.codex`；主配置文件是 `config.toml`，全局/项目指令入口是 `AGENTS.md`。
6. Claude 配置不能原样复制到 Codex。`settings.json`、`.claude.json`、hooks、permissions、statusLine、slash commands、subagent frontmatter 都必须按 Codex 机制转换或作为参考资料保留。
7. Codex auth/token 不迁移、不备份、不写入安装器。安装后只提示用户运行 `codex login`。

## Scope

### In scope

- 修复 Windows 一键安装包安装后桌面没有 VS Code 的问题。
- 在 Windows/macOS 安装器中增加 VS Code 中文语言包和 Office Viewer 扩展。
- 创建 `C:\Users\liujiarui\.codex` 配置项目。
- 创建 Claude Code Codex Strongest / claude-code-codex-strongest Windows/macOS 一键安装器。
- 将 Claude Code Strongest 的 docs / skills / commands / agents / hooks 语义迁移到 Codex。
- 生成 Codex `AGENTS.md`、`config.toml`、MCP 配置、hook wrapper、doctor 脚本。

### Out of scope

- 不迁移 Claude 会话、日志、缓存、telemetry、项目历史状态。
- 不迁移 `auth.json`、`.credentials.json`、API key、token。
- 不整体复制 `C:\Users\liujiarui\.claude.json`。
- 不把 Claude hooks 原样启用到 Codex。
- 不默认使用 WSL。Windows 一键安装以原生 Windows 为主，WSL 只作为 README 备用说明。

## Tasks

### Task 1: 巩固 Windows VS Code 桌面快捷方式修复

- **File**: `C:\Users\liujiarui\claude-code-strongest\install\install-windows.ps1`
- **Change**:
  - 确认并保留 `New-DesktopShortcut` 和 `Find-VSCodeExe`。
  - 将 VS Code winget override 改成包含 `desktopicon`：

    ```powershell
    $vscodeOverride = '/VERYSILENT /SP- /MERGETASKS=!runcode,desktopicon,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath'
    ```

  - 在 `Install-Prerequisites` 中 VS Code 安装后创建/刷新桌面快捷方式：

    ```powershell
    Write-Step 'Creating VS Code desktop shortcut'
    $codeExe = Find-VSCodeExe
    if ($codeExe) {
        New-DesktopShortcut -Name 'Visual Studio Code' -TargetPath $codeExe | Out-Null
    } else {
        Write-Warn 'Code.exe not found; skipping VS Code desktop shortcut.'
    }
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\claude-code-strongest\install\install-windows.ps1'; $s=Get-Content $p -Raw -Encoding UTF8; if($s -match 'function New-DesktopShortcut' -and $s -match 'function Find-VSCodeExe' -and $s -match 'desktopicon' -and $s -match \"New-DesktopShortcut -Name 'Visual Studio Code'\"){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 2: 将 Windows VS Code 扩展安装改为列表驱动

- **File**: `C:\Users\liujiarui\claude-code-strongest\install\install-windows.ps1`
- **Change**:
  - 将单扩展安装改为列表循环：

    ```powershell
    $vsCodeExtensions = @(
        @{ Id = 'anthropic.claude-code'; Name = 'Claude Code' },
        @{ Id = 'MS-CEINTL.vscode-language-pack-zh-hans'; Name = 'Chinese (Simplified) Language Pack' },
        @{ Id = 'cweijan.vscode-office'; Name = 'Office Viewer' }
    )

    Write-Step 'Installing VS Code extensions'
    if (Test-Command 'code') {
        foreach ($ext in $vsCodeExtensions) {
            try {
                & code --install-extension $ext.Id --force 2>&1 | Out-Null
                Write-Ok "VS Code extension installed: $($ext.Id)"
            } catch {
                Write-Warn "VS Code extension failed: $($ext.Id) - $($_.Exception.Message)"
            }
        }
    } else {
        Write-Warn '`code` CLI not on PATH; VS Code extensions skipped.'
        Write-Info 'After installing VS Code, run:'
        foreach ($ext in $vsCodeExtensions) {
            Write-Info "  code --install-extension $($ext.Id) --force"
        }
    }
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\claude-code-strongest\install\install-windows.ps1'; $s=Get-Content $p -Raw -Encoding UTF8; @('anthropic.claude-code','MS-CEINTL.vscode-language-pack-zh-hans','cweijan.vscode-office') | ForEach-Object { if($s -notmatch [regex]::Escape($_)){ exit 1 } }; exit 0"
  ```

- **Success**: 命令 exit 0。

---

### Task 3: 增加 Windows 安装验证里的桌面快捷方式和扩展检查

- **File**: `C:\Users\liujiarui\claude-code-strongest\install\install-windows.ps1`
- **Change**:
  - 在 `Verify-Install` 中新增：

    ```powershell
    @{ Name = 'VS Code desktop shortcut exists'; Test = { Test-Path (Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Visual Studio Code.lnk') } },
    @{ Name = 'VS Code extension anthropic.claude-code'; Test = { try { $ext=@(& code --list-extensions | ForEach-Object { $_.ToLowerInvariant() }); $ext -contains 'anthropic.claude-code' } catch { $false } } },
    @{ Name = 'VS Code extension MS-CEINTL.vscode-language-pack-zh-hans'; Test = { try { $ext=@(& code --list-extensions | ForEach-Object { $_.ToLowerInvariant() }); $ext -contains 'ms-ceintl.vscode-language-pack-zh-hans' } catch { $false } } },
    @{ Name = 'VS Code extension cweijan.vscode-office'; Test = { try { $ext=@(& code --list-extensions | ForEach-Object { $_.ToLowerInvariant() }); $ext -contains 'cweijan.vscode-office' } catch { $false } } }
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\claude-code-strongest\install\install-windows.ps1'; $s=Get-Content $p -Raw -Encoding UTF8; if($s -match 'VS Code desktop shortcut exists' -and $s -match 'ToLowerInvariant' -and $s -match 'cweijan.vscode-office'){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 4: 给 macOS 安装器同步新增 VS Code 扩展

- **File**: `C:\Users\liujiarui\claude-code-strongest\install\install-macos.sh`
- **Change**:
  - 将 `install_vscode_ext()` 改为安装扩展列表：

    ```bash
    install_vscode_ext() {
        ensure_code_on_path || true
        if ! command_exists code; then
            log_warn "'code' CLI not on PATH; skipping extension install."
            log_info "In VS Code run: Cmd+Shift+P -> 'Shell Command: Install code command in PATH', then re-run."
            return 0
        fi

        local extensions="
anthropic.claude-code
MS-CEINTL.vscode-language-pack-zh-hans
cweijan.vscode-office
"
        log_step "Installing VS Code extensions"
        for ext in $extensions; do
            if [ $DRY_RUN -eq 1 ]; then
                log_info "[dry-run] would run: code --install-extension $ext --force"
                continue
            fi
            if code --install-extension "$ext" --force >/dev/null 2>&1; then
                log_ok "VS Code extension installed: $ext"
            else
                log_warn "Extension install failed: $ext"
            fi
        done
    }
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\claude-code-strongest\install\install-macos.sh'; $s=Get-Content $p -Raw -Encoding UTF8; @('anthropic.claude-code','MS-CEINTL.vscode-language-pack-zh-hans','cweijan.vscode-office') | ForEach-Object { if($s -notmatch [regex]::Escape($_)){ exit 1 } }; exit 0"
  ```

- **Success**: 命令 exit 0。

---

### Task 5: 更新 Claude 项目 README 和一键入口提示

- **File**:
  - `C:\Users\liujiarui\claude-code-strongest\README.md`
  - `C:\Users\liujiarui\claude-code-strongest\install-windows.bat`
  - `C:\Users\liujiarui\claude-code-strongest\install-macos.command`
- **Change**:
  - README 安装表新增：
    - VS Code 桌面快捷方式：Windows 安装器自动创建/刷新 `Visual Studio Code.lnk`
    - VS Code 扩展：`anthropic.claude-code`、`MS-CEINTL.vscode-language-pack-zh-hans`、`cweijan.vscode-office`
  - `install-windows.bat` 和 `install-macos.command` 的说明行改为：

    ```text
    VS Code + desktop shortcut + Claude Code + cc-switch + Chinese/Office VS Code extensions + 33 skills / 22 agents / 8 MCPs
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$root='C:\Users\liujiarui\claude-code-strongest'; $all=(Get-Content (Join-Path $root 'README.md') -Raw -Encoding UTF8) + (Get-Content (Join-Path $root 'install-windows.bat') -Raw -Encoding UTF8) + (Get-Content (Join-Path $root 'install-macos.command') -Raw -Encoding UTF8); if($all -match 'MS-CEINTL.vscode-language-pack-zh-hans' -and $all -match 'cweijan.vscode-office' -and $all -match 'desktop shortcut'){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 6: 创建 Codex 项目的安全忽略规则

- **File**: `C:\Users\liujiarui\.codex\.gitignore`
- **Change**:
  - 新建 `.gitignore`：

    ```gitignore
    # Codex auth / credentials
    auth.json
    .credentials.json
    *.token
    *.key

    # Runtime state
    sessions/
    history.jsonl
    log/
    logs/
    tmp/
    cache/
    telemetry/
    shell-snapshots/
    tasks/
    teams/

    # Backups generated by installers
    *.bak.*
    backups/

    # Local machine details
    state/
    daemon/
    daemon.log
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\.codex\.gitignore'; if((Test-Path $p) -and ((Get-Content $p -Raw -Encoding UTF8) -match 'auth.json' -and (Get-Content $p -Raw -Encoding UTF8) -match 'sessions/')){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 7: 生成 Codex 全局指令 AGENTS.md

- **File**: `C:\Users\liujiarui\.codex\AGENTS.md`
- **Change**:
  - 新建 Codex 全局指令入口，至少包含：
    - 沟通规则
    - 工作流规则
    - 代码规则
    - Git/destructive ops 安全规则
    - Claude skills/commands/agents 到 Codex 的映射说明
    - Codex CLI、VS Code Codex extension、中文语言包、Office Viewer 说明
  - 不把 `CLAUDE.md` 原样复制为唯一入口。
  - 将 `docs\environment.md`、`docs\workflow.md`、`docs\tools.md`、`docs\safety.md` 的核心规则整理进 Codex 可读文本。

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\.codex\AGENTS.md'; $s=Get-Content $p -Raw -Encoding UTF8; if($s -match 'Codex CLI' -and $s -match 'CODEX_HOME' -and $s -match 'MS-CEINTL.vscode-language-pack-zh-hans'){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 8: 复制 Claude 可迁移资产为 Codex 参考库

- **File**:
  - `C:\Users\liujiarui\.codex\docs`
  - `C:\Users\liujiarui\.codex\skills`
  - `C:\Users\liujiarui\.codex\commands`
  - `C:\Users\liujiarui\.codex\output-styles`
  - `C:\Users\liujiarui\.codex\hooks\reference`
- **Change**:
  - 从 `C:\Users\liujiarui\claude-code-strongest` 复制：
    - `docs`
    - `skills`
    - `commands`
    - `output-styles`
  - Claude 原始 hooks 只复制到 `hooks\reference`，不直接启用。
  - 不复制：
    - `logs`
    - `cache`
    - `telemetry`
    - `backups`
    - `projects`
    - `sessions`
    - `settings.json`
    - `.claude.json`
    - auth/token 文件

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$home='C:\Users\liujiarui\.codex'; $skills=(Get-ChildItem (Join-Path $home 'skills') -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue).Count; $commands=(Get-ChildItem (Join-Path $home 'commands') -Filter *.md -ErrorAction SilentlyContinue).Count; if($skills -ge 30 -and $commands -ge 20 -and (Test-Path (Join-Path $home 'hooks\reference'))){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 9: 转换 Claude agents 为 Codex agents TOML

- **File**: `C:\Users\liujiarui\.codex\agents\*.toml`
- **Change**:
  - 为每个 `C:\Users\liujiarui\claude-code-strongest\agents\*.md` 生成对应 TOML。
  - 基础结构：

    ```toml
    name = "code-reviewer"
    description = "Review code for quality, maintainability, and correctness."
    model = "gpt-5-codex"
    sandbox_mode = "workspace-write"
    approval_policy = "on-request"

    instructions = """
    <去掉 Claude YAML frontmatter 后的 agent 主体内容>
    """
    ```

  - 若当前 Codex 版本对 `agents/*.toml` 字段更严格，则以 `codex doctor` 或 Codex 实际文档为准校准字段。

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$agents=(Get-ChildItem 'C:\Users\liujiarui\.codex\agents' -Filter *.toml -ErrorAction SilentlyContinue).Count; if($agents -ge 20){ exit 0 } else { exit 1 }"
  ```

- **Success**: Codex agents TOML 数量 >= 20。

---

### Task 10: 创建 Codex config.toml

- **File**: `C:\Users\liujiarui\.codex\config.toml`
- **Change**:
  - 新建/更新 Codex 主配置，不写任何 API key/token。
  - 内容：

    ```toml
    approval_policy = "on-request"
    sandbox_mode = "workspace-write"
    model_reasoning_effort = "high"

    notify = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "C:/Users/liujiarui/.codex/hooks/codex-notify.ps1"]

    [features]
    hooks = true
    plugins = true
    multi_agent = true
    browser_use = true
    shell_snapshot = true
    workspace_dependencies = true

    [shell_environment_policy]
    inherit = "all"

    [mcp_servers.sequential-thinking]
    command = "cmd"
    args = ["/c", "npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]

    [mcp_servers.context7]
    url = "https://mcp.context7.com/mcp"

    [mcp_servers.deepwiki]
    url = "https://mcp.deepwiki.com/mcp"

    [mcp_servers.playwright]
    command = "cmd"
    args = ["/c", "npx", "-y", "@playwright/mcp@latest", "--headless"]

    [mcp_servers.memory]
    command = "cmd"
    args = ["/c", "npx", "-y", "@modelcontextprotocol/server-memory"]

    [mcp_servers.fetch]
    command = "cmd"
    args = ["/c", "uvx", "mcp-server-fetch"]

    [mcp_servers.time]
    command = "cmd"
    args = ["/c", "uvx", "mcp-server-time", "--local-timezone", "Asia/Shanghai"]

    [mcp_servers.git-mcp]
    command = "cmd"
    args = ["/c", "uvx", "mcp-server-git"]
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:CODEX_HOME='C:\Users\liujiarui\.codex'; codex doctor --summary --ascii --no-color; if($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1){ exit 0 } else { exit $LASTEXITCODE }"
  ```

- **Success**: `codex doctor` 能加载 config；允许因未登录出现 auth fail，但不能出现 TOML/config parse fail。

---

### Task 11: 创建 Codex 通知 hook

- **File**: `C:\Users\liujiarui\.codex\hooks\codex-notify.ps1`
- **Change**:
  - 新建 Codex 专用通知脚本：
    - 从 stdin 读取 Codex notify JSON。
    - 有 BurntToast 时弹通知。
    - 没有 BurntToast 时静默 exit 0。
    - 失败不影响 Codex。
    - 不输出 secrets。

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "'{\"type\":\"agent-turn-complete\",\"turn-id\":\"test\"}' | powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\liujiarui\.codex\hooks\codex-notify.ps1; if($LASTEXITCODE -eq 0){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 12: 创建 Codex 安全 hook wrapper

- **File**:
  - `C:\Users\liujiarui\.codex\hooks\codex-block-dangerous.ps1`
  - `C:\Users\liujiarui\.codex\hooks\codex-protect-secrets.ps1`
  - `C:\Users\liujiarui\.codex\hooks\codex-command-log.ps1`
- **Change**:
  - 新建 Codex wrapper，不原样启用 Claude hooks。
  - 通用原则：
    - stdin 为空时 exit 0
    - JSON 解析失败时 exit 0
    - 只处理可识别 command/path 字段
    - 未知 payload 不阻断
  - `codex-block-dangerous.ps1` 至少拦截：
    - `Format-Volume`
    - `Stop-Computer`
    - `Restart-Computer`
    - `Clear-RecycleBin`
    - `Remove-PSDrive`
    - `git push --force`
    - `git reset --hard`
    - `git clean -fd`
    - `--no-verify`
  - `codex-protect-secrets.ps1` 至少拦截：
    - `.env`
    - `.env.*`
    - SSH private keys
    - AWS credentials
    - `auth.json`
    - `.credentials.json`
  - `codex-command-log.ps1` 写入 `C:\Users\liujiarui\.codex\logs\commands.log`。

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$bad='{\"command\":\"git reset --hard HEAD\"}'; $bad | powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\liujiarui\.codex\hooks\codex-block-dangerous.ps1; if($LASTEXITCODE -ne 0){ exit 0 } else { exit 1 }"
  ```

- **Success**: 危险命令测试被拒绝。

---

### Task 13: 在 Codex config.toml 注册 lifecycle hooks

- **File**: `C:\Users\liujiarui\.codex\config.toml`
- **Change**:
  - 追加：

    ```toml
    [[PreToolUse.hooks]]
    type = "command"
    command = "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/liujiarui/.codex/hooks/codex-block-dangerous.ps1"

    [[PreToolUse.hooks]]
    type = "command"
    command = "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/liujiarui/.codex/hooks/codex-protect-secrets.ps1"

    [[PostToolUse.hooks]]
    type = "command"
    command = "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/liujiarui/.codex/hooks/codex-command-log.ps1"
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:CODEX_HOME='C:\Users\liujiarui\.codex'; codex doctor --summary --ascii --no-color; if($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1){ exit 0 } else { exit $LASTEXITCODE }"
  ```

- **Success**: `codex doctor` 不报告 config parse error 或 hook config parse error。

---

### Task 14: 创建 Codex Windows 安装器

- **File**: `C:\Users\liujiarui\.codex\install\install-windows.ps1`
- **Change**:
  - 新建 PowerShell 安装器：
    - 默认目标：`$env:USERPROFILE\.codex`
    - 安装 VS Code：`winget install --id Microsoft.VisualStudioCode`
    - 安装 Git：`winget install --id Git.Git`
    - 安装 Node.js：`winget install --id OpenJS.NodeJS`
    - 安装 uv：`winget install --id astral-sh.uv`
    - 安装 Codex CLI：`npm install -g '@openai/codex'`
    - 安装 VS Code 扩展：
      - `openai.chatgpt`
      - `MS-CEINTL.vscode-language-pack-zh-hans`
      - `cweijan.vscode-office`
    - 创建/刷新 VS Code 桌面快捷方式。
    - 部署 `.codex` 配置文件，但不覆盖：
      - `auth.json`
      - `.credentials.json`
      - `sessions`
      - `logs`
      - `tmp`
    - 安装结束后运行：
      - `codex --version`
      - `codex doctor --summary --ascii --no-color`
    - 未登录时只提示：`codex login`。

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\.codex\install\install-windows.ps1'; $tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseFile($p,[ref]$tokens,[ref]$errors) | Out-Null; if($errors.Count -eq 0){ exit 0 } else { $errors | Select-Object -First 3 | Format-List; exit 1 }"
  ```

- **Success**: PowerShell parser errors = 0。

---

### Task 15: 创建 Codex Windows 一键入口 bat

- **File**: `C:\Users\liujiarui\.codex\install-windows.bat`
- **Change**:
  - 新建：

    ```bat
    @echo off
    setlocal
    title Claude Code Codex Strongest Installer
    echo ============================================================
    echo    Claude Code Codex Strongest - One-Click Installer (Windows)
    echo ============================================================
    echo.
    echo This installs:
    echo   VS Code + desktop shortcut + Codex CLI + Codex VS Code extension
    echo   Chinese Language Pack + Office Viewer + MCP/config/hooks
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install\install-windows.ps1"
    echo.
    echo Done. Press any key to close this window.
    pause >nul
    endlocal
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\.codex\install-windows.bat'; $s=Get-Content $p -Raw -Encoding UTF8; if($s -match 'install\\install-windows.ps1' -and $s -match 'Codex CLI' -and $s -match 'Office Viewer'){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 16: 创建 Codex macOS 安装器和入口

- **File**:
  - `C:\Users\liujiarui\.codex\install\install-macos.sh`
  - `C:\Users\liujiarui\.codex\install-macos.command`
- **Change**:
  - `install-macos.sh` 新建逻辑：
    - 安装 Homebrew
    - `brew install --cask visual-studio-code`
    - `brew install git`
    - `brew install node`
    - `npm install -g @openai/codex`
    - 如果 npm 失败，再提示用户尝试官方 Homebrew Codex 入口。
    - 安装扩展：
      - `openai.chatgpt`
      - `MS-CEINTL.vscode-language-pack-zh-hans`
      - `cweijan.vscode-office`
    - 部署 `~/.codex/config.toml`、`AGENTS.md`、docs/skills/agents/commands/hooks。
  - `install-macos.command` 调用：

    ```bash
    bash "$(dirname "$0")/install/install-macos.sh" "$@"
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\.codex\install\install-macos.sh'; $s=Get-Content $p -Raw -Encoding UTF8; if($s -match '@openai/codex' -and $s -match 'openai.chatgpt' -and $s -match 'MS-CEINTL.vscode-language-pack-zh-hans' -and $s -match 'cweijan.vscode-office'){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 17: 创建 Claude Code Codex Strongest / claude-code-codex-strongest 项目 README

- **File**: `C:\Users\liujiarui\.codex\README.md`
- **Change**:
  - 新建 README，包含：
    - 项目说明：Claude Code Strongest 的 Claude Code Codex Strongest / claude-code-codex-strongest 适配版。
    - Windows 一键安装：双击 `install-windows.bat`。
    - macOS 一键安装：双击 `install-macos.command`。
    - 安装内容：VS Code、VS Code desktop shortcut、Codex CLI、Codex VS Code extension、Chinese Language Pack、Office Viewer、MCP servers、AGENTS.md、skills、agents、commands、hooks。
    - 登录说明：推荐 `codex login`。
    - API key 方式只作为用户手动操作说明，不在安装器中写 key。
    - Windows 原生为主，WSL 作为备用说明。
    - Claude/Codex 差异说明。

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\.codex\README.md'; $s=Get-Content $p -Raw -Encoding UTF8; if($s -match '@openai/codex' -and $s -match 'openai.chatgpt' -and $s -match 'codex login' -and $s -match 'Claude/Codex'){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

---

### Task 18: 创建 Codex 自检脚本

- **File**: `C:\Users\liujiarui\.codex\tools\codex-doctor.ps1`
- **Change**:
  - 新建自检脚本，检查：
    - `config.toml` 存在
    - `AGENTS.md` 存在
    - skills >= 30
    - agents TOML >= 20
    - commands >= 20
    - hook wrapper 存在
    - `codex --version` 可运行
    - `codex doctor --summary --ascii --no-color` 可运行
    - VS Code 扩展包含：
      - `openai.chatgpt`
      - `MS-CEINTL.vscode-language-pack-zh-hans`
      - `cweijan.vscode-office`
    - `.codex` 未发现 `auth.json`、`.credentials.json` 被计划生成。
  - 输出 markdown 表格，不使用 emoji。

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\liujiarui\.codex\tools\codex-doctor.ps1
  ```

- **Success**: 输出表格；没有 PowerShell 解析错误；未登录 Codex 时 auth 项允许 FAIL，但 config/items/extensions 项应可定位。

---

### Task 19: 更新 Claude 项目中对 Claude Code Codex Strongest / claude-code-codex-strongest 项目的说明

- **File**: `C:\Users\liujiarui\claude-code-strongest\README.md`
- **Change**:
  - 增加一节：

    ```markdown
    ### Claude Code Codex Strongest / claude-code-codex-strongest

    本仓库可以生成/同步一个 Claude Code Codex Strongest / claude-code-codex-strongest CLI 配置项目到 `C:\Users\liujiarui\.codex`：
    - Codex CLI: `@openai/codex`
    - Codex VS Code extension: `openai.chatgpt`
    - Codex global instructions: `~/.codex/AGENTS.md`
    - Codex config: `~/.codex/config.toml`
    - MCP servers: `[mcp_servers]`
    - Claude skills/agents/commands 作为 Codex 可读规则库保留。
    ```

- **Verify**:

  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\claude-code-strongest\README.md'; $s=Get-Content $p -Raw -Encoding UTF8; if($s -match 'Claude Code Codex Strongest / claude-code-codex-strongest' -and $s -match 'C:\\Users\\liujiarui\\.codex' -and $s -match 'openai.chatgpt'){ exit 0 } else { exit 1 }"
  ```

- **Success**: 命令 exit 0。

## Final Verification

### 1. Claude Windows 安装器 PowerShell 语法验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='C:\Users\liujiarui\claude-code-strongest\install\install-windows.ps1'; $tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseFile($p,[ref]$tokens,[ref]$errors) | Out-Null; if($errors.Count -eq 0){ 'OK install-windows.ps1 parses'; exit 0 } else { $errors | Select-Object -First 5 | Format-List; exit 1 }"
```

Success: 输出 `OK install-windows.ps1 parses`。

### 2. Claude 安装器扩展覆盖验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root='C:\Users\liujiarui\claude-code-strongest'; $text=(Get-Content (Join-Path $root 'install\install-windows.ps1') -Raw -Encoding UTF8) + (Get-Content (Join-Path $root 'install\install-macos.sh') -Raw -Encoding UTF8); @('anthropic.claude-code','MS-CEINTL.vscode-language-pack-zh-hans','cweijan.vscode-office') | ForEach-Object { if($text -notmatch [regex]::Escape($_)){ Write-Host \"Missing $_\"; exit 1 } }; Write-Host 'OK extensions covered'; exit 0"
```

Success: 输出 `OK extensions covered`。

### 3. Codex 配置结构验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$home='C:\Users\liujiarui\.codex'; $required=@('AGENTS.md','config.toml','README.md','install-windows.bat','install\install-windows.ps1','hooks\codex-notify.ps1','tools\codex-doctor.ps1'); foreach($r in $required){ if(-not (Test-Path (Join-Path $home $r))){ Write-Host \"Missing $r\"; exit 1 } }; Write-Host 'OK codex structure'; exit 0"
```

Success: 输出 `OK codex structure`。

### 4. Codex CLI 验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "codex --version; $env:CODEX_HOME='C:\Users\liujiarui\.codex'; codex doctor --summary --ascii --no-color"
```

Success:

- `codex --version` 输出版本。
- `codex doctor` 能加载 config。
- 未登录时允许 auth fail。
- 不允许出现 config parse fail、TOML parse fail、MCP parse fail。

### 5. VS Code 扩展实际验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ext=@(code --list-extensions | ForEach-Object { $_.ToLowerInvariant() }); @('anthropic.claude-code','openai.chatgpt','ms-ceintl.vscode-language-pack-zh-hans','cweijan.vscode-office') | ForEach-Object { if($ext -notcontains $_){ Write-Host \"Missing extension: $_\"; exit 1 } }; Write-Host 'OK all VS Code extensions installed'; exit 0"
```

Success: 输出 `OK all VS Code extensions installed`。

### 6. Codex auth/secrets 未迁移验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$home='C:\Users\liujiarui\.codex'; $forbidden=@('auth.json','.credentials.json','.claude.json','settings.json'); foreach($f in $forbidden){ if(Test-Path (Join-Path $home $f)){ Write-Host \"Forbidden file exists: $f\"; exit 1 } }; Write-Host 'OK no auth or Claude settings copied'; exit 0"
```

Success: 输出 `OK no auth or Claude settings copied`。

## Notes

- Office Viewer 使用 `cweijan.vscode-office`，因为当前机器实测 `code --list-extensions` 已有该扩展，且显示名为 Office Viewer。
- Codex VS Code 扩展使用 `openai.chatgpt`，不要使用 `openai.codex`。
- Windows 安装以原生 Windows npm 为主：`npm install -g @openai/codex`。WSL 只放入 README 的备用说明。
- Codex auth/token 不由安装器写入。安装完成后用户自行运行 `codex login`。
- Claude `settings.json`、`.claude.json`、hooks、permissions、statusLine 只能语义迁移，不能直接复制。

## Sources

- OpenAI Codex CLI docs: https://developers.openai.com/codex/cli/
- npm package `@openai/codex`: https://www.npmjs.com/package/@openai/codex
- VS Code Marketplace item `openai.chatgpt`: https://marketplace.visualstudio.com/items?itemName=openai.chatgpt
- Chinese Language Pack: https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-zh-hans
- Office Viewer: https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-office
- VS Code command-line extension management: https://code.visualstudio.com/docs/editor/extension-marketplace#_command-line-extension-management
- OpenAI harness engineering / AGENTS.md guidance: https://openai.com/index/harness-engineering/

Plan 完成，19 个任务。下一步：使用 executing-plans 分批执行。Claude 安装器修复、Codex 配置生成、Codex 安装器生成可以分批或并行处理；最后统一跑 Final Verification。
