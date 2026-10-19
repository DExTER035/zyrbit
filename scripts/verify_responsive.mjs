import puppeteer from 'puppeteer';

async function testResponsive() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const screens = [
    { name: 'Welcome', url: 'http://localhost:5173/?screen=welcome' },
    { name: 'Sign Up', url: 'http://localhost:5173/?screen=login&mode=signup' },
    { name: 'Sign In', url: 'http://localhost:5173/?screen=login&mode=login' },
    { name: 'Goal Setup', url: 'http://localhost:5173/?screen=goal-setup' },
  ];

  const widths = [320, 360, 390, 430];
  let anyOverflow = false;

  for (const s of screens) {
    for (const w of widths) {
      await page.setViewport({ width: w, height: 800, isMobile: true });
      await page.goto(s.url, { waitUntil: 'networkidle2' });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
      });
      console.log(`${s.name} @ ${w}px: overflow = ${overflow}`);
      if (overflow) anyOverflow = true;
    }
  }

  await browser.close();
  if (anyOverflow) {
    console.error('Horizontal overflow detected!');
    process.exit(1);
  } else {
    console.log('Zero overflow across all viewports!');
  }
}

testResponsive().catch(err => {
  console.error(err);
  process.exit(1);
});
