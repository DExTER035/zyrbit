import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.resolve('scratch/browser_qa/micro_ux');

async function closeModal(page) {
  const closeBtn = page.locator('button:has(svg.lucide-x), div[style*="z-index"] button:has(svg)').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  } else {
    await page.mouse.click(20, 20);
  }
  await page.waitForTimeout(400);
}

async function captureHabitDetail() {
  console.log('Capturing Habit Detail Sheet with created habit...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    localStorage.setItem('zyrbit_launched', 'true');
    localStorage.setItem('zyrbit_welcome_dismissed', 'true');
  });

  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const guestBtn = await page.$('button[title*="Guest"], button:has-text("Guest"), button:has-text("Try as Guest"), button:has-text("Skip")');
  if (guestBtn) {
    await guestBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.goto(`${BASE_URL}/growth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Switch to Habits tab
  const habitsTab = page.locator('button:has-text("Habits")').first();
  if (await habitsTab.isVisible()) {
    await habitsTab.click();
    await page.waitForTimeout(800);

    // Create a habit via 1-tap preset
    const newHabitBtn = page.locator('button:has-text("New Habit"), button:has-text("Create Habit")').first();
    if (await newHabitBtn.isVisible()) {
      await newHabitBtn.click();
      await page.waitForTimeout(500);

      // Tap preset chip 'Read 20 mins'
      const presetChip = page.locator('button:has-text("Read 20 mins")').first();
      if (await presetChip.isVisible()) {
        await presetChip.click();
        await page.waitForTimeout(300);
      } else {
        await page.locator('input[placeholder*="Habit name"]').fill('Read 20 mins');
      }

      // Click Create Habit
      const submitBtn = page.locator('button:has-text("Create Habit")').last();
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }

    // Now tap on the habit row (not the checkbox) to open detail sheet
    const habitRow = page.locator('div[style*="cursor: pointer"]:has-text("Read 20 mins")').first();
    if (await habitRow.isVisible()) {
      await habitRow.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT_DIR, '10_habit_detail_sheet.png') });
      console.log('✓ Captured 10_habit_detail_sheet.png');
    }
  }

  await browser.close();
}

captureHabitDetail().catch(err => {
  console.error('Error during habit detail capture:', err);
  process.exit(1);
});
