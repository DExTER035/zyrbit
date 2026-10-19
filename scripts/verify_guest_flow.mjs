import puppeteer from 'puppeteer';

async function testGuestFlow() {
  console.log('Testing genuine guest authentication flow...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERR:', msg.text());
  });

  // Clear storage first
  await page.goto('http://localhost:5173/?screen=login&mode=signup', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173/?screen=login&mode=signup', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Finding and clicking Guest button...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const guestBtn = btns.find(b => b.innerText.includes('Guest'));
    if (guestBtn) {
      guestBtn.click();
      return true;
    }
    return false;
  });

  if (!clicked) {
    throw new Error('Guest button not found on page');
  }

  // Wait for goal setup screen
  console.log('Waiting for Goal Setup screen...');
  await page.waitForFunction(() => {
    return document.body.innerText.includes('What do you want to') && document.body.innerText.includes('bring into focus?');
  }, { timeout: 15000 });
  console.log('✓ Successfully arrived at Goal Setup screen via real guest session!');

  // Verify goal options
  const hasHabits = await page.evaluate(() => document.body.innerText.includes('Habits'));
  const hasHealth = await page.evaluate(() => document.body.innerText.includes('Health'));
  const hasGrowth = await page.evaluate(() => document.body.innerText.includes('Growth'));
  const hasWealth = await page.evaluate(() => document.body.innerText.includes('Wealth'));
  console.log('✓ Goal cards present:', { hasHabits, hasHealth, hasGrowth, hasWealth });

  // Click Continue
  console.log('Clicking Continue button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const continueBtn = btns.find(b => b.innerText.includes('Continue'));
    if (continueBtn) continueBtn.click();
  });

  // Wait for Step 2
  await page.waitForFunction(() => {
    return document.body.innerText.includes('Set your initial targets');
  }, { timeout: 10000 });
  console.log('✓ Successfully advanced to Step 2: Targets!');

  await browser.close();
  console.log('Guest authentication & onboarding flow fully verified!');
}

testGuestFlow().catch(err => {
  console.error('Guest flow test failed:', err);
  process.exit(1);
});
