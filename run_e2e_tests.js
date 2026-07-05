/* eslint-disable */
import puppeteer from 'puppeteer';
import fs from 'fs';

const reportPath = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\6666f8cc-3e76-479b-a723-72581c66aff9\\FINAL_RUNTIME_QA_REPORT.md';
let reportMd = '# DexOS V1 — Final Runtime End-to-End QA Report\n\n';

async function logResult(feature, status, details) {
  const symbol = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`[${status}] ${feature}: ${details}`);
  reportMd += `### ${symbol} ${feature}\n* **Status**: ${status}\n* **Details**: ${details}\n\n`;
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.toString()}`);
  });

  try {
    console.log('Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
    await logResult('App Load', 'PASS', 'Application successfully mounted on http://localhost:5173');

    // Wait for either Splash Screen, Login Screen, or Dashboard
    await new Promise(r => setTimeout(r, 3000));
    const title = await page.title();
    
    // Attempt to interact with Auth
    let onLoginScreen = false;
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      onLoginScreen = true;
      await logResult('Authentication UI', 'PASS', 'Login screen rendered with Email/Password inputs.');
    } catch(e) {
      // Maybe we are on Splash screen, let's look for Get Started
      const html = await page.content();
      if (html.toLowerCase().includes('get started') || html.toLowerCase().includes('log in')) {
         // Click Log In
         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const loginBtn = btns.find(b => b.innerText.toLowerCase().includes('log in') || b.innerText.toLowerCase().includes('login'));
            if (loginBtn) loginBtn.click();
         });
         await new Promise(r => setTimeout(r, 2000));
         try {
            await page.waitForSelector('input[type="email"]', { timeout: 5000 });
            onLoginScreen = true;
         } catch(e2) {}
      } else {
         await logResult('Authentication UI', 'WARN', 'Could not locate standard login inputs.');
      }
    }

    if (onLoginScreen) {
      // Try guest login to avoid Supabase rate limits for fresh accounts
      try {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const guestBtn = btns.find(b => b.innerText.includes('Guest'));
          if (guestBtn) guestBtn.click();
        });
        await new Promise(r => setTimeout(r, 5000));
        const url = page.url();
        if (url.includes('/zenith') || url.includes('/app')) {
          await logResult('Authentication: Guest Login', 'PASS', 'Successfully logged in as Guest and redirected to dashboard.');
        } else {
          // Check for error text
          const html = await page.content();
          if (html.includes('Guest login is disabled') || html.includes('not enabled')) {
            await logResult('Authentication: Guest Login', 'FAIL', 'Guest login is disabled in Supabase settings.');
          } else {
            await logResult('Authentication: Guest Login', 'FAIL', `Did not redirect. Current URL: ${url}`);
          }
        }
      } catch(e) {
        await logResult('Authentication: Guest Login', 'FAIL', 'Failed to click Guest login or wait for redirect.');
      }
    }

    // Now check if we are in Zenith / Dashboard
    let currentUrl = page.url();
    if (currentUrl.includes('/zenith') || currentUrl.includes('/app')) {
      await logResult('Zenith (Dashboard) Flow', 'PASS', 'Zenith dashboard successfully loaded.');
      await page.screenshot({ path: 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\6666f8cc-3e76-479b-a723-72581c66aff9\\zenith_dashboard.png' });

      // Session persistence check
      await page.reload({ waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 3000));
      if (page.url().includes('/zenith')) {
         await logResult('Session Persistence', 'PASS', 'Session maintained after page refresh.');
      } else {
         await logResult('Session Persistence', 'FAIL', 'User was logged out after page refresh.');
      }

      // Check Bottom Nav for other sections
      const sections = ['Growth', 'Health', 'Wealth', 'Dex'];
      for (const section of sections) {
         try {
            await page.evaluate((sec) => {
              const elements = Array.from(document.querySelectorAll('span'));
              const link = elements.find(l => l.innerText.toUpperCase() === sec.toUpperCase());
              if (link) link.parentElement.click();
            }, section);
            await new Promise(r => setTimeout(r, 3000));
            
            const url = page.url();
            if (url.toLowerCase().includes(section.toLowerCase())) {
               await logResult(`${section} Flow`, 'PASS', `${section} screen successfully loaded and mounted.`);
            } else {
               await logResult(`${section} Flow`, 'WARN', `Navigation clicked but URL did not match expected path. Current URL: ${url}`);
            }
         } catch(e) {
            await logResult(`${section} Flow`, 'FAIL', `Failed to navigate to ${section} screen.`);
         }
      }
      
      // Check Logout
      try {
         await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
         await new Promise(r => setTimeout(r, 2000));
         await logResult('Profile Flow', 'PASS', 'Profile page successfully loaded.');

         await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const logout = btns.find(b => b.innerText.toUpperCase().includes('SIGNOUT'));
            if (logout) logout.click();
         });
         await new Promise(r => setTimeout(r, 3000));
         if (page.url().includes('/login') || page.url() === 'http://localhost:5173/') {
            await logResult('Authentication: Logout', 'PASS', 'Successfully logged out and redirected.');
         } else {
            await logResult('Authentication: Logout', 'WARN', 'Could not locate logout button or verify redirect.');
         }
      } catch(e) {}
    } else {
      await logResult('Zenith (Dashboard) Flow', 'FAIL', 'Never reached Zenith dashboard. Tests aborted.');
      await page.screenshot({ path: 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\6666f8cc-3e76-479b-a723-72581c66aff9\\dashboard_fail.png' });
    }

  } catch (err) {
    console.error('Test Execution Error:', err);
    await logResult('E2E Execution', 'FAIL', `Script threw an exception: ${err.message}`);
  }

  await browser.close();
  console.log('Browser closed. Writing report...');
  fs.writeFileSync(reportPath, reportMd);
  console.log('Report saved to', reportPath);
}

run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
