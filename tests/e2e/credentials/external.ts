/**
 * LOCAL external-service credentials for the e2e suite (git hosts, webdav,
 * dropbox, zotero, LLM providers, …).
 *
 * Layout (all under tests/e2e/credentials/):
 *   config.json            — local only (git-ignored); template: config.json.example
 *   .auth/<service>.json   — cached short-lived tokens (git-ignored), written by
 *                            scripts/auth-capture.mjs or by tests minting tokens
 *
 * Policy (owner rule 2026-09-05):
 *   - real credential values NEVER leave this machine / never land in git;
 *   - STABLE secrets (usernames, passwords, PATs) live in config.json;
 *   - EPHEMERAL tokens (obtained after a one-time login, valid "for some hours")
 *     are NOT pasted into config.json — they are captured once into .auth/
 *     with an expiry, and `getServiceToken()` validates the expiry on read;
 *   - when config.json is absent, everything degrades to "skip" — the rest of
 *     the suite stays fully green against the local stack.
 */
import fs from 'node:fs'
import path from 'node:path'

export type ExternalService =
  | 'github'
  | 'forgejo'
  | 'gitea'
  | 'gitlab'
  | 'webdav'
  | 'dropbox'
  | 'zotero'
  | 'llm'

type ServiceConfig = Record<string, unknown> & { enabled?: unknown }

export interface CachedToken {
  token: string
  obtainedAt: number
  /** epoch ms; undefined = "unknown expiry" (treated as valid until cleared) */
  expiresAt?: number
  meta?: Record<string, unknown>
}

function dir(): string {
  return path.join(process.cwd(), 'credentials')
}

function configPath(): string {
  if (process.env.EXTERNAL_CREDENTIALS) return process.env.EXTERNAL_CREDENTIALS
  return path.join(dir(), 'config.json')
}

export function authDir(): string {
  return path.join(dir(), '.auth')
}

/** Read the local config; null when absent (specs must treat null as "skip"). */
export function readExternalConfig(): Record<string, ServiceConfig> | null {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8')
    const json = JSON.parse(raw)
    if (!json || typeof json !== 'object') return null
    const out: Record<string, ServiceConfig> = {}
    for (const [k, v] of Object.entries(json)) {
      if (k.startsWith('_')) continue
      if (v && typeof v === 'object' && (v as ServiceConfig).enabled !== undefined) out[k] = v as ServiceConfig
    }
    return out
  } catch {
    return null
  }
}

/** The service's config object (non-underscore fields) or null. */
export function getExternal(name: string): ServiceConfig | null {
  const cfg = readExternalConfig()
  const svc = cfg?.[name]
  if (!svc) return null
  const { enabled: _e, ...rest } = svc
  return rest
}

/** True only when config.json exists, the service is present AND enabled:true. */
export function externalEnabled(name: string): boolean {
  return readExternalConfig()?.[name]?.enabled === true
}

/** Names of all enabled services (for a "what is configured" listing). */
export function enabledServices(): string[] {
  return Object.entries(readExternalConfig() ?? {}).filter(([, v]) => v.enabled === true).map(([k]) => k)
}

// ---------------------------------------------------------------------------
// ephemeral tokens (.auth/<service>.json)
// ---------------------------------------------------------------------------

export function saveServiceToken(name: string, token: string, opts: { ttlMs?: number; meta?: Record<string, unknown> } = {}): string {
  const d = authDir()
  fs.mkdirSync(d, { recursive: true, mode: 0o700 })
  const p = path.join(d, `${name}.json`)
  const now = Date.now()
  const doc: CachedToken = {
    token,
    obtainedAt: now,
    ...(opts.ttlMs ? { expiresAt: now + opts.ttlMs } : {}),
    ...(opts.meta ? { meta: opts.meta } : {}),
  }
  fs.writeFileSync(p, JSON.stringify(doc, null, 2), { mode: 0o600 })
  return p
}

export class TokenExpiredError extends Error {
  constructor(service: string) {
    super(
      `cached token for "${service}" is expired — re-run: ` +
        `node scripts/auth-capture.mjs --service ${service} ` +
        `(or delete credentials/.auth/${service}.json and provide fresh credentials)`
    )
    this.name = 'TokenExpiredError'
  }
}

export function clearAuthToken(name: string): boolean {
  try {
    fs.unlinkSync(path.join(authDir(), `${name}.json`))
    return true
  } catch {
    return false
  }
}

/**
 * Read a cached token, honoring expiresAt. Throws TokenExpiredError when the
 * cache entry exists but is stale (caller should surface the re-capture hint).
 */
export function getServiceToken(name: string): CachedToken | null {
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(authDir(), `${name}.json`), 'utf8')) as CachedToken
    if (typeof doc?.token !== 'string' || !doc.token) return null
    if (typeof doc.expiresAt === 'number' && doc.expiresAt <= Date.now()) throw new TokenExpiredError(name)
    return doc
  } catch (e) {
    if (e instanceof TokenExpiredError) throw e
    return null
  }
}
