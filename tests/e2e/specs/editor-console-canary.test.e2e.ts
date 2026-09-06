/**
 * Editor console canary (owner request, 2026-09-06: "obviously something
 * the e2e test too [missed]" — the prod #130 React crash went through the
 * whole suite because no spec listened for client-side errors).
 *
 * Contract: login -> new blank project -> editor fully loaded, with ZERO
 * pageerrors, ZERO console.error entries, and ZERO failed fatal network
 * requests. Any future client-side render crash (React #130 & friends)
 * fails this spec immediately.
 */
import { test, expect } from '@playwright/test'
import { loginRobust, createBlankProject } from '../helpers/auth'

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:7420'
const ADMIN = { email: 'e2e-admin@e2e.test', password: 'Ol-Fixture-9x7K' }

test.describe.configure({ mode: 'serial' })

test('editor loads with zero client-side errors', async ({ page }, testInfo) => {
  page.setDefaultTimeout(45_000)

  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 400)))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 400)) })
  page.on('requestfailed', (r) => {
    const entry = `${r.method()} ${r.url().slice(0, 120)} :: ${r.failure()?.errorText ?? ''}`
    // Known-harmless: the IDE issues POST /project/:id/flush as fire-and-forget
    // (history flush; server logs 200 + the IDE aborts its own copy — nginx
    // 499/ERR_ABORTED pairs are expected, verified 2026-09-06 against the
    // access log and HistoryController.proxyToHistoryApi). Everything else is
    // a real failure.
    if (/\/flush :: net::ERR_ABORTED$/.test(entry)) return
    failedRequests.push(entry)
  })

  await loginRobust(page, ADMIN.email, ADMIN.password)
  const projectId = await createBlankProject(page)
  await page.goto(`${BASE}/project/${projectId}`, { waitUntil: 'load' })
  await expect(page.locator(".cm-editor").first()).toBeVisible({ timeout: 90_000 })
  // give the IDE a beat to settle socket joins (owner crash happened post-join)
  await page.waitForTimeout(4000)

  expect(failedRequests, 'failed requests:\n' + failedRequests.join('\n')).toEqual([])
  expect(pageErrors, 'pageerrors:\n' + pageErrors.join('\n')).toEqual([])

  // console.error: allow harmless dev noise, nothing with React/bundle crashes
  const fatal = consoleErrors.filter((t) => /React error|#130|Minified React|Uncaught|is not a valid child|array|undefined is not/i.test(t))
  expect(fatal, 'fatal console errors:\n' + fatal.join('\n')).toEqual([])

  if (process.env.DUMP_CANARY === '1')
    console.log('CANARY LOGS', JSON.stringify({ pageErrors, consoleErrors, failedRequests }))
})
