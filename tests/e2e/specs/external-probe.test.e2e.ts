/**
 * external-probe — live checks of the LOCAL external-service credentials
 * (tests/e2e/credentials/config.json).
 *
 * Every test SKIPS unless its service is present + `enabled: true` in the
 * local config — without config.json the whole file is skipped and the rest
 * of the suite is unaffected. These probes verify the CREDENTIALS (the ones
 * that will drive the real sync/integration flows), not the app.
 *
 * Run alone:   npx playwright test specs/external-probe.test.e2e.ts
 */
import { test, expect } from '@playwright/test'
import { externalEnabled, getExternal, getServiceToken, TokenExpiredError } from '../credentials/external'

const T = 20_000

async function req(url: string, init: RequestInit = {}, headers: Record<string, string> = {}, ms = T) {
  const res = await fetch(url, { ...init, headers: { ...headers }, signal: AbortSignal.timeout(ms), redirect: 'follow' })
  let body: unknown = null
  const text = await res.text().catch(() => null)
  if (text) { try { body = JSON.parse(text) } catch { /* keep text */ } }
  return { status: res.status, body, text }
}

test('git host credentials resolve to a user (github/forgejo/gitea/gitlab)', async () => {
  const names = (['github', 'forgejo', 'gitea', 'gitlab'] as const).filter(n => externalEnabled(n))
  test.skip(names.length === 0, 'no git host enabled — see credentials/README.md')
  for (const name of names) {
    const cfg = getExternal(name)!
    const base = String(cfg.baseUrl).replace(/\/$/, '')
    const user = String(cfg.username || '')
    const pat = String(cfg.pat || '')
    let out: { status: number; body: any }
    if (name === 'github') {
      out = await req(`${base}/api/v3/user`, {}, { Authorization: `Bearer ${pat}`, 'user-agent': 'ollitex-e2e' })
      expect(out.status, 'github /api/v3/user').toBe(200)
      const who = out.body?.login ?? out.body?.login_name
      if (user) expect(who, 'github login').toBe(user)
    } else if (name === 'gitlab') {
      out = await req(`${base}/api/v4/user`, {}, { 'PRIVATE-TOKEN': pat })
      expect(out.status, 'gitlab /api/v4/user').toBe(200)
      if (user) expect(out.body?.username).toBe(user)
    } else {
      // gitea + forgejo share the /api/v1 surface
      out = await req(`${base}/api/v1/user`, {}, { Authorization: `token ${pat}` })
      expect(out.status, `${name} /api/v1/user`).toBe(200)
      const who = out.body?.login ?? out.body?.login_name
      if (user) expect(who, `${name} login`).toBe(user)
    }
  }
})

test('webdav credentials list the root collection', async () => {
  test.skip(!externalEnabled('webdav'), 'webdav not enabled — see credentials/README.md')
  const cfg = getExternal('webdav')!
  const base = String(cfg.baseUrl).replace(/\/$/, '')
  const auth = Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')
  const res = await fetch(base, {
    method: 'PROPFIND',
    headers: {
      Authorization: `Basic ${auth}`,
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8',
    },
    body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><resourcetype/></prop></propfind>',
    signal: AbortSignal.timeout(T),
  })
  const status = res.status
  await res.arrayBuffer().catch(() => null)
  expect(status === 200 || status === 207, `webdav PROPFIND got ${status}`).toBeTruthy()
})

test('dropbox token is valid (cached or static)', async () => {
  test.skip(!externalEnabled('dropbox'), 'dropbox not enabled — see credentials/README.md')
  const cfg = getExternal('dropbox')!
  let token: string | null | undefined = cfg.token ? String(cfg.token) : undefined
  if (!token) token = getServiceToken('dropbox')?.token
  test.skip(!token, 'dropbox: no token — run `node scripts/auth-capture.mjs --service dropbox --url <authorize-url>` (see credentials/README.md)')
  const out = await req('https://api.dropboxapi.com/2/users/get_current_account', {}, { Authorization: `Bearer ${token}` })
  expect([200, 201], 'dropbox account call').toContain(out.status)
  expect(out.body?.account_id, 'dropbox account_id').toBeTruthy()
})

test('zotero API key resolves', async () => {
  test.skip(!externalEnabled('zotero'), 'zotero not enabled — see credentials/README.md')
  const cfg = getExternal('zotero')!
  const base = String(cfg.baseUrl).replace(/\/$/, '')
  const out = await req(
    `${base}/api/users/0/groups`,
    {},
    { ZOTERO_API_KEY: String(cfg.apiKey), ZOTERO_USER: String(cfg.username || '') },
  )
  expect(out.status, 'zotero /groups').toBe(200)
})

test('LLM provider answers /models', async () => {
  test.skip(!externalEnabled('llm'), 'llm not enabled — see credentials/README.md')
  const cfg = getExternal('llm')!
  const base = String(cfg.baseUrl).replace(/\/$/, '')
  const out = await req(`${base}/models`, {}, { Authorization: `Bearer ${cfg.apiKey}` })
  expect(out.status, 'llm /models').toBe(200)
  const arr = Array.isArray(out.body) ? out.body : out.body?.data
  expect(Array.isArray(arr) && arr.length > 0, 'llm model list non-empty').toBeTruthy()
})

// TokenExpiredError is exported so future specs can catch it; referenced to
// keep the import honest.
test('token-cache contract: expired cache throws actionable error', async ({}) => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const { authDir, saveServiceToken } = await import('../credentials/external')
  const p = path.join(authDir(), 'probe-contract.json')
  try {
    saveServiceToken('probe-contract', 'x', { ttlMs: -1 }) // already expired
    expect(() => getServiceToken('probe-contract'), 'expired token must throw').toThrow(TokenExpiredError)
  } finally {
    fs.rmSync(p, { force: true })
  }
})
