import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const screenshots = path.resolve('artifacts/playtest')

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: false })
}

test('NewTone complete local reading and world loop', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`))

  await page.goto('/')
  await expect(page.getByTestId('landing')).toBeVisible()
  await screenshot(page, '01-landing')

  await page.getByLabel('语言 / Language').selectOption('zh-CN')
  await page.getByRole('button', { name: /开始阅读|继续阅读/ }).click()
  await expect(page.getByTestId('reader')).toBeVisible()
  await screenshot(page, '02-reader-immersive')

  await page.getByLabel('阅读设置').click()
  await page.getByText('沉浸视觉').click()
  await screenshot(page, '03-reader-stable')
  await page.getByText('沉浸视觉').click()
  await page.getByLabel('阅读设置').click()

  await page.locator('[data-block-id="ch1-footsteps"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(2300)
  await page.reload()
  await expect(page.getByTestId('landing')).toBeVisible()
  await page.getByRole('button', { name: /继续阅读/ }).click()
  await expect(page.getByTestId('reader')).toBeVisible()
  const restored = await page.locator('[data-block-id="ch1-footsteps"]').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.top < innerHeight && rect.bottom > 0
  })
  expect(restored).toBe(true)
  await page.locator('[data-block-id="ch1-market"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)

  await page.getByLabel('进入 Center').click()
  await expect(page.getByTestId('center-canvas').locator('canvas')).toBeVisible()
  await screenshot(page, '04-center-collapsed')

  await page.getByRole('button', { name: '完全展开' }).click()
  await expect(page.getByRole('button', { name: '收拢世界' })).toBeVisible()
  await screenshot(page, '05-center-expanded')
  await expect(page.getByLabel('地标数量')).toContainText('5 / 5')

  const canvas = page.getByTestId('center-canvas').locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas missing')
  await page.mouse.click(box.x + box.width * 0.31, box.y + box.height * 0.18)
  await expect(page.getByTestId('annotation-surface-station')).toBeVisible()
  await screenshot(page, '06-surface-annotation')
  await page.getByRole('button', { name: '关闭详情' }).click()

  await page.mouse.click(box.x + box.width * 0.49, box.y + box.height * 0.79)
  await expect(page.getByTestId('annotation-inner-gate')).toBeVisible()
  await screenshot(page, '07-inner-annotation')

  await page.setViewportSize({ width: 980, height: 760 })
  await expect(canvas).toBeVisible()
  await screenshot(page, '08-center-resized')

  await page.getByRole('button', { name: '返回正文' }).click()
  await expect(page.getByTestId('reader')).toBeVisible()
  expect(await page.locator('[data-block-id="ch1-footsteps"]').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.top < innerHeight && rect.bottom > 0
  })).toBe(true)
  expect(runtimeErrors).toEqual([])
})
