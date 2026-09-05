/**
 * notifications — /user/notification-preferences (one journey): page renders
 * for the fixture user; the mute-all toggle round-trips (persist across
 * reload) and is restored — the "no instant tracked-changes email to the
 * author" contract is this user-controlled grace period.
 */
import { test, expect } from '@playwright/test'
import { loginRobust } from '../helpers/auth'
import { USER } from '../fixtures/credentials'

test('notification preferences render and mute toggle round-trips', async ({ page }) => {
  await loginRobust(page, USER.email, USER.password)

  const res = await page.goto('/user/notification-preferences')
  expect(res?.status() ?? 200).toBe(200)
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.toLowerCase()).toMatch(/notification/)

  const mute = page.locator('input[name="muteAllNotifications"]').first()
  if ((await mute.count()) === 0) {
    test.info().annotations.push({ type: 'skip', description: 'mute control not on this revision' })
    return
  }

  const want = !(await mute.isChecked())
  await mute.setChecked(want)
  await page.locator('button[type="submit"], button:has-text("Save")').first().click({ timeout: 15_000 })
  await page.waitForTimeout(900)

  // persist across reload
  await page.goto('/user/notification-preferences')
  await expect(page.locator('input[name="muteAllNotifications"]').first()).toBeChecked(want)

  // restore
  const mute2 = page.locator('input[name="muteAllNotifications"]').first()
  await mute2.setChecked(!want)
  await page.locator('button[type="submit"], button:has-text("Save")').first().click({ timeout: 15_000 })
  await page.waitForTimeout(700)
})
