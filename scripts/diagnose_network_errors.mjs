import puppeteer from 'puppeteer';

async function diagnoseNetworkErrors() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  page.on('response', async res => {
    if (res.status() >= 400) {
      let body = '';
      try {
        body = await res.text();
      } catch {}
      console.log(`[STATUS ${res.status()}] ${res.request().method()} ${res.url()}`);
      console.log(` -> Body: ${body.slice(0, 150)}`);
    }
  });

  console.log('Navigating to login...');
  await page.goto('https://zyrbit.vercel.app/?screen=login&mode=signup', { waitUntil: 'networkidle2' });
  console.log('Clicking guest button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const guestBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('guest'));
    if (guestBtn) guestBtn.click();
  });

  console.log('Waiting for Skip for now...');
  await page.waitForFunction(() => document.body.innerText.includes('Skip for now'), { timeout: 15000 });
  console.log('Clicking skip for now...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const skipBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('skip for now'));
    if (skipBtn) skipBtn.click();
  });

  console.log('Waiting 5s on Zenith...');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

diagnoseNetworkErrors();
