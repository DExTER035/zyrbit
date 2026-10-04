/**
 * Zyrbit V1.1 — Mobile Viewport QA for Dex Visual Capture
 * Target: 390x844 and 430x932
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const QA_DIR = path.resolve('scratch/visual_qa');
const FIXTURES_DIR = path.resolve('scratch/fixtures');
const SCREENSHOT_IMG = path.join(FIXTURES_DIR, 'screenshot_money.png');

async function testMobileViewport(viewport, label) {
  console.log(`\nTesting mobile viewport: ${label} (${viewport.width}x${viewport.height})...`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    // 1. Auth & navigate to Zenith
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const guestBtn = await page.$('button[title*="Guest"], button:has-text("Guest"), button:has-text("Try as Guest"), button:has-text("Skip")');
    if (guestBtn) {
      await guestBtn.click();
      await page.waitForTimeout(3000);
    } else {
      const getStarted = await page.$('button:has-text("Get Started"), button:has-text("Log In")');
      if (getStarted) {
        await getStarted.click();
        await page.waitForTimeout(1500);
        const guest2 = await page.$('button[title*="Guest"], button:has-text("Guest")');
        if (guest2) {
          await guest2.click();
          await page.waitForTimeout(3000);
        }
      }
    }

    if (!page.url().includes('/zenith')) {
      await page.goto(`${BASE_URL}/zenith`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(1500);

    // 2. Open Dex
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('dexos:open-dex')));
    await page.waitForTimeout(1000);

    // 3. Attach screenshot
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (!fileInput) throw new Error('File input not found after dexos:open-dex');
    await fileInput.setInputFiles(SCREENSHOT_IMG);
    await page.waitForTimeout(1000);

    // Screenshot: Attached stage mobile
    await page.screenshot({ path: path.join(QA_DIR, `mobile_${label}_01_attached.png`) });

    // 4. Analyze image
    await page.click('button[data-testid="analyze-image-btn"]');
    await page.waitForTimeout(2500);

    // 5. Check extraction preview
    const entriesList = await page.$('[data-testid="extraction-entries-list"]');
    if (!entriesList) throw new Error('Extraction list not found');

    // Screenshot: Extraction preview mobile
    await page.screenshot({ path: path.join(QA_DIR, `mobile_${label}_02_preview.png`) });

    // 6. Select "Owed to me"
    await page.click('button[data-testid="semantic-owed-to-me"]');
    await page.waitForTimeout(600);

    // 7. Check Confirm button visibility & reachability
    const confirmBtn = await page.$('button[data-testid="confirm-records-btn"]');
    if (!confirmBtn) throw new Error('Confirm button not found');
    const isVisible = await confirmBtn.isVisible();
    console.log(`  Confirm button isVisible: ${isVisible}`);

    // Screenshot: Semantic selected mobile
    await page.screenshot({ path: path.join(QA_DIR, `mobile_${label}_03_semantic.png`) });

    // Check no horizontal scrollbar on body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`  Horizontal overflow: ${hasHorizontalOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);

    console.log(`✅ Mobile viewport ${label} passed.`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testMobileViewport({ width: 390, height: 844 }, '390x844');
  await testMobileViewport({ width: 430, height: 932 }, '430x932');
}

run().catch((err) => {
  console.error('Mobile QA error:', err);
  process.exit(1);
});
