/**
 * Regression: BYO provider SAVE (owner queue item) — controller level.
 *
 * Pins the `POST /user/llm-providers` save contract:
 *  - the dummy API key is ENCRYPTED before it reaches User.updateOne
 *    (stored form starts with `enc:v1:`, never plaintext);
 *  - the response row never exposes the key (only `hasKey`);
 *  - keyless rows persist `apiKey: ''`;
 *  - LLM_ALLOW_USER_SETTINGS gate: 'false'/unset → 403 (same source as the
 *    live JSON routes — R11 lesson).
 *
 * No real keys anywhere — all dummies (owner rule).
 */
import { afterEach, beforeEach, describe, expect, it, vi, beforeAll } from 'vitest'
import os from 'node:os'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const state = vi.hoisted(() => ({
  user: null,
  updateOneCalls: [],
}))

const ADMIN_FIXTURE = path.join(os.tmpdir(), `llm-byo-fixture-${process.pid}.json`)
process.env.LLM_ADMIN_SETTINGS_PATH = ADMIN_FIXTURE

vi.mock('../../../../../app/src/models/User.mjs', () => ({
  User: {
    findById: async () => state.user,
    updateOne: (filter, update) => {
      state.updateOneCalls.push({ filter, update })
      return { modifiedCount: 1, matchedCount: 1 }
    },
  },
}))
vi.mock('../../../../../app/src/Features/Authentication/SessionManager.mjs', () => ({
  default: {
    getLoggedInUserId: () => 'user-1',
  },
}))

const { default: LLMSettingsController } = await import(
  '../../../app/src/LLMSettingsController.mjs'
)

const DUMMY_KEY = 'sk-test-dummy-key-1234' // NOT a real key

class FakeRes {
  constructor() {
    this.body = ''
    this.statusCode = 200
  }
  status(code) {
    this.statusCode = code
    return this
  }
  json(obj) {
    this.body = JSON.stringify(obj)
    return this
  }
}

async function writeAdmin() {
  await fs.writeFile(ADMIN_FIXTURE, JSON.stringify({})).catch(() => undefined)
}

beforeAll(async () => {
  await fs.unlink(ADMIN_FIXTURE).catch(() => undefined)
})

beforeEach(async () => {
  state.user = {
    _id: 'user-1',
    llmProviders: [],
    llmApiUrl: '',
    llmApiKey: '',
    llmModelName: '',
  }
  state.updateOneCalls = []
  process.env.LLM_ALLOW_USER_SETTINGS = 'true'
  process.env.LLM_KEY_SECRET = 'a'.repeat(64) // dummy bootstrap key (test only)
  await writeAdmin()
})

afterEach(() => {
  delete process.env.LLM_KEY_SECRET
})

const validBody = {
  name: 'Test provider',
  providerType: 'openaiCompatible',
  baseUrl: 'https://llm.example.com/v1',
  apiKey: DUMMY_KEY,
  models: ['meta-llama-3.1-8b-instruct'],
  completionModel: 'meta-llama-3.1-8b-instruct',
}

describe('POST /user/llm-providers (BYO save regression)', () => {
  it('encrypts the key at rest and masks it in the response', async () => {
    const res = new FakeRes()
    await LLMSettingsController.addProvider(
      { session: { userId: 'user-1' }, body: { ...validBody } },
      res
    )

    expect(res.statusCode).toEqual(201)
    const parsed = JSON.parse(res.body)
    expect(parsed.ok).toBe(true)
    expect(parsed.provider.hasKey).toBe(true)
    expect(parsed.provider.apiKey).toBeUndefined() // never echo the key
    expect(res.body).not.toContain(DUMMY_KEY)

    // exactly one persistence call; stored key is ciphertext
    expect(state.updateOneCalls.length).toEqual(1)
    const rows = state.updateOneCalls[0].update.$set.llmProviders
    const row = rows.find(r => r.name === 'Test provider')
    expect(row).toBeDefined()
    expect(row.apiKey.startsWith('enc:v1:')).toBe(true)
    expect(state.updateOneCalls[0].update.$set.llmProviders
      .map(r => r.apiKey).join('|')
    ).not.toContain(DUMMY_KEY)
  })

  it('persists keyless rows with an empty apiKey', async () => {
    const res = new FakeRes()
    await LLMSettingsController.addProvider(
      {
        session: { userId: 'user-1' },
        body: { ...validBody, apiKey: '', name: 'Keyless' },
      },
      res
    )
    expect(res.statusCode).toEqual(201)
    const rows = state.updateOneCalls[0].update.$set.llmProviders
    const row = rows.find(r => r.name === 'Keyless')
    expect(row.apiKey).toEqual('')
    expect(JSON.parse(res.body).provider.hasKey).toBe(false)
  })

  it('rejects invalid rows with 400 and no write', async () => {
    const res = new FakeRes()
    await LLMSettingsController.addProvider(
      {
        session: { userId: 'user-1' },
        body: { ...validBody, models: [] }, // schema: min(1)
      },
      res
    )
    expect(res.statusCode).toEqual(400)
    expect(state.updateOneCalls.length).toEqual(0)
  })

  it('rejects loopback base URLs (SSRF guard) with 400', async () => {
    const res = new FakeRes()
    await LLMSettingsController.addProvider(
      {
        session: { userId: 'user-1' },
        body: { ...validBody, baseUrl: 'http://127.0.0.1:8080/v1' },
      },
      res
    )
    expect(res.statusCode).toEqual(400)
    expect(JSON.parse(res.body).error).toEqual('blocked-url')
    expect(state.updateOneCalls.length).toEqual(0)
  })

  it('gates on LLM_ALLOW_USER_SETTINGS=false with 403', async () => {
    process.env.LLM_ALLOW_USER_SETTINGS = 'false'
    const res = new FakeRes()
    await LLMSettingsController.addProvider(
      { session: { userId: 'user-1' }, body: { ...validBody } },
      res
    )
    expect(res.statusCode).toEqual(403)
    expect(state.updateOneCalls.length).toEqual(0)
  })
})
