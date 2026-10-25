import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';

async function captureWealth() {
  console.log('Launching browser to capture Wealth Home...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('Browser Error:', msg.text());
  });

  console.log('1. Navigating to http://localhost:5173/welcome...');
  await page.goto('http://localhost:5173/welcome', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Clicking "Continue as Guest"...');
  await page.waitForSelector('button', { timeout: 8000 });
  const guestClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Guest'));
    if (b) {
      b.click();
      return true;
    }
    return false;
  });
  console.log('Guest button clicked:', guestClicked);
  await new Promise(r => setTimeout(r, 2500));

  console.log('3. Checking URL after guest sign-in:', page.url());
  const skipped = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const skip = btns.find(b => /skip|continue|get started/i.test(b.textContent));
    if (skip) {
      skip.click();
      return true;
    }
    return false;
  });
  console.log('Skip clicked:', skipped);
  await new Promise(r => setTimeout(r, 2500));

  console.log('4. Navigating to http://localhost:5173/wealth...');
  await page.goto('http://localhost:5173/wealth', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  console.log('5. Capturing Wealth Home Viewport...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'wealth_home_viewport_actual.png'),
    fullPage: false
  });

  console.log('6. Capturing Wealth Home Full Page...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'wealth_home_fullpage_actual.png'),
    fullPage: true
  });

  console.log('Done capturing actual Wealth Home!');
  await browser.close();
}

captureWealth().catch(console.error);
