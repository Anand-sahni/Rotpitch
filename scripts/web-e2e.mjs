/**
 * Headless browser test of the RotPitch happy flow against the local web app.
 * Logs in as a pre-confirmed user, uploads a pitch video, picks a background,
 * generates, and waits for the render to finish — exercising the real browser
 * path (Supabase Storage upload under RLS, bearer fetch to the API, polling,
 * download link).
 *
 *   node scripts/web-e2e.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const EMAIL = readFileSync('/tmp/rp_web_email', 'utf8').trim();
const PASS = readFileSync('/tmp/rp_web_pass', 'utf8').trim();
const PITCH = '/tmp/product.mp4';
const SHOTS = '/tmp';

const log = (...a) => console.log('[e2e]', ...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();

page.on('console', (m) => {
  if (m.type() === 'error') console.log('  [browser-error]', m.text());
});
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

try {
  // 1. Log in
  log('login as', EMAIL);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 30000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app', { timeout: 30000 });
  log('logged in, on', page.url());

  // 2. Create screen
  await page.goto(`${BASE}/app/create`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 30000 });
  await page.setInputFiles('input[type="file"]', PITCH);
  log('uploaded pitch file to the form');

  // 3. Pick the first background (free-tier: Minecraft Parkour)
  await page.getByRole('button', { name: /Minecraft Parkour/i }).click();
  await page.screenshot({ path: `${SHOTS}/e2e-create.png` });
  log('picked background; screenshot e2e-create.png');

  // 4. Generate
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  log('clicked Generate — uploading + queuing…');
  await page.waitForURL('**/app', { timeout: 30000 });
  log('redirected to library');

  // 5. Wait for the render to finish (card flips to "Done")
  await page.getByText('Done', { exact: true }).first().waitFor({ timeout: 60000 });
  log('a video card shows "Done"');
  await page.screenshot({ path: `${SHOTS}/e2e-done.png`, fullPage: true });

  // 6. Verify the download link points at the outputs bucket
  const href = await page.locator('a[download]').first().getAttribute('href');
  log('download href:', href);
  if (!href || !href.includes('/outputs/')) throw new Error('download link missing or not an outputs URL');

  log('PASS ✅ — full web happy flow works (login → upload → generate → done → download)');
} catch (err) {
  await page.screenshot({ path: `${SHOTS}/e2e-fail.png`, fullPage: true }).catch(() => {});
  console.error('[e2e] FAIL ❌', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
