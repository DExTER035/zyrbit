import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';

async function runWealthRedesignWalkthrough() {
  console.log('=== WEALTH REDESIGN E2E WALKTHROUGH & SCREENSHOT CAPTURE ===\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  try {
    console.log('1. Navigating to http://localhost:5173/welcome ...');
    await page.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Clear any previous session and sign in as guest
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    console.log('2. Clicking "Continue as Guest"...');
    await page.waitForSelector('button', { timeout: 8000 });
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(el => el.textContent.includes('Guest'));
      if (b) b.click();
    });

    await new Promise(r => setTimeout(r, 2500));

    // Skip onboarding if present
    if (page.url().includes('onboarding') || page.url().includes('goal')) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const skip = btns.find(b => /skip|continue|get started/i.test(b.textContent));
        if (skip) skip.click();
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Navigate to /wealth
    console.log('3. Navigating to http://localhost:5173/wealth ...');
    await page.goto('http://localhost:5173/wealth', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    // Initialize mock data in localStorage / state if empty for maximum visual fidelity matching references
    await page.evaluate(() => {
      // Set cash balance if unconfigured
      const rawUser = localStorage.getItem('supabase.auth.token');
      // If no cash calibrated, calibrate ₹10,000 cash balance
      const cashKey = 'zyrbit_cash_balance';
      if (!localStorage.getItem(cashKey)) {
        localStorage.setItem(cashKey, '10000');
      }
    });

    // ── Screen 1: Wealth Overview / Home Tab ──
    console.log('4. Capturing Screen 1: Wealth Overview (Home Tab)...');
    const ss1Path = path.join(ARTIFACT_DIR, 'wealth_tab1_overview_redesign.png');
    await page.screenshot({ path: ss1Path, fullPage: false });
    console.log('Saved Screen 1 to:', ss1Path);

    // ── Screen 2: Activity Tab ──
    console.log('5. Switching to Activity Tab...');
    const switchedActivity = await page.evaluate(() => {
      // Find Activity tab button in segmented bar or bottom nav
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const activityBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'activity');
      if (activityBtn) {
        activityBtn.click();
        return true;
      }
      return false;
    });
    console.log('Switched to Activity:', switchedActivity);
    await new Promise(r => setTimeout(r, 1500));

    const ss2Path = path.join(ARTIFACT_DIR, 'wealth_tab2_activity_redesign.png');
    await page.screenshot({ path: ss2Path, fullPage: false });
    console.log('Saved Screen 2 to:', ss2Path);

    // ── Screen 3: Plan Tab ──
    console.log('6. Switching to Plan Tab...');
    const switchedPlan = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const planBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'plan');
      if (planBtn) {
        planBtn.click();
        return true;
      }
      return false;
    });
    console.log('Switched to Plan:', switchedPlan);
    await new Promise(r => setTimeout(r, 1500));

    const ss3Path = path.join(ARTIFACT_DIR, 'wealth_tab3_plan_redesign.png');
    await page.screenshot({ path: ss3Path, fullPage: false });
    console.log('Saved Screen 3 to:', ss3Path);

    // ── Screen 4: Assets Tab ──
    console.log('7. Switching to Assets Tab...');
    const switchedAssets = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const assetsBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'assets');
      if (assetsBtn) {
        assetsBtn.click();
        return true;
      }
      return false;
    });
    console.log('Switched to Assets:', switchedAssets);
    await new Promise(r => setTimeout(r, 1500));

    const ss4Path = path.join(ARTIFACT_DIR, 'wealth_tab4_assets_redesign.png');
    await page.screenshot({ path: ss4Path, fullPage: false });
    console.log('Saved Screen 4 to:', ss4Path);

    console.log('\n✓ All 4 Wealth screens successfully captured!');
  } catch (err) {
    console.error('Error during walkthrough:', err);
  } finally {
    await browser.close();
  }
}

runWealthRedesignWalkthrough();
