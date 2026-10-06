import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const SOURCES_DIR = path.resolve('scratch/sources');
if (!fs.existsSync(SOURCES_DIR)) {
  fs.mkdirSync(SOURCES_DIR, { recursive: true });
}

const SOURCES = [
  {
    name: 'UK_COFID_2021',
    filename: 'McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021.xlsx',
    url: 'https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx',
  },
  {
    name: 'USDA_SR_LEGACY_2018',
    filename: 'FoodData_Central_sr_legacy_food_csv_2018-04.zip',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
  },
  {
    name: 'USDA_FOUNDATION_2024',
    filename: 'FoodData_Central_foundation_food_csv_2024-10-31.zip',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2024-10-31.zip',
  },
];

async function downloadFile(url, destPath) {
  console.log(`Downloading ${url} -> ${destPath}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const fileStream = fs.createWriteStream(destPath);
  await pipeline(res.body, fileStream);
  const stat = fs.statSync(destPath);
  console.log(`Downloaded ${destPath} (${Math.round(stat.size / 1024)} KB)`);
}

async function main() {
  for (const src of SOURCES) {
    const dest = path.join(SOURCES_DIR, src.filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      console.log(`Source already exists: ${dest}`);
      continue;
    }
    try {
      await downloadFile(src.url, dest);
    } catch (err) {
      console.error(`Failed to download ${src.name}:`, err.message);
    }
  }
}

main();
