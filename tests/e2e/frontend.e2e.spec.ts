import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('can go on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000/en')

    await expect(page).toHaveTitle(/East Asia Power/)

    const heading = page.locator('h1').first()

    await expect(heading).toHaveText('Building flexible power systems for volatile grids')
  })

  test('renders scroll story image sequence frames', async ({ page }) => {
    await page.goto('http://localhost:3000/en')

    const story = page.locator('#solutions')
    const canvas = story.locator('canvas.image-sequence-canvas')

    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveAttribute('data-sequence-device', 'desktop')

    await page.waitForFunction(() => {
      const canvasElement = document.querySelector<HTMLCanvasElement>('#solutions canvas.image-sequence-canvas')
      const context = canvasElement?.getContext('2d')

      if (!canvasElement || !context || canvasElement.width === 0 || canvasElement.height === 0) {
        return false
      }

      const samplePoints = [
        [0.18, 0.2],
        [0.5, 0.5],
        [0.82, 0.8],
        [0.25, 0.75],
        [0.75, 0.25],
      ] as const

      return samplePoints.some(([x, y]) => {
        const sample = context.getImageData(
          Math.floor(canvasElement.width * x),
          Math.floor(canvasElement.height * y),
          1,
          1,
        ).data

        return sample[0] + sample[1] + sample[2] > 0
      })
    })

    const firstFrame = Number(await canvas.getAttribute('data-frame-index'))

    await story.scrollIntoViewIfNeeded()
    await page.mouse.wheel(0, 1800)
    await expect.poll(async () => Number(await canvas.getAttribute('data-frame-index'))).toBeGreaterThan(firstFrame)
  })

  test('uses mobile image sequence on small screens', async ({ page }) => {
    await page.setViewportSize({ height: 780, width: 390 })
    await page.goto('http://localhost:3000/zh')

    const canvas = page.locator('#solutions canvas.image-sequence-canvas')

    await expect(page.locator('h1').first()).toHaveText('为波动电网建设灵活电力系统')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveAttribute('data-sequence-device', 'mobile')
  })
})
