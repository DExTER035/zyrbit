import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';

async function capture() {
  console.log('Launching browser to capture 5 Core Tabs presentation...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 2150, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2150, height: 1100 });

  console.log('Navigating to http://localhost:5173/?screen=showcase...');
  await page.goto('http://localhost:5173/?screen=showcase', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Capture the 5 mockups presentation frame
  const container = await page.$('#mockups-presentation-container');
  if (container) {
    console.log('Capturing #mockups-presentation-container screenshot...');
    await container.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_5_core_tabs_side_by_side.png') });
  }

  // Also capture full wide presentation
  console.log('Capturing full presentation screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_5_core_tabs_full.png') });

  // Switch to Desktop Layout and capture
  console.log('Switching to Desktop Layout view...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const desktopBtn = btns.find(b => b.innerText.includes('Desktop Layout'));
    if (desktopBtn) desktopBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const desktopFrame = await page.$('#desktop-presentation-frame');
  if (desktopFrame) {
    console.log('Capturing #desktop-presentation-frame screenshot...');
    await desktopFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_desktop_layout.png') });
  } else {
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_desktop_layout.png') });
  }

  await browser.close();
  console.log('All presentation screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
