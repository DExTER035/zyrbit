import { performance } from 'perf_hooks';
import GLOBAL_FOODS from '../src/data/foods/globalCanonicalFoods.json' with { type: 'json' };

console.log(`Testing in-memory search across ${GLOBAL_FOODS.length} canonical foods...`);

const testQueries = [
  'roti',
  '2 eggs',
  'boiled egg',
  'chicken breast',
  'raw apple',
  'cheddar cheese',
  'salmon fillet',
  'oats',
  'olive oil',
  'peanut butter',
  'brown rice',
  'greek yogurt',
];

const latencies = [];

for (const q of testQueries) {
  const t0 = performance.now();
  const lower = q.toLowerCase();
  
  // Exact or substring match with preparation state
  const matches = GLOBAL_FOODS.filter(f => 
    f.name.toLowerCase() === lower ||
    f.name.toLowerCase().includes(lower) ||
    lower.includes(f.name.toLowerCase())
  );
  
  const t1 = performance.now();
  latencies.push(t1 - t0);
  console.log(`Query "${q}" -> ${matches.length} matches in ${(t1 - t0).toFixed(3)}ms (Top match: "${matches[0]?.name}", source: ${matches[0]?.sourceName})`);
}

const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
console.log(`\nAverage query latency: ${avg.toFixed(3)}ms`);
