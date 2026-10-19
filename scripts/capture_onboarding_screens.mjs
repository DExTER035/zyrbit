import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';

async function capture() {
  console.log('Launching browser for onboarding screen capture...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Screen 1: Welcome
  console.log('Capturing Screen 1: Welcome...');
  await page.goto('http://localhost:5173/?screen=welcome', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_screen1_welcome.png') });

  // Screen 2: Sign Up
  console.log('Capturing Screen 2: Sign Up...');
  await page.goto('http://localhost:5173/?screen=login&mode=signup', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_screen2_signup.png') });

  // Screen 3: Sign In
  console.log('Capturing Screen 3: Sign In...');
  await page.goto('http://localhost:5173/?screen=login&mode=login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_screen3_signin.png') });

  // Screen 4: Goal Setup
  console.log('Capturing Screen 4: Goal Setup...');
  await page.goto('http://localhost:5173/?screen=goal-setup', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'onboarding_screen4_goal_setup.png') });

  await browser.close();
  console.log('All onboarding screens captured successfully!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
