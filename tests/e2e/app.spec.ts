import { expect, test } from '@playwright/test'

test.describe('public site', () => {
  test('landing page is server-rendered, Persian, RTL, and describes the product', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(
      page.getByRole('heading', { level: 1, name: /هر درخواست، یک مسیر روشن/ }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'ورود' }).first()).toBeVisible()
    const title = await page.title()
    expect(title).toContain('تیکت‌یار')
  })

  test('unauthenticated dashboard access redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

test('a new user can register, sign in, and create a ticket', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  const password = 'E2ePassword123'

  await page.goto('/register')
  // Wait for Nuxt hydration; filling during hydration lets Vue reset the form.
  await page.waitForLoadState('networkidle')
  await page.getByLabel('نام نمایشی').fill('کاربر آزمون خودکار')
  await page.getByLabel('ایمیل').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#confirm').fill(password)
  await page.getByText('قوانین استفاده و سیاست حریم خصوصی را می‌پذیرم.').click()
  await page.getByRole('button', { name: 'ساخت حساب' }).click()

  await expect(page.getByText('درخواست ثبت شد')).toBeVisible()
  await page.getByRole('link', { name: 'رفتن به صفحه ورود' }).click()

  await page.getByLabel('ایمیل').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'ورود', exact: true }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('سلام')

  await page.getByRole('link', { name: 'ثبت تیکت جدید' }).first().click()
  await expect(page).toHaveURL(/\/tickets\/new/)

  await page.getByLabel('عنوان').fill('مشکل آزمون خودکار مرورگر')
  await page.getByLabel('دسته‌بندی').click()
  await page.getByRole('option', { name: 'مشکل فنی' }).click()
  await page
    .getByLabel('توضیحات')
    .fill('این توضیحات برای آزمون ثبت تیکت از طریق مرورگر نوشته شده و بیش از بیست کاراکتر است.')
  await page.getByRole('button', { name: 'ثبت تیکت', exact: true }).click()

  await expect(page).toHaveURL(/\/tickets\/\d+/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('مشکل آزمون خودکار مرورگر')
  await expect(page.getByText('گفتگو')).toBeVisible()
})
