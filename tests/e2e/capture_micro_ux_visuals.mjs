import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.resolve('scratch/browser_qa/micro_ux');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function closeModal(page) {
  const closeBtn = page.locator('button:has(svg.lucide-x), div[style*="z-index"] button:has(svg)').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  } else {
    // Click backdrop top-left corner
    await page.mouse.click(20, 20);
  }
  await page.waitForTimeout(400);
}

async function captureMicroUx() {
  console.log('Starting Visual QA Capture for Micro-UX Polish Pass...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // mobile portrait
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    localStorage.setItem('zyrbit_launched', 'true');
    localStorage.setItem('zyrbit_welcome_dismissed', 'true');
  });

  const page = await context.newPage();

  // Initial load and guest auth
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const guestBtn = await page.$('button[title*="Guest"], button:has-text("Guest"), button:has-text("Try as Guest"), button:has-text("Skip")');
  if (guestBtn) {
    await guestBtn.click();
    await page.waitForTimeout(2000);
  }

  // Ensure Zenith or main shell is loaded
  await page.goto(`${BASE_URL}/zenith`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1:has-text("Zenith")', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // 1. Wealth & Modals
  console.log('Navigating to Wealth (/wealth)...');
  await page.goto(`${BASE_URL}/wealth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1.1 Log Income
  console.log('Opening Log Income modal...');
  const incomeBtn = page.locator('button:has-text("Income")').first();
  if (await incomeBtn.isVisible()) {
    await incomeBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '01_log_income_modal.png') });
    console.log('✓ Captured 01_log_income_modal.png');
    await closeModal(page);
  }

  // 1.2 Log Expense
  console.log('Opening Log Expense modal...');
  const expenseBtn = page.locator('button:has-text("Expense")').first();
  if (await expenseBtn.isVisible()) {
    await expenseBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '02_log_expense_modal.png') });
    console.log('✓ Captured 02_log_expense_modal.png');
    await closeModal(page);
  }

  // 1.3 Commitment Modal
  console.log('Opening Commitment modal...');
  const commitBtn = page.locator('button:has-text("Bills")').first();
  if (await commitBtn.isVisible()) {
    await commitBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '03_commitment_modal.png') });
    console.log('✓ Captured 03_commitment_modal.png');
    await closeModal(page);
  }

  // 1.4 Promise Modal
  console.log('Opening Promise modal...');
  const promiseBtn = page.locator('button:has-text("Promises")').first();
  if (await promiseBtn.isVisible()) {
    await promiseBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '04_promise_modal.png') });
    console.log('✓ Captured 04_promise_modal.png');
    await closeModal(page);
  }

  // 2. Health
  console.log('Navigating to Health (/health)...');
  await page.goto(`${BASE_URL}/health`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '05_health_top.png') });
  console.log('✓ Captured 05_health_top.png');

  // Scroll down to view Today's Meals and Capture
  await page.evaluate(() => window.scrollBy(0, 360));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, '07_health_lower_section.png') });
  console.log('✓ Captured 07_health_lower_section.png');

  // 2.1 Meal Detail Sheet
  console.log('Opening Meal Detail Sheet...');
  const mealRow = page.locator('div[style*="cursor: pointer"]:has-text("Poha"), div[style*="cursor: pointer"]:has-text("kcal")').first();
  if (await mealRow.isVisible()) {
    await mealRow.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '06_health_meal_detail.png') });
    console.log('✓ Captured 06_health_meal_detail.png');
    await closeModal(page);
  }

  // 3. Growth & Habits
  console.log('Navigating to Growth (/growth)...');
  await page.goto(`${BASE_URL}/growth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Switch to Habits tab
  const habitsTab = page.locator('button:has-text("Habits")').first();
  if (await habitsTab.isVisible()) {
    await habitsTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, '08_growth_habits.png') });
    console.log('✓ Captured 08_growth_habits.png');

    // 3.1 New Habit Sheet
    console.log('Opening New Habit modal...');
    const newHabitBtn = page.locator('button:has-text("New Habit")').first();
    if (await newHabitBtn.isVisible()) {
      await newHabitBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT_DIR, '09_new_habit_modal.png') });
      console.log('✓ Captured 09_new_habit_modal.png');
      await closeModal(page);
    }

    // 3.2 Habit Detail Sheet
    const habitRow = page.locator('div[style*="cursor: pointer"]:has-text("streak"), div[style*="cursor: pointer"]:has-text("day")').first();
    if (await habitRow.isVisible()) {
      await habitRow.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT_DIR, '10_habit_detail_sheet.png') });
      console.log('✓ Captured 10_habit_detail_sheet.png');
    }
  }

  await browser.close();
  console.log('All screenshots captured in:', OUT_DIR);
}

captureMicroUx().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
