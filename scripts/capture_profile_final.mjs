import puppeteer from 'puppeteer';
import path from 'path';
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

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('Injecting session and navigating to /profile...');
  await page.goto('http://localhost:5173/welcome', { waitUntil: 'domcontentloaded' });
  await page.evaluate((session) => {
    localStorage.setItem('zyrbit_onboarded', 'true');
    localStorage.setItem('sb-xgowpznkqbsngdiuodmj-auth-token', JSON.stringify(session));
  }, authData.session);

  await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const outPath = path.join(ARTIFACT_DIR, 'profile_final_390.png');
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved 390px viewport screenshot to:', outPath);

  const fullOutPath = path.join(ARTIFACT_DIR, 'profile_final_390_full.png');
  await page.screenshot({ path: fullOutPath, fullPage: true });
  console.log('Saved full-page 390px screenshot to:', fullOutPath);

  await browser.close();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
