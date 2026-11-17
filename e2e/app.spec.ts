import { expect, test } from '@playwright/test';

const preview = (page: import('@playwright/test').Page) =>
  page.frameLocator('iframe[title="Isolated HTML and CSS preview"]');

test('loads the workspace and inspects a selected element', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('');
  await expect(page.getByRole('heading', { name: 'Inspect the cascade.' })).toBeVisible();
  await preview(page).locator('#feature').click();
  await expect(page.locator('.selected-element code')).toContainText('article#feature.card');

  await page.getByRole('button', { name: 'Matched rules' }).click();
  await expect(page.locator('.matched-rule').first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('blocks untrusted inline event handlers while keeping inspection active', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: /index\.html/ }).click();
  await page.getByRole('textbox', { name: 'HTML source editor' }).fill(
    `<button id="probe" onclick="document.body.dataset.pwned='yes'">Probe</button>`
  );

  const frame = preview(page);
  await frame.locator('#probe').click();
  await expect(page.locator('.selected-element')).toBeVisible();
  expect(await frame.locator('body').getAttribute('data-pwned')).toBeNull();
});

test('supports viewport and theme controls', async ({ page }) => {
  await page.goto('');
  const mobile = page.getByRole('button', { name: 'Mobile viewport' });
  await mobile.click();
  await expect(mobile).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('.app')).toHaveClass(/light/);
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
});

test('reports malformed CSS and exports a JSON diagnostic report', async ({ page }) => {
  await page.goto('');
  await page.getByRole('textbox', { name: 'CSS source editor' }).fill('.broken { color: red');
  await expect(page.locator('.parse-error')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON diagnostic report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('cascade-lens-report.json');
});

test('rejects duplicate import types without replacing the current workspace', async ({ page }) => {
  await page.goto('');
  const cssEditor = page.getByRole('textbox', { name: 'CSS source editor' });
  const originalCss = await cssEditor.inputValue();
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'base.css', mimeType: 'text/css', buffer: Buffer.from('.base { color: red; }') },
    { name: 'theme.css', mimeType: 'text/css', buffer: Buffer.from('.theme { color: blue; }') }
  ]);
  await expect(page.getByRole('alert')).toHaveText('Select no more than one CSS file at a time.');
  await expect(cssEditor).toHaveValue(originalCss);
});

test('imports one HTML file and one CSS file together', async ({ page }) => {
  await page.goto('');
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'index.html', mimeType: 'text/html', buffer: Buffer.from('<main><h1>Imported document</h1></main>') },
    { name: 'styles.css', mimeType: 'text/css', buffer: Buffer.from('h1 { color: rebeccapurple; }') }
  ]);
  await expect(page.getByRole('status')).toHaveText('Imported 2 files locally.');
  await expect(page.getByRole('textbox', { name: 'CSS source editor' })).toHaveValue('h1 { color: rebeccapurple; }');
  await page.getByRole('button', { name: /index\.html/ }).click();
  await expect(page.getByRole('textbox', { name: 'HTML source editor' })).toHaveValue('<main><h1>Imported document</h1></main>');
});
