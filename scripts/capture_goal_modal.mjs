import puppeteer from 'puppeteer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';
const supabaseUrl = 'https://xgowpznkqbsngdiuodmj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA';

async function run() {
  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: authData } = await sb.auth.signInAnonymously();

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/welcome', { waitUntil: 'domcontentloaded' });
  await page.evaluate((session) => {
    localStorage.setItem('zyrbit_onboarded', 'true');
    localStorage.setItem('sb-xgowpznkqbsngdiuodmj-auth-token', JSON.stringify(session));
  }, authData.session);

  await page.goto('http://localhost:5173/food', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Find targets button
  const targetsBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.innerText.includes('Targets:'));
  });
  if (targetsBtn) {
    await targetsBtn.click();
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'food_stage4_goal_settings_modal.png') });
  }

  await browser.close();
}

run();
