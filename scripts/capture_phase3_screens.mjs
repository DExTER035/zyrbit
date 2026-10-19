import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

  console.log('Navigating to /zenith...');
  await page.goto('http://localhost:5173/zenith', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));


  // 1. Capture Home / Zenith (390px)
  console.log('Capturing Screen 7: Home...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_screen7_home_390.png') });

  // Responsive Home captures: 320, 360, 430, 1440
  console.log('Capturing responsive Home viewports...');
  await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_home_320.png') });

  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_home_360.png') });

  await page.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_home_430.png') });

  await page.setViewport({ width: 1440, height: 900, isMobile: false });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_home_1440_desktop.png') });

  // Reset to 390px for remaining modules
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // 2. Capture Growth
  console.log('Capturing Screen 8: Growth...');
  await page.goto('http://localhost:5173/growth', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_screen8_growth_390.png') });

  // 3. Capture Health
  console.log('Capturing Screen 9: Health...');
  await page.goto('http://localhost:5173/health', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_screen9_health_390.png') });

  // 4. Capture Wealth
  console.log('Capturing Screen 10: Wealth...');
  await page.goto('http://localhost:5173/wealth', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_screen10_wealth_390.png') });

  // 5. Capture Dex
  console.log('Capturing Screen 11: Dex...');
  // Open Dex by navigating to /zenith and clicking Dex tab
  await page.goto('http://localhost:5173/zenith', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    // Click bottom nav Dex button
    const buttons = Array.from(document.querySelectorAll('button'));
    const dexBtn = buttons.find(b => b.textContent.includes('Dex') || b.getAttribute('aria-label') === 'Dex');
    if (dexBtn) dexBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_screen11_dex_390.png') });

  // 6. Capture Profile
  console.log('Capturing Screen 12: Profile...');
  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_screen12_profile_390.png') });

  await browser.close();
  console.log('All Phase 3 captures completed successfully!');
}

run().catch(err => {
  console.error('Error running capture script:', err);
  process.exit(1);
});
