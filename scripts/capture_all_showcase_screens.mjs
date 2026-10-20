import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\insan\\.gemini\\antigravity-ide\\brain\\34efa0d2-86d6-4d45-b154-9a3e0a7ffc67';

async function captureAll() {
  console.log('Launching browser to capture all showcase screens...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    defaultViewport: { width: 2200, height: 1200 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2200, height: 1200 });

  console.log('Navigating to http://localhost:5173/?screen=showcase...');
  await page.goto('http://localhost:5173/?screen=showcase', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Capture Full Showcase Overview (All 5 screens side-by-side)
  console.log('1. Capturing showcase overview (all 5 tabs side by side)...');
  await page.click('#btn-view-all');
  await new Promise(r => setTimeout(r, 600));
  const overviewContainer = await page.$('#mockups-presentation-container');
  if (overviewContainer) {
    await overviewContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_overview_all_5_tabs.png') });
  }

  // Set viewport to standard single-device inspection size for crisp focus
  await page.setViewport({ width: 1200, height: 1050 });

  // 2. Individual View: Tab 1 - Home
  console.log('2. Capturing Individual Tab 1: Home...');
  await page.click('#btn-view-home');
  await new Promise(r => setTimeout(r, 500));
  const homeFrame = await page.$('#single-screen-inspection-container');
  if (homeFrame) {
    await homeFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_individual_tab_1_home.png') });
  }

  // 3. Individual View: Tab 2 - Track
  console.log('3. Capturing Individual Tab 2: Track...');
  await page.click('#btn-view-track');
  await new Promise(r => setTimeout(r, 500));
  const trackFrame = await page.$('#single-screen-inspection-container');
  if (trackFrame) {
    await trackFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_individual_tab_2_track.png') });
  }

  // 4. Individual View: Tab 3 - Quick Add
  console.log('4. Capturing Individual Tab 3: Quick Add...');
  await page.click('#btn-view-add');
  await new Promise(r => setTimeout(r, 500));
  const addFrame = await page.$('#single-screen-inspection-container');
  if (addFrame) {
    await addFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_individual_tab_3_quick_add.png') });
  }

  // 5. Individual View: Tab 4 - Insights
  console.log('5. Capturing Individual Tab 4: Insights...');
  await page.click('#btn-view-insights');
  await new Promise(r => setTimeout(r, 500));
  const insightsFrame = await page.$('#single-screen-inspection-container');
  if (insightsFrame) {
    await insightsFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_individual_tab_4_insights.png') });
  }

  // 6. Individual View: Tab 5 - Your Space
  console.log('6. Capturing Individual Tab 5: Your Space...');
  await page.click('#btn-view-space');
  await new Promise(r => setTimeout(r, 500));
  const spaceFrame = await page.$('#single-screen-inspection-container');
  if (spaceFrame) {
    await spaceFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_individual_tab_5_your_space.png') });
  }

  // 7. Interactive Quick Add Modal open / dismiss test
  console.log('7. Testing Quick Add sheet open on Tab 1 Home...');
  await page.click('#btn-view-home');
  await new Promise(r => setTimeout(r, 400));
  // Click on the "+" button inside the bottom navigation dock
  await page.evaluate(() => {
    const bottomNav = document.querySelector('nav');
    if (bottomNav) {
      const plusBtn = bottomNav.querySelectorAll('button')[2]; // 3rd button is "+"
      if (plusBtn) plusBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  const quickAddModalFrame = await page.$('#single-screen-inspection-container');
  if (quickAddModalFrame) {
    await quickAddModalFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_quick_add_modal_open.png') });
  }

  // 8. Capture Provisional Desktop Layout
  console.log('8. Capturing Provisional Desktop Layout...');
  await page.setViewport({ width: 1600, height: 1100 });
  await page.click('#btn-view-desktop');
  await new Promise(r => setTimeout(r, 600));
  const desktopFrame = await page.$('#desktop-presentation-frame');
  if (desktopFrame) {
    await desktopFrame.screenshot({ path: path.join(ARTIFACT_DIR, 'showcase_provisional_desktop.png') });
  }

  await browser.close();
  console.log('All individual views and showcase screenshots captured successfully!');
}

captureAll().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
