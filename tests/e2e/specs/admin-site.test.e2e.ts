/**
 * admin-site — the golden /admin/site console (R9/R11 owner contracts):
 *  (1) golden surface + consolidated tabs (NO LLM tab — R9-9)
 *  (2) pandoc toggle persists and gates New-Project import items (Word) —
 *      restored after (stack hygiene)
 *  (3) admin sees the LLM instance card on /user/llm-settings (R11-6)
 */
import { test, expect } from '@playwright/test'
import { loginRobust, createBlankProject } from '../helpers/auth'
import { mongoEval } from '../helpers/host'
import { ADMIN } from '../fixtures/credentials'

async function go(page: import('playwright').Page) {
  await loginRobust(page, ADMIN.email, ADMIN.password)
}

test('/admin/site renders golden tabs, no LLM tab (R9-9)', async ({ page }) => {
  await go(page)
  const res = await page.goto('/admin/site')
  expect(res?.status() ?? 200).toBe(200)

  const tabs = page.locator('button, a, [role="tab"], .nav-link')
  for (const label of [
    'Sandboxed compiles',
    'Git integration',
    'GitHub sync',
    'WebDAV',
    'Dropbox',
    'Templates',
    'Misc',
  ]) {
    await expect(tabs.filter({ hasText: label }).first()).toBeVisible({ timeout: 15_000 })
  }
  expect(
    await tabs.filter({ hasText: /^LLM\b/i }).count(),
    'the LLM tab must not be on /admin/site'
  ).toBe(0)
})

test('pandoc toggle persists (site_settings round-trip)', async ({ page }) => {
  // Round-9 design: the pandoc section persists to `site_settings` (id "global")
  // and gates ENABLE_PANDOC_CONVERSIONS via env hydration at RESTART (the panel
  // itself labels these values "(applies after restart)"). The New-Project
  // Word-import item therefore follows the stored flag after a stack restart —
  // verified in the R9 live battery. THIS spec pins the deterministic half:
  // the admin panel toggle + save round-trips the stored `pandoc.enabled`
  // flag and restores the prior state.
  await go(page)
  await page.goto('/admin/site')

  const pandocTab = page.locator('button:has-text("Pandoc")').first()
  await expect(pandocTab).toBeVisible({ timeout: 20_000 })
  await pandocTab.click()
  const saveBtn = page.locator('button:has-text("Save Configuration")').first()
  await expect(saveBtn).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1_500) // panel hydrates from the settings API

  const stored = () =>
    String(
      mongoEval(
        'const d = db.getSiblingDB("sharelatex").site_settings.findOne({_id: "global"}); print(d && d.pandoc ? d.pandoc.enabled : "missing");'
      )
    ).trim()
  const toggle = page.locator('input[type="checkbox"]').first()
  await expect(toggle).toBeVisible({ timeout: 20_000 })

  const prior = await toggle.isChecked()
  // flip, save, VERIFY PERSISTENCE at the source (site_settings collection)
  await toggle.click()
  await saveBtn.click()
  await page.waitForTimeout(2_000)
  const savedState = stored()
  expect(savedState, 'pandoc.enabled must flip in site_settings').toBe(String(!prior))

  // stack hygiene: restore prior state
  await page.waitForTimeout(1_000)
  const t2 = page.locator('input[type="checkbox"]').first()
  if ((await t2.isChecked()) !== prior) {
    await t2.click()
    await saveBtn.click()
    await page.waitForTimeout(2_000)
  }
  expect(stored(), 'prior state restored').toBe(String(prior))
})

test('admin sees the LLM instance card on /user/llm-settings (R11-6)', async ({ page }) => {
  await go(page)
  const res = await page.goto('/user/llm-settings')
  expect(res?.status() ?? 200).toBe(200)
  await expect(page.locator('text=/Instance LLM settings/i').first()).toBeVisible({ timeout: 20_000 })
})
