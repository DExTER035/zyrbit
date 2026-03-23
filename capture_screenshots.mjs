import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'public', 'screenshots');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Write the HTML to a temp file so Puppeteer can load it via file:// URL
// (fonts come from Google CDN so network must be allowed)
const htmlPath = path.join(OUT_DIR, '_template_tmp.html');
// The HTML is embedded at build time by this script reading itself — 
// instead we use a helper file written by the parent process.
// If the helper template doesn't exist, we fall back to setContent.
let htmlContent;
const templatePath = path.join(OUT_DIR, 'template.html');
if (fs.existsSync(templatePath)) {
  htmlContent = fs.readFileSync(templatePath, 'utf8');
} else {
  console.error('ERROR: template.html not found in public/screenshots/');
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true, defaultViewport: null, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();

// Set viewport big enough to show all frames side by side
await page.setViewport({ width: 2400, height: 1100 });
await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

// Give fonts time to load
await new Promise(r => setTimeout(r, 3000));

// Find all .frame elements
const frames = await page.$$('.frame');
console.log(`Found ${frames.length} frames`);

const labels = [
  'mobile-1', // Orbit
  'mobile-2', // Journal/Study
  'mobile-3', // Stats
  'mobile-4', // Community
  'mobile-5', // Profile
];

for (let i = 0; i < frames.length; i++) {
  const outPath = path.join(OUT_DIR, `${labels[i]}.png`);
  await frames[i].screenshot({ path: outPath });
  console.log(`✅ Saved ${labels[i]}.png`);
}

await browser.close();
console.log('Done!');
