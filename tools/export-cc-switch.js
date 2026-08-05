#!/usr/bin/env node
/**
 * Export the local cc-switch configuration into repo templates.
 *
 * cc-switch keeps everything in a SQLite DB (~/.cc-switch/cc-switch.db) that holds
 * live API keys, so the DB itself must never be committed. This script pulls out the
 * parts that are worth version-controlling and strips every secret on the way out:
 *
 *   cc-switch/common-config.claude.json  the settings.json skeleton cc-switch merges
 *                                        into ~/.claude/settings.json on every switch
 *   cc-switch/providers.template.json    provider list, API keys replaced by placeholders
 *   cc-switch/mcp-servers.json           cc-switch's own MCP registry
 *   cc-switch/skill-repos.json           skill marketplace repos
 *   cc-switch/app-settings.json          app preferences (no provider ids, no secrets)
 *
 * Machine-specific absolute paths are rewritten to {{CLAUDE_HOME}} / {{UVX}} / {{TIMEZONE}}
 * so install/import-cc-switch.js can render them for the target machine.
 *
 * Usage: node tools/export-cc-switch.js [--db PATH] [--out DIR] [--include-internal]
 */

'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

// Providers whose base_url points at a private/intranet relay. These are useful on the
// origin machine but must not be published, so they are dropped unless --include-internal.
const INTERNAL_URL_PATTERNS = [/zsquant\.com/i]

// Any settings_config key matching this is a credential and gets placeholdered.
const SECRET_KEY_RE = /(TOKEN|API_?KEY|SECRET|PASSWORD|CREDENTIAL|BEARER)/i

function parseArgs (argv) {
  const opts = {
    db: path.join(os.homedir(), '.cc-switch', 'cc-switch.db'),
    out: path.join(__dirname, '..', 'cc-switch'),
    includeInternal: false
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--db') opts.db = argv[++i]
    else if (a === '--out') opts.out = argv[++i]
    else if (a === '--include-internal') opts.includeInternal = true
    else if (a === '-h' || a === '--help') { usage(); process.exit(0) }
    else { console.error(`Unknown argument: ${a}`); usage(); process.exit(2) }
  }
  return opts
}

function usage () {
  console.log(`Usage: node tools/export-cc-switch.js [options]

  --db PATH            cc-switch database (default: ~/.cc-switch/cc-switch.db)
  --out DIR            output directory  (default: <repo>/cc-switch)
  --include-internal   also export providers pointing at intranet relays
  -h, --help           show this help`)
}

/** Rewrite machine-specific absolute paths into placeholders. */
function genericizePaths (text) {
  const home = os.homedir().replace(/\\/g, '/')
  return text
    // ~/.claude in any slash flavour -> {{CLAUDE_HOME}}
    .replace(new RegExp(escapeRe(home + '/.claude').replace(/\//g, '[\\\\/]+'), 'gi'), '{{CLAUDE_HOME}}')
    .replace(new RegExp(escapeRe(home).replace(/\//g, '[\\\\/]+'), 'gi'), '{{HOME}}')
}

function escapeRe (s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Replace every credential-looking value with a {{PLACEHOLDER}}, recursively. */
function redact (node, providerSlug) {
  if (Array.isArray(node)) return node.map((v) => redact(v, providerSlug))
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      out[k] = SECRET_KEY_RE.test(k) && typeof v === 'string' && v.length > 0
        ? `{{${providerSlug}_${k.toUpperCase()}}}`
        : redact(v, providerSlug)
    }
    return out
  }
  return node
}

/** Codex providers store their config as a TOML string; scrub inline keys there too. */
function redactToml (toml, providerSlug) {
  return toml
    .replace(/(\b(?:api_?key|experimental_bearer_token|token|secret)\s*=\s*)"[^"]*"/gi,
      (_m, lhs) => `${lhs}"{{${providerSlug}_OPENAI_API_KEY}}"`)
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, `{{${providerSlug}_OPENAI_API_KEY}}`)
}

/** A stable, uppercase, identifier-safe slug for placeholder names. */
function slugify (name) {
  const ascii = name.replace(/[^\x20-\x7E]/g, '').trim()
  const slug = (ascii || 'provider').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return slug || 'PROVIDER'
}

function baseUrlOf (cfg) {
  if (cfg && cfg.env && cfg.env.ANTHROPIC_BASE_URL) return cfg.env.ANTHROPIC_BASE_URL
  if (cfg && typeof cfg.config === 'string') {
    const m = cfg.config.match(/base_url\s*=\s*"([^"]+)"/)
    if (m) return m[1]
  }
  return ''
}

/**
 * Every app cc-switch supports spells the endpoint differently (base_url, baseUrl,
 * baseURL, GOOGLE_GEMINI_BASE_URL, ...), so match the internal-relay patterns against
 * the whole serialized provider rather than a fixed list of fields. Missing one would
 * publish an intranet hostname to a public repo.
 */
function mentionsInternal (provider) {
  const haystack = JSON.stringify(provider)
  return INTERNAL_URL_PATTERNS.some((re) => re.test(haystack))
}

function tableColumns (db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name)
}

function main () {
  const opts = parseArgs(process.argv)

  if (!fs.existsSync(opts.db)) {
    console.error(`cc-switch database not found: ${opts.db}`)
    console.error('Install cc-switch and configure at least one provider first.')
    process.exit(1)
  }

  const db = new DatabaseSync(opts.db, { readOnly: true })
  fs.mkdirSync(opts.out, { recursive: true })

  const written = []
  const write = (name, data) => {
    const file = path.join(opts.out, name)
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
    written.push({ name, file })
  }

  // ---- settings -----------------------------------------------------------
  // cc-switch stores the shared settings skeleton it merges into ~/.claude/settings.json
  // under the `common_config_claude` key, plus a pile of app preferences.
  const settingsRows = db.prepare('SELECT key, value FROM settings').all()
  const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))

  let commonConfig = null
  if (settings.common_config_claude) {
    commonConfig = JSON.parse(genericizePaths(settings.common_config_claude))
    // The token/base-url belong to whichever provider is active; they are not shared config.
    if (commonConfig.env) {
      delete commonConfig.env.ANTHROPIC_AUTH_TOKEN
      delete commonConfig.env.ANTHROPIC_BASE_URL
    }
    write('common-config.claude.json', commonConfig)
  } else {
    console.warn('WARN: no common_config_claude in cc-switch; skipping common-config.claude.json')
  }

  // ---- app preferences ----------------------------------------------------
  // ~/.cc-switch/settings.json holds UI preferences. currentProvider* point at local
  // uuids that mean nothing on another machine, so they are dropped.
  const appSettingsPath = path.join(path.dirname(opts.db), 'settings.json')
  if (fs.existsSync(appSettingsPath)) {
    const app = JSON.parse(fs.readFileSync(appSettingsPath, 'utf8'))
    for (const k of Object.keys(app)) {
      if (k.startsWith('currentProvider') || k === 'localMigrations') delete app[k]
    }
    write('app-settings.json', app)
  }

  // ---- providers ----------------------------------------------------------
  const provCols = tableColumns(db, 'providers')
  const has = (c) => provCols.includes(c)
  const providers = db.prepare('SELECT * FROM providers ORDER BY app_type, sort_index, name').all()

  const exported = []
  const skipped = []
  const placeholders = new Set()

  for (const p of providers) {
    let cfg
    try {
      cfg = JSON.parse(p.settings_config)
    } catch {
      skipped.push({ name: p.name, app: p.app_type, reason: 'settings_config is not JSON' })
      continue
    }

    const base = baseUrlOf(cfg)
    if (mentionsInternal(p) && !opts.includeInternal) {
      skipped.push({ name: p.name, app: p.app_type, reason: `internal relay (${base || 'referenced in config'})` })
      continue
    }

    const slug = slugify(p.name)
    let clean = redact(cfg, slug)
    if (typeof clean.config === 'string') clean.config = redactToml(clean.config, slug)
    clean = JSON.parse(genericizePaths(JSON.stringify(clean)))

    for (const m of JSON.stringify(clean).matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) {
      if (!['CLAUDE_HOME', 'HOME', 'TIMEZONE', 'UVX'].includes(m[1])) placeholders.add(m[1])
    }

    let meta = {}
    if (has('meta') && p.meta) {
      try { meta = JSON.parse(genericizePaths(p.meta)) } catch { meta = {} }
    }

    exported.push({
      // `id` is regenerated on import; kept only so re-exports stay diff-stable.
      id: p.id,
      appType: p.app_type,
      name: p.name,
      websiteUrl: p.website_url || '',
      category: p.category || null,
      sortIndex: has('sort_index') ? (p.sort_index ?? 0) : 0,
      notes: has('notes') ? (p.notes || '') : '',
      icon: has('icon') ? (p.icon || null) : null,
      iconColor: has('icon_color') ? (p.icon_color || null) : null,
      providerType: has('provider_type') ? (p.provider_type || null) : null,
      meta,
      settingsConfig: clean
    })
  }

  write('providers.template.json', {
    $comment: 'Exported by tools/export-cc-switch.js. Every {{PLACEHOLDER}} must be filled in ' +
              'before import, or left blank to add the key later in the cc-switch UI.',
    placeholders: [...placeholders].sort(),
    providers: exported
  })

  // ---- MCP servers --------------------------------------------------------
  const mcpCols = tableColumns(db, 'mcp_servers')
  const mcp = db.prepare('SELECT * FROM mcp_servers ORDER BY name').all().map((m) => {
    let cfg = JSON.parse(genericizePaths(m.server_config))
    // uvx/npx live at different absolute paths per machine; let the importer resolve them.
    if (typeof cfg.command === 'string' && /uvx(\.exe)?$/i.test(cfg.command)) cfg.command = '{{UVX}}'
    if (Array.isArray(cfg.args)) {
      cfg.args = cfg.args.map((a) => (typeof a === 'string' && /^[A-Za-z]+\/[A-Za-z_]+$/.test(a) && a.includes('/')
        ? a
        : a))
    }
    // The time server hard-codes a timezone.
    if (Array.isArray(cfg.args)) {
      const tzIdx = cfg.args.indexOf('--local-timezone')
      if (tzIdx >= 0 && cfg.args[tzIdx + 1]) cfg.args[tzIdx + 1] = '{{TIMEZONE}}'
    }
    const row = { name: m.name, config: cfg }
    for (const [col, key] of [['description', 'description'], ['homepage', 'homepage'], ['docs', 'docs'], ['tags', 'tags']]) {
      if (mcpCols.includes(col) && m[col]) row[key] = m[col]
    }
    for (const col of mcpCols.filter((c) => c.startsWith('enabled_'))) {
      row[col] = m[col] ? 1 : 0
    }
    return row
  })
  write('mcp-servers.json', { servers: mcp })

  // ---- skill repos --------------------------------------------------------
  const skillCols = tableColumns(db, 'skill_repos')
  const repos = db.prepare('SELECT * FROM skill_repos').all().map((r) => {
    const row = {}
    for (const c of skillCols) row[c] = r[c]
    return row
  })
  write('skill-repos.json', { repos })

  db.close()

  // ---- report -------------------------------------------------------------
  console.log(`cc-switch export -> ${opts.out}`)
  for (const w of written) console.log(`  wrote ${w.name}`)
  console.log(`\n  providers exported: ${exported.length}`)
  for (const p of exported) console.log(`    + ${p.appType.padEnd(15)} ${p.name}`)
  if (skipped.length) {
    console.log(`  providers skipped:  ${skipped.length}`)
    for (const s of skipped) console.log(`    - ${s.app.padEnd(15)} ${s.name}  (${s.reason})`)
  }
  console.log(`  mcp servers: ${mcp.length}   skill repos: ${repos.length}`)
  if (placeholders.size) {
    console.log(`\n  secrets replaced by placeholders: ${[...placeholders].sort().join(', ')}`)
  }

  // Last line of defence: refuse to leave anything publishable that still looks like a
  // live key or names an intranet host.
  const dump = written.map((w) => fs.readFileSync(w.file, 'utf8')).join('\n')
  const leak = dump.match(/\bsk-[A-Za-z0-9_-]{16,}\b/)
  if (leak) {
    console.error(`\nERROR: a credential survived redaction (${leak[0].slice(0, 8)}...). Not safe to commit.`)
    process.exit(1)
  }
  if (!opts.includeInternal) {
    const internal = INTERNAL_URL_PATTERNS.map((re) => dump.match(re)).find(Boolean)
    if (internal) {
      console.error(`\nERROR: an internal hostname survived filtering (${internal[0]}). Not safe to commit.`)
      process.exit(1)
    }
  }
  console.log('\n  secret scan: clean')
}

main()
