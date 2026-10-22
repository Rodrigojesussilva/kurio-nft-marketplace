import { expect, test } from '@playwright/test'

const screenshotOptions = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const }

test('home visual baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Crystal Ape #999', { exact: true })).toBeVisible()
  await expect(page).toHaveScreenshot('home.png', screenshotOptions)
})

test('NFT detail visual baseline', async ({ page }) => {
  await page.goto('/mercado/042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 })).toBeVisible()
  await expect(page).toHaveScreenshot('detail.png', screenshotOptions)
})

test('cart visual baseline', async ({ page }) => {
  const quoteResponse = page.waitForResponse((response) => response.url().endsWith('/api/quote'))
  await page.goto('/carrinho')
  await expect(page.getByText('Resumo da carteira')).toBeVisible()
  await quoteResponse
  await expect(page).toHaveScreenshot('cart.png', screenshotOptions)
})

test('payment visual baseline', async ({ page }) => {
  await page.goto('/login?returnTo=%2Fpagamento')
  await page.getByLabel('E-mail').fill('ana@kurio.test')
  await page.getByLabel('Senha').fill('kurio123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/pagamento$/)
  const quoteResponse = page.waitForResponse((response) => response.url().endsWith('/api/quote'))
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible()
  await quoteResponse
  await expect(page).toHaveScreenshot('payment.png', screenshotOptions)
})
