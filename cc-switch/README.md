# cc-switch configuration templates

Sanitized export of the local [cc-switch](https://github.com/farion1231/cc-switch) setup, so a
new machine can be brought up with the same providers, shared settings, MCP registry and skill
repos.

cc-switch keeps all of this in SQLite at `~/.cc-switch/cc-switch.db`. **That database contains
live API keys and is never committed.** These JSON files are the publishable projection of it.

## Files

| File | Contents |
|------|----------|
| `common-config.claude.json` | The `settings.json` skeleton cc-switch merges into `~/.claude/settings.json` every time you switch provider: hooks, statusline, permissions, model routing, plugin marketplaces. |
| `providers.template.json` | Provider definitions with every credential replaced by a `{{PLACEHOLDER}}`. The `placeholders` array lists the names you can fill. |
| `mcp-servers.json` | cc-switch's own MCP server registry and per-app enable flags. |
| `skill-repos.json` | Skill marketplace repositories. |
| `app-settings.json` | Application preferences (language, tray, proxy toggles). Machine-local provider selections are stripped. |

Machine-specific values are stored as placeholders and rendered at import time:
`{{CLAUDE_HOME}}`, `{{HOME}}`, `{{UVX}}` (resolved uvx path), `{{TIMEZONE}}`.

## Import (new machine)

Runs automatically as part of `install/install-windows.ps1` / `install/install-macos.sh`.
To run it by itself:

```bash
node install/import-cc-switch.js                        # providers with blank keys
node install/import-cc-switch.js --secrets keys.json    # providers with real keys
node install/import-cc-switch.js --dry-run              # report only, write nothing
```

`keys.json` maps placeholder names to real credentials and should live **outside** this repo:

```json
{
  "DEEPKEY_CLAUDE_ANTHROPIC_AUTH_TOKEN": "sk-...",
  "A6API_ANTHROPIC_AUTH_TOKEN": "sk-..."
}
```

Behaviour worth knowing:

- **Idempotent.** Providers are matched on `(name, app_type)` and upserted. Nothing is deleted.
- **Never clobbers a working key.** An existing provider keeps its stored credential unless you
  pass `--overwrite-secrets`.
- **Backs up first.** The database is copied into `~/.cc-switch/backups/` before any write.
- **Refuses to race the app.** cc-switch caches state in memory and rewrites the database when it
  exits, so the import aborts if cc-switch is running. Quit it, including the tray icon.
- **Needs Node 22+** for the built-in `node:sqlite` module.

## Export (after changing config locally)

```bash
node tools/export-cc-switch.js                    # refresh these files
node tools/export-cc-switch.js --include-internal # keep intranet-only providers too
```

The exporter redacts anything whose key name looks like a credential, rewrites absolute paths to
placeholders, drops providers whose endpoint points at a private relay, and then re-scans its own
output — if a live-looking key or an intranet hostname survived, it fails instead of handing you
something unsafe to commit.

## What is deliberately not here

- `cc-switch.db` — contains plaintext API keys.
- Provider selections (`currentProviderClaude` and friends) — local uuids, meaningless elsewhere.
- Providers pointing at intranet relays — excluded by default; this repo is public.
- Vendor skills that cc-switch syncs for other apps (Grok Build, Hermes, Yuanbao). The Claude Code
  skills live in `skills/` at the repo root.
