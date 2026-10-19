import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';

const supabaseUrl = 'https://xgowpznkqbsngdiuodmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

async function run() {
  console.log('Authenticating session via Supabase...');
  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authErr } = await sb.auth.signInAnonymously();
  if (authErr || !authData?.session) {
    console.error('Failed to authenticate:', authErr);
    process.exit(1);
  }
  console.log('Authenticated user:', authData.user.id);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Setting auth session in browser localStorage...');
  await page.goto('http://localhost:5173/welcome', { waitUntil: 'domcontentloaded' });
  await page.evaluate((session) => {
    localStorage.setItem('zyrbit_onboarded', 'true');
    localStorage.setItem('sb-xgowpznkqbsngdiuodmj-auth-token', JSON.stringify(session));
  }, authData.session);

  console.log('Navigating to /food...');
  await page.goto('http://localhost:5173/food', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  // 1. Capture 390px Mobile View
  console.log('Capturing Food Tab (390px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_390.png') });

  // 2. Capture 320px Small Mobile View
  console.log('Capturing Food Tab (320px)...');
  await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_320.png') });

  // 3. Capture 360px Android View
  console.log('Capturing Food Tab (360px)...');
  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_360.png') });

  // 4. Capture 430px Large Mobile View (iPhone Pro Max)
  console.log('Capturing Food Tab (430px)...');
  await page.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_430.png') });

  // 5. Capture Desktop View (1280px)
  console.log('Capturing Food Tab (Desktop 1280px)...');
  await page.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_desktop.png') });

  // Reset to 390px for modal flows
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 400));

  // 6. Test Composer Flow: Type food and click Analyze
  console.log('Testing Composer Flow...');
  const inputSelector = '#natural-food-input';
  await page.waitForSelector(inputSelector);
  await page.click(inputSelector);
  await page.type(inputSelector, '80g oats + 200ml milk + 5 dates');
  await new Promise(r => setTimeout(r, 400));

  const analyzeBtnSelector = '#analyze-meal-btn';
  await page.click(analyzeBtnSelector);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_composer_preview.png') });

  // Confirm or cancel meal preview
  const cancelBtn = await page.$('button[id="confirm-log-meal-btn"]');
  if (cancelBtn) {
    console.log('Confirming logged meal...');
    await cancelBtn.click();
    await new Promise(r => setTimeout(r, 1500));
  }

  // 7. Test FoodPicker Modal & Search
  console.log('Opening FoodPicker modal...');
  const addManuallyBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.innerText.includes('Add manually') || b.innerText.includes('+ LOG MEAL'));
  });
  if (addManuallyBtn) {
    await addManuallyBtn.click();
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_picker_recent.png') });

    // Type query in search
    const searchInputs = await page.$$('input[type="text"], input[placeholder*="Search"]');
    if (searchInputs.length > 0) {
      await searchInputs[0].type('oats');
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_picker_search.png') });

      // Click first search result to see portions
      const firstItem = await page.$('div[style*="cursor: pointer"]');
      if (firstItem) {
        await firstItem.click();
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_picker_portions.png') });
      }
    }
  }

  // Close Picker if open
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 600));

  // 8. Open Goal Settings Modal
  console.log('Opening Targets / Goal Settings Modal...');
  const targetsBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.innerText.includes('Targets:'));
  });
  if (targetsBtn) {
    await targetsBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_goal_settings.png') });
  }

  await browser.close();
  console.log('All screenshots captured successfully in artifact directory!');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
