#!/usr/bin/env node
/**
 * Import the repo's cc-switch templates into a local cc-switch install.
 *
 * Counterpart to tools/export-cc-switch.js. Reads cc-switch/*.json and writes them into
 * ~/.cc-switch/cc-switch.db (+ ~/.cc-switch/settings.json), rendering the machine-specific
 * placeholders on the way in.
 *
 * Safety rules, because this touches a live app database:
 *   - The DB is backed up before the first write.
 *   - Providers are matched by (name, app_type) and upserted; an existing provider keeps
 *     its API key unless --overwrite-secrets is passed. Nothing is ever deleted.
 *   - Providers whose key is still an unfilled {{PLACEHOLDER}} are imported with an empty
 *     key, so they show up in the cc-switch UI ready for the user to paste a key into.
 *   - cc-switch must not be running: it caches state in memory and would overwrite us.
 *
 * Usage: node install/import-cc-switch.js [--dir DIR] [--db PATH] [--timezone TZ]
 *                                        [--secrets FILE] [--overwrite-secrets] [--dry-run]
 */

'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

let DatabaseSync
try {
  ({ DatabaseSync } = require('node:sqlite'))
} catch {
  console.error('This script needs Node.js 22+ (node:sqlite). Detected: ' + process.version)
  process.exit(1)
}

function parseArgs (argv) {
  const opts = {
    dir: path.join(__dirname, '..', 'cc-switch'),
    db: path.join(os.homedir(), '.cc-switch', 'cc-switch.db'),
    timezone: 'Asia/Shanghai',
    secrets: null,
    overwriteSecrets: false,
    dryRun: false
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dir') opts.dir = argv[++i]
    else if (a === '--db') opts.db = argv[++i]
    else if (a === '--timezone') opts.timezone = argv[++i]
    else if (a === '--secrets') opts.secrets = argv[++i]
    else if (a === '--overwrite-secrets') opts.overwriteSecrets = true
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '-h' || a === '--help') { usage(); process.exit(0) }
    else { console.error(`Unknown argument: ${a}`); usage(); process.exit(2) }
  }
  return opts
}

function usage () {
  console.log(`Usage: node install/import-cc-switch.js [options]

  --dir DIR             template directory   (default: <repo>/cc-switch)
  --db PATH             cc-switch database   (default: ~/.cc-switch/cc-switch.db)
  --timezone TZ         value for {{TIMEZONE}} (default: Asia/Shanghai)
  --secrets FILE        JSON map of placeholder -> real value, e.g.
                        { "DEEPKEY_CLAUDE_ANTHROPIC_AUTH_TOKEN": "sk-..." }
  --overwrite-secrets   replace keys on providers that already exist locally
  --dry-run             report what would change, write nothing
  -h, --help            show this help`)
}

function readJson (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/** Locate uvx, which the stdio MCP servers need. Falls back to bare "uvx" on PATH. */
function resolveUvx () {
  const candidates = process.platform === 'win32'
    ? [path.join(os.homedir(), '.local', 'bin', 'uvx.exe'), path.join(os.homedir(), '.cargo', 'bin', 'uvx.exe')]
    : [path.join(os.homedir(), '.local', 'bin', 'uvx'), '/opt/homebrew/bin/uvx', '/usr/local/bin/uvx']
  for (const c of candidates) if (fs.existsSync(c)) return c
  try {
    const probe = process.platform === 'win32' ? 'where' : 'which'
    const found = execFileSync(probe, ['uvx'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim()
    if (found) return found
  } catch { /* not on PATH; fall through */ }
  return 'uvx'
}

function isCcSwitchRunning () {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq cc-switch.exe'], { encoding: 'utf8' })
      return /cc-switch\.exe/i.test(out)
    }
    const out = execFileSync('pgrep', ['-x', 'cc-switch'], { encoding: 'utf8' })
    return out.trim().length > 0
  } catch {
    return false
  }
}

function main () {
  const opts = parseArgs(process.argv)

  if (!fs.existsSync(opts.dir)) {
    console.error(`Template directory not found: ${opts.dir}`)
    process.exit(1)
  }
  if (!fs.existsSync(opts.db)) {
    console.error(`cc-switch database not found: ${opts.db}`)
    console.error('Install cc-switch and launch it once so it creates its database, then re-run.')
    process.exit(1)
  }
  // Only guard the live database: a --db pointing elsewhere (tests, a copy) is not the
  // one the running app has open.
  const liveDb = path.join(os.homedir(), '.cc-switch', 'cc-switch.db')
  const targetsLiveDb = path.resolve(opts.db).toLowerCase() === liveDb.toLowerCase()
  if (targetsLiveDb && isCcSwitchRunning() && !opts.dryRun) {
    console.error('cc-switch is running. Quit it (including the tray icon) and re-run —')
    console.error('it keeps state in memory and would overwrite these changes on exit.')
    process.exit(1)
  }

  const secrets = opts.secrets ? readJson(opts.secrets) : {}
  const uvx = resolveUvx()

  const render = (text) => text
    .replace(/\{\{CLAUDE_HOME\}\}/g, path.join(os.homedir(), '.claude').replace(/\\/g, '/'))
    .replace(/\{\{HOME\}\}/g, os.homedir().replace(/\\/g, '/'))
    .replace(/\{\{TIMEZONE\}\}/g, opts.timezone)
    .replace(/\{\{UVX\}\}/g, uvx.replace(/\\/g, '\\\\'))

  /** Fill known secrets; report the ones still missing so the user can add them in the UI. */
  const unresolved = new Set()
  const renderSecrets = (text) => text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(secrets, key)) return secrets[key]
    unresolved.add(key)
    return ''
  })

  if (opts.dryRun) console.log('DRY RUN — no changes will be written\n')

  // Back up before the first write; cc-switch's own backups/ dir is the natural home.
  if (!opts.dryRun) {
    const backupDir = path.join(path.dirname(opts.db), 'backups')
    fs.mkdirSync(backupDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
    const dest = path.join(backupDir, `db_backup_preimport_${stamp}.db`)
    fs.copyFileSync(opts.db, dest)
    console.log(`Backed up database -> ${dest}`)
  }

  const db = new DatabaseSync(opts.db)
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((r) => r.name)
  const providerCols = cols('providers')
  const mcpCols = cols('mcp_servers')

  const summary = { providersAdded: 0, providersUpdated: 0, providersKeptKey: 0, mcp: 0, repos: 0 }

  // ---- providers ----------------------------------------------------------
  const provFile = path.join(opts.dir, 'providers.template.json')
  if (fs.existsSync(provFile)) {
    const { providers } = readJson(provFile)
    const findExisting = db.prepare('SELECT id, settings_config FROM providers WHERE name = ? AND app_type = ?')

    for (const p of providers) {
      const existing = findExisting.get(p.name, p.appType)
      const raw = JSON.stringify(p.settingsConfig)

      let config
      if (existing && !opts.overwriteSecrets) {
        // Keep whatever key the user already has locally: re-render the template but
        // splice the existing credential values back in.
        const prev = JSON.parse(existing.settings_config)
        config = JSON.parse(renderSecrets(render(raw)))
        config = mergeKeepingSecrets(config, prev)
        summary.providersKeptKey++
      } else {
        config = JSON.parse(renderSecrets(render(raw)))
      }

      const row = {
        id: existing ? existing.id : p.id,
        app_type: p.appType,
        name: p.name,
        settings_config: JSON.stringify(config, null, 2),
        website_url: p.websiteUrl || '',
        category: p.category,
        created_at: Date.now(),
        sort_index: p.sortIndex ?? 0,
        notes: p.notes || '',
        icon: p.icon,
        icon_color: p.iconColor,
        meta: JSON.stringify(p.meta || {}),
        provider_type: p.providerType
      }
      const usable = Object.keys(row).filter((k) => providerCols.includes(k))

      if (!opts.dryRun) {
        // Preserve is_current / in_failover_queue by never listing them here.
        const sql = existing
          ? `UPDATE providers SET ${usable.filter((k) => k !== 'id' && k !== 'app_type' && k !== 'created_at').map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND app_type = ?`
          : `INSERT INTO providers (${usable.join(', ')}) VALUES (${usable.map(() => '?').join(', ')})`
        const params = existing
          ? [...usable.filter((k) => k !== 'id' && k !== 'app_type' && k !== 'created_at').map((k) => row[k]), row.id, row.app_type]
          : usable.map((k) => row[k])
        db.prepare(sql).run(...params)
      }
      if (existing) summary.providersUpdated++
      else summary.providersAdded++
      console.log(`  ${existing ? 'update' : 'add   '} ${p.appType.padEnd(15)} ${p.name}`)
    }
  }

  // ---- MCP servers --------------------------------------------------------
  const mcpFile = path.join(opts.dir, 'mcp-servers.json')
  if (fs.existsSync(mcpFile)) {
    const { servers } = readJson(mcpFile)
    for (const s of servers) {
      const cfg = render(JSON.stringify(s.config))
      const existing = db.prepare('SELECT id FROM mcp_servers WHERE name = ?').get(s.name)
      const row = { name: s.name, server_config: cfg, description: s.description || null, homepage: s.homepage || null, docs: s.docs || null, tags: s.tags || '[]' }
      for (const c of mcpCols.filter((c) => c.startsWith('enabled_'))) row[c] = s[c] ?? 1
      const usable = Object.keys(row).filter((k) => mcpCols.includes(k))
      if (!opts.dryRun) {
        if (existing) {
          db.prepare(`UPDATE mcp_servers SET ${usable.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
            .run(...usable.map((k) => row[k]), existing.id)
        } else {
          const withId = mcpCols.includes('id') ? ['id', ...usable] : usable
          const vals = mcpCols.includes('id') ? [s.name, ...usable.map((k) => row[k])] : usable.map((k) => row[k])
          db.prepare(`INSERT INTO mcp_servers (${withId.join(', ')}) VALUES (${withId.map(() => '?').join(', ')})`).run(...vals)
        }
      }
      summary.mcp++
    }
  }

  // ---- skill repos --------------------------------------------------------
  const repoFile = path.join(opts.dir, 'skill-repos.json')
  if (fs.existsSync(repoFile)) {
    const { repos } = readJson(repoFile)
    const repoCols = cols('skill_repos')
    for (const r of repos) {
      const usable = Object.keys(r).filter((k) => repoCols.includes(k))
      if (!opts.dryRun) {
        db.prepare(`INSERT OR REPLACE INTO skill_repos (${usable.join(', ')}) VALUES (${usable.map(() => '?').join(', ')})`)
          .run(...usable.map((k) => r[k]))
      }
      summary.repos++
    }
  }

  // ---- shared settings skeleton ------------------------------------------
  const commonFile = path.join(opts.dir, 'common-config.claude.json')
  if (fs.existsSync(commonFile)) {
    const common = render(fs.readFileSync(commonFile, 'utf8'))
    if (!opts.dryRun) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .run('common_config_claude', JSON.stringify(JSON.parse(common), null, 2))
    }
    console.log('  common_config_claude updated')
  }

  db.close()

  // ---- app preferences ----------------------------------------------------
  const appFile = path.join(opts.dir, 'app-settings.json')
  if (fs.existsSync(appFile)) {
    const target = path.join(path.dirname(opts.db), 'settings.json')
    // Merge, so the local currentProvider* selections survive.
    const current = fs.existsSync(target) ? readJson(target) : {}
    const merged = { ...current, ...readJson(appFile) }
    if (!opts.dryRun) fs.writeFileSync(target, JSON.stringify(merged, null, 2) + '\n', 'utf8')
    console.log(`  app settings ${opts.dryRun ? 'would be ' : ''}merged -> ${target}`)
  }

  console.log('\nSummary')
  console.log(`  providers: ${summary.providersAdded} added, ${summary.providersUpdated} updated` +
              (summary.providersKeptKey ? ` (${summary.providersKeptKey} kept their existing API key)` : ''))
  console.log(`  mcp servers: ${summary.mcp}   skill repos: ${summary.repos}`)
  console.log(`  uvx resolved to: ${uvx}`)

  if (unresolved.size) {
    console.log('\n  These providers have no API key yet — open cc-switch and paste one in:')
    for (const k of [...unresolved].sort()) console.log(`    - ${k}`)
  }
  console.log('\nDone. Launch cc-switch, pick a provider, and click Enable.')
}

/**
 * Copy credential-shaped values from the previously stored config onto the freshly
 * rendered one, so re-importing a template never wipes a working API key.
 */
function mergeKeepingSecrets (next, prev) {
  const SECRET_RE = /(TOKEN|API_?KEY|SECRET|PASSWORD|CREDENTIAL|BEARER)/i
  if (Array.isArray(next) || typeof next !== 'object' || next === null) return next
  if (typeof prev !== 'object' || prev === null) return next
  const out = { ...next }
  for (const [k, v] of Object.entries(next)) {
    if (SECRET_RE.test(k)) {
      if (typeof prev[k] === 'string' && prev[k]) out[k] = prev[k]
    } else if (typeof v === 'string' && k === 'config' && typeof prev[k] === 'string') {
      // Codex keeps its provider config as a TOML blob; carry the old key line over.
      const m = prev[k].match(/(api_?key|experimental_bearer_token)\s*=\s*"([^"]+)"/i)
      if (m) out[k] = v.replace(/((?:api_?key|experimental_bearer_token)\s*=\s*)"[^"]*"/i, `$1"${m[2]}"`)
    } else if (v && typeof v === 'object') {
      out[k] = mergeKeepingSecrets(v, prev[k])
    }
  }
  return out
}

main()
