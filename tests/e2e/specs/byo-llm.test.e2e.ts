/**
 * byo-llm — bring-your-own provider round-trip (owner regression queue):
 *  save → 201 + masked (key never echoed, `hasKey` true) → persists in list
 *  → `check` vs unreachable endpoint fails GRACEFULLY (no 5xx) → delete.
 * One journey; dummy credentials only (owner rule).
 *
 * Notes (verified against the live stack):
 *  - loopback base URLs are REFUSED at save time by the SSRF gate
 *    (`blocked-url`) — that is correct behavior; we use a non-loopback
 *    unreachable domain instead, which lets save succeed and proves the
 *    graceful `check` path.
 *  - POSTs need the X-CSRF-TOKEN (csurf) — authFetch handles it.
 */
import { test, expect } from '@playwright/test'
import { USER } from '../fixtures/credentials'
import { RUN_ID } from '../helpers/ctx'
import { authFetch, loginRobust } from '../helpers/auth'

const NAME = `e2e-check-${RUN_ID}`
const DUMMY_KEY = 'sk-e2e-dummy-key-0000' // NOT a real key
const UNREACHABLE = 'https://e2e-unreachable.invalid/v1' // DNS-fails → graceful

test('BYO provider lifecycle (save/list/check-graceful/delete)', async ({ page, context }) => {
  await loginRobust(page, USER.email, USER.password)
  await page.waitForTimeout(500)

  const list0 = await authFetch(context, page, 'GET', '/user/llm-providers')
  expect(list0.status()).toBe(200)

  // save
  const save = await authFetch(context, page, 'POST', '/user/llm-providers', {
    name: NAME,
    providerType: 'openaiCompatible',
    baseUrl: UNREACHABLE,
    apiKey: DUMMY_KEY,
    models: ['e2e-model-1'],
    completionModel: 'e2e-model-1',
  })
  expect(save.status(), await save.text().catch(() => '')).toBe(201)
  const saved = await save.json()
  expect(saved.ok).toBe(true)
  expect(saved.provider.hasKey).toBe(true)
  expect(saved.provider.apiKey).toBeUndefined()
  expect(await save.text()).not.toContain(DUMMY_KEY)
  const rowId = saved.provider.id
  expect(rowId).toBeTruthy()

  // persists
  const list1 = await (await authFetch(context, page, 'GET', '/user/llm-providers')).json()
  expect(list1.providers.find((p: any) => p.id === rowId)?.name).toBe(NAME)

  // graceful check (unreachable endpoint): 2xx/4xx JSON, never 5xx
  const check = await authFetch(context, page, 'POST', '/user/llm-providers/check', {
    providerId: rowId,
  })
  expect(check.status(), JSON.stringify(await check.json().catch(() => ({})))).toBeLessThan(500)

  // delete (route is POST /user/llm-providers/:id/delete — LLMRouter)
  const del = await authFetch(context, page, 'POST', `/user/llm-providers/${rowId}/delete`, {})
  expect(del.status(), await del.text().catch(() => '')).toBe(200)
  const list2 = await (await authFetch(context, page, 'GET', '/user/llm-providers')).json()
  expect(list2.providers.find((p: any) => p.id === rowId)).toBeUndefined()
})
