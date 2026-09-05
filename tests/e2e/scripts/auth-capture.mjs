#!/usr/bin/env node
/**
 * auth-capture — one-time browser login → cached short-lived token.
 *
 * For services where the key is only issued AFTER a login (OAuth-style) and is
 * valid "for some hours": run this ONCE with a headed browser, finish the
 * login in the window, and the token is captured and cached in
 * `credentials/.auth/<service>.json` (0600, git-ignored). The e2e helper
 * `getServiceToken()` validates expiry on every read.
 *
 * Two capture modes (pick one):
 *   --token-selector "css"   page shows the token in an element after login
 *   --token-response URLSUB  the token arrives as a JSON API response
 *                            (JSON field auto-detected: access_token|token|token_id|key)
 *
 * Examples:
 *   node scripts/auth-capture.mjs --service dropbox \
 *        --url "https://www.dropbox.com/oauth2/authorize?client_id=..." [--ttl 4h]
 *   node scripts/auth-capture.mjs --service webdav-session \
 *        --url "https://cloud.example.com/login" \
 *        --token-selector "input[name=loginToken]" --ttl 12h
 *
 * Options: --ttl <n><m|h|d> (default 4h), --wait <ms> max wait (default 300000)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const k = a.slice(2)
    const v = argv[i + 1]
    if (v !== undefined && !v.startsWith('--')) { out[k] = v; i++ } else out[k] = true
  }
  return out
}

function ttlToMs(t) {
  if (!t) return 4 * 3600 * 1000
  const m = String(t).match(/^(\d+)\s*([mhd])$/i)
  if (!m) throw new Error(`--ttl must be like 90m | 4h | 2d (got: ${t})`)
  const n = Number(m[1])
  const unit = { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2].toLowerCase()]
  return n * unit
}

async function loadPlaywright() {
  try {
    return await import('@playwright/test')
  } catch {
    return await import('playwright')
  }
}

const args = parseArgs(process.argv.slice(2))
const service = args.service
const url = args.url
if (!service || !url) {
  console.error('usage: node scripts/auth-capture.mjs --service <name> --url <login-url> [--token-selector css | --token-response URLSUB] [--ttl 4h] [--wait 300000]')
  process.exit(2)
}
if (!args['token-selector'] && !args['token-response']) {
  console.error('need --token-selector or --token-response (see header comments for examples)')
  process.exit(2)
}

// resolve the credentials dir relative to this script (scripts/ → e2e root)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const authDirPath = path.join(root, 'credentials', '.auth')
fs.mkdirSync(authDirPath, { recursive: true, mode: 0o700 })
const outFile = path.join(authDirPath, `${service}.json`)

const pw = await loadPlaywright()
const { chromium } = pw
const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] })
const context = await browser.newContext()
const page = await context.newPage()

let captured = null
const deadline = Date.now() + (Number(args.wait) || 300_000)

if (args['token-selector']) {
  // poll until the element containing the token appears, then read it
  for (;;) {
    const el = await page.locator(String(args['token-selector'])).first().count()
    if (el > 0) {
      const raw = await page.locator(String(args['token-selector'])).first().inputValue().catch(() => null)
        ?? await page.locator(String(args['token-selector'])).first().textContent().catch(() => null)
      if (raw && raw.trim()) { captured = raw.trim(); break }
    }
    if (Date.now() > deadline) break
    await new Promise(r => setTimeout(r, 1000))
  }
} else {
  const sub = String(args['token-response'])
  page.on('response', async (res) => {
    if (captured) return
    let u
    try { u = res.url() } catch { return }
    if (!u.includes(sub)) return
    try {
      const body = await res.text()
      const json = JSON.parse(body)
      const t = json.access_token ?? json.token ?? json.token_id ?? json.api_key ?? json.key
      if (typeof t === 'string' && t) captured = t
    } catch { /* not JSON or unreadable — ignore */ }
  })
  while (!captured && Date.now() <= deadline) await new Promise(r => setTimeout(r, 1000))
}

await browser.close()

if (!captured) {
  console.error(`[auth-capture] timed out after capture window — nothing saved. ${outFile}`)
  process.exit(1)
}

const now = Date.now()
const doc = { token: captured, obtainedAt: now, expiresAt: now + ttlToMs(args.ttl), meta: { service, capturedBy: 'auth-capture', url: url.replace(/\S{8,}/g, s => s.slice(0, 6) + '…') } }
fs.writeFileSync(outFile, JSON.stringify(doc, null, 2), { mode: 0o600 })
console.log(`[auth-capture] saved token for "${service}" → ${outFile} (ttl ${String(args.ttl) || '4h'}, 0600)`)
