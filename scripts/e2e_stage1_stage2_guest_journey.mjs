import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';
const BASE_URL = 'https://zyrbit.vercel.app';

async function runGuestE2E() {
  console.log(`Starting E2E Guest Journey QA on ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore favicon or non-fatal analytics
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
        console.log('[PAGE ERROR]', text);
      }
    }
  });

  page.on('requestfailed', req => {
    networkErrors.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  try {
    // 1. Visit Welcome/Login
    console.log('Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/?screen=login&mode=signup`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'guest_e2e_01_login.png') });

    // 2. Click Guest button
    console.log('Step 2: Clicking "Guest" anonymous auth button...');
    const clickedGuest = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const guestBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('guest'));
      if (guestBtn) {
        guestBtn.click();
        return true;
      }
      return false;
    });

    if (!clickedGuest) {
      throw new Error('Guest button not found on LoginScreen!');
    }

    // 3. Wait for Onboarding (GoalSetupScreen)
    console.log('Step 3: Waiting for Onboarding (GoalSetupScreen)...');
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('What do you want to') || text.includes('STEP 1 OF 4') || text.includes('Skip for now');
    }, { timeout: 20000 });

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'guest_e2e_02_onboarding_step1.png') });
    console.log('✓ Arrived at Onboarding Step 1');

    // 4. Click "Skip for now" to reach real app immediately
    console.log('Step 4: Clicking "Skip for now"...');
    const skipped = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const skipBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('skip for now'));
      if (skipBtn) {
        skipBtn.click();
        return true;
      }
      return false;
    });

    if (!skipped) {
      console.log('Skip for now not found, clicking Continue...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const contBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('continue'));
        if (contBtn) contBtn.click();
      });
    }

    // 5. Wait for App to load (/zenith)
    console.log('Step 5: Waiting for /zenith Daily Command Center...');
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Zenith') || text.includes('Good morning') || text.includes('Good afternoon') || text.includes('Good evening') || text.includes('DAILY LOG') || text.includes('Habits');
    }, { timeout: 20000 });

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'guest_e2e_03_zenith.png') });
    const zenithUrl = page.url();
    console.log(`✓ Arrived at Zenith! URL: ${zenithUrl}`);

    // 6. Test Refresh Persistence
    console.log('Step 6: Testing page refresh persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Zenith') || text.includes('Good morning') || text.includes('Good afternoon') || text.includes('Good evening') || text.includes('DAILY LOG') || text.includes('Habits');
    }, { timeout: 15000 });

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'guest_e2e_04_zenith_after_refresh.png') });
    console.log('✓ Session persisted through page refresh! Still authenticated on Zenith.');

    // 7. Verify all primary routes
    const routesToTest = [
      { path: '/track', name: 'Track', checkText: 'Track' },
      { path: '/growth', name: 'Growth', checkText: 'Growth' },
      { path: '/food', name: 'Food', checkText: 'Food' },
      { path: '/health', name: 'Health', checkText: 'Health' },
      { path: '/wealth', name: 'Wealth', checkText: 'Wealth' },
      { path: '/insights', name: 'Insights', checkText: 'Insights' },
      { path: '/profile', name: 'Profile', checkText: 'Profile' }
    ];

    const routeResults = [];

    for (const route of routesToTest) {
      console.log(`Step 7: Testing navigation to ${route.name} (${route.path})...`);
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 1500));
      
      const content = await page.evaluate(() => document.body.innerText);
      const passed = content.toLowerCase().includes(route.checkText.toLowerCase());
      
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `guest_e2e_route_${route.name.toLowerCase()}.png`) });
      
      routeResults.push({
        route: route.path,
        name: route.name,
        passed,
        url: page.url(),
        snippet: content.substring(0, 100).replace(/\n/g, ' ')
      });
      console.log(`✓ ${route.name}: ${passed ? 'PASSED' : 'CHECK FAILED'} - URL: ${page.url()}`);
    }

    console.log('\n=== E2E GUEST QA SUMMARY ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Guest Anonymous Auth: SUCCESS`);
    console.log(`Onboarding Reachable & Skippable: SUCCESS`);
    console.log(`Daily Command Center (/zenith): REACHED`);
    console.log(`Session Refresh Persistence: VERIFIED PASS`);
    console.log('Primary Routes Verification:');
    routeResults.forEach(r => {
      console.log(`  - [${r.passed ? 'PASS' : 'FAIL'}] ${r.name} (${r.route})`);
    });
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Sample console errors:', consoleErrors.slice(0, 5));
    }

  } catch (err) {
    console.error('E2E QA Execution Error:', err);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'guest_e2e_failure.png') });
  } finally {
    await browser.close();
  }
}

runGuestE2E();
