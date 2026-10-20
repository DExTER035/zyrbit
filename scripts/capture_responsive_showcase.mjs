import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';

async function testResponsiveShowcase() {
  console.log('Testing responsive showcase in Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Chrome DevTools Mobile Emulation (iPhone 14 / standard 390px x 844px)
  console.log('1. Testing Chrome DevTools mobile viewport (390px x 844px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/?screen=showcase', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Check for horizontal overflow
  const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Document scrollWidth at 390px viewport: ${bodyScrollWidth}px (Expected: <= 390px)`);

  // Capture Mobile Viewport: Home tab
  await page.click('#btn-view-home');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'showcase_mobile_devtools_home.png'),
    fullPage: false
  });

  // Capture Mobile Viewport: Track tab (4 domains)
  await page.click('#btn-view-track');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'showcase_mobile_devtools_track.png'),
    fullPage: false
  });

  // Test Quick Add modal open & dismiss in mobile emulation
  console.log('2. Testing Quick Add sheet in mobile emulation...');
  await page.click('#btn-test-quick-add-toggle');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'showcase_mobile_devtools_quick_add_open.png'),
    fullPage: false
  });

  // Dismiss Quick Add
  await page.click('#btn-dismiss-quick-add');
  await new Promise(r => setTimeout(r, 300));

  // Capture Overview in mobile emulation (verifying stacked/responsive previews)
  console.log('3. Capturing overview in mobile emulation...');
  await page.click('#btn-view-all');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'showcase_mobile_devtools_overview.png'),
    fullPage: false
  });

  // Test 2: Tablet Viewport (768px x 1024px)
  console.log('4. Testing Tablet viewport (768px x 1024px)...');
  await page.setViewport({ width: 768, height: 1024, isMobile: true });
  await page.click('#btn-viewport-tablet');
  await page.click('#btn-view-home');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'showcase_tablet_preview.png'),
    fullPage: false
  });

  // Test 3: Desktop Viewport with Viewport Control = Mobile (390px phone stage on desktop window)
  console.log('5. Testing Desktop window (1400px) with Viewport Control = Mobile...');
  await page.setViewport({ width: 1400, height: 950, isMobile: false });
  await page.click('#btn-viewport-mobile');
  await page.click('#btn-view-home');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'showcase_desktop_window_mobile_control.png'),
    fullPage: false
  });

  // Test 4: Desktop Viewport Control = Desktop (Full side-by-side overview & Provisional desktop layout)
  console.log('6. Testing Desktop window with Viewport Control = Desktop...');
  await page.click('#btn-viewport-desktop');
  await page.click('#btn-view-desktop');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'showcase_desktop_layout_preview.png'),
    fullPage: false
  });

  await browser.close();
  console.log('All responsive showcase tests and screenshots completed successfully!');
}

testResponsiveShowcase().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
