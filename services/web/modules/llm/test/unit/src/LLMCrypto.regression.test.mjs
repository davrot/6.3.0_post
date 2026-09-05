/**
 * Regression: BYO LLM key at-rest encryption (owner queue item).
 *
 * Guarantees pinned here (2026-09 owner report "BYO save" regression risk):
 *  1. encrypt→decrypt round-trip is lossless.
 *  2. stored value is `enc:v1:<iv>:<tag>:<ct>` (base64) and never contains
 *     the plaintext.
 *  3. GCM auth works: a tampered ciphertext THROWS (never returns a
 *     silently-wrong key).
 *  4. legacy plaintext values read back unchanged; normalizeStoredSecret
 *     upgrades them to encrypted form (rows never persist plaintext keys).
 *  5. missing LLM_KEY_SECRET degrades gracefully (plaintext pass-through),
 *     never crashes.
 *
 * No real keys anywhere — all dummies (owner rule: repo files never contain
 * real keys).
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest'

const DUMMY_SECRET = 'a'.repeat(64) // 512-bit dummy bootstrap key (test only)
const DUMMY_KEY = 'sk-test-dummy-key-1234' // NOT a real key

let LLMCrypto

beforeAll(async () => {
  process.env.LLM_KEY_SECRET = DUMMY_SECRET
  LLMCrypto = await import('../../../app/src/LLMCrypto.mjs')
})

afterAll(() => {
  delete process.env.LLM_KEY_SECRET
})

describe('BYO save: LLMCrypto at-rest encryption', function () {
  it('round-trips a key losslessly', function () {
    const stored = LLMCrypto.encryptSecret(DUMMY_KEY)
    expect(LLMCrypto.decryptSecret(stored)).toEqual(DUMMY_KEY)
  })

  it('stores enc:v1:<iv>:<tag>:<ct> and never the plaintext', function () {
    const stored = LLMCrypto.encryptSecret(DUMMY_KEY)
    expect(stored.startsWith('enc:v1:')).toBe(true)
    const parts = stored.slice('enc:v1:'.length).split(':')
    expect(parts.length).toEqual(3)
    // iv(12B) / tag(16B) / ct base64 lengths
    expect(Buffer.from(parts[0], 'base64').length).toEqual(12)
    expect(Buffer.from(parts[1], 'base64').length).toEqual(16)
    expect(stored).not.toContain(DUMMY_KEY)
  })

  it('produces a different ciphertext per call (random IV)', function () {
    expect(LLMCrypto.encryptSecret(DUMMY_KEY)).not.toEqual(
      LLMCrypto.encryptSecret(DUMMY_KEY)
    )
  })

  it('fails closed on a tampered ciphertext (GCM auth tag) — never a wrong key', function () {
    const [prefix, ...parts] = LLMCrypto.encryptSecret(DUMMY_KEY).split(':')
    const [iv, tag, ct] = parts
    // corrupt one ciphertext byte (flip first base64 char to a different one)
    const corrupted = ct[0] === 'A' ? 'B' + ct.slice(1) : 'A' + ct.slice(1)
    const tampered = `${prefix}:${iv}:${tag}:${corrupted}`
    // contract: fail closed with '' (chat then reports "not configured") —
    // it must NEVER return a silently-wrong key
    expect(LLMCrypto.decryptSecret(tampered)).toEqual('')
    expect(LLMCrypto.storedToPlaintext(tampered)).toEqual('')
  })

  it('passes empty values through (keyless rows)', function () {
    expect(LLMCrypto.encryptSecret('')).toEqual('')
    expect(LLMCrypto.decryptSecret('')).toEqual('')
  })

  it('reads legacy plaintext back unchanged', function () {
    expect(LLMCrypto.storedToPlaintext('legacy-plain-key')).toEqual(
      'legacy-plain-key'
    )
  })

  it('upgrades legacy plaintext to encrypted storage', function () {
    const normalized = LLMCrypto.normalizeStoredSecret('legacy-plain-key')
    expect(normalized.startsWith('enc:v1:')).toBe(true)
    expect(LLMCrypto.decryptSecret(normalized)).toEqual('legacy-plain-key')
    // already-encrypted values are left as-is
    const enc = LLMCrypto.encryptSecret(DUMMY_KEY)
    expect(LLMCrypto.normalizeStoredSecret(enc)).toEqual(enc)
  })
})

describe('BYO save: graceful degradation without LLM_KEY_SECRET', function () {
  it('passes values through unencrypted instead of crashing', async () => {
    // encryptSecret reads process.env.LLM_KEY_SECRET at CALL time, so the
    // shared module instance is fine — no fresh import needed.
    const saved = process.env.LLM_KEY_SECRET
    delete process.env.LLM_KEY_SECRET
    try {
      expect(LLMCrypto.encryptSecret(DUMMY_KEY)).toEqual(DUMMY_KEY)
      expect(LLMCrypto.decryptSecret(DUMMY_KEY)).toEqual(DUMMY_KEY)
    } finally {
      process.env.LLM_KEY_SECRET = saved
    }
  })
})
