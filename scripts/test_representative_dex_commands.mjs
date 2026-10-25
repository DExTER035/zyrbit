import { resolveDeterministicIntent, parseIntent } from '../src/dex/dexIntentParser.js';
import { isPlanningIntent } from '../src/dex/planning/planner.js';

const commands = [
  'Complete my morning habit.',
  'Create a task to finish my DSA assignment.',
  'Start a 25-minute focus session.',
  'I drank 500 ml of water.',
  'I slept 7 hours.',
  'I ate 4 eggs and a banana.',
  'I spent ₹200 on lunch.',
  'I received ₹5,000 from freelance work.',
  'Transfer ₹500 to savings.',
  'I lent ₹1,000 to a friend.',
  'How much did I spend this month?',
  'I have 45 minutes. What should I focus on?'
];

const mockContext = {
  habits: {
    habits: [
      { id: 'h-1', title: 'Morning meditation', is_morning: true, completed: false }
    ]
  },
  growth: {
    pendingTasks: [
      { id: 't-1', title: 'DSA assignment', estimatedMinutes: 30 }
    ],
    currentFocus: null
  },
  health: {
    waterMlToday: 750,
    recoveryScore: 82,
    lastSleep: { hours: 7.5 }
  },
  wealth: {
    monthlySpend: 14500,
    safeToSpend: 8200
  }
};

console.log('=== TESTING 12 REPRESENTATIVE DEX COMMANDS ===\n');

async function testAll() {
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`Command ${i + 1}: "${cmd}"`);
    
    // Check planning intent
    const isPlan = isPlanningIntent(cmd);
    
    // Check deterministic resolution
    const detResult = resolveDeterministicIntent(cmd, mockContext);
    
    // Check full parseIntent
    let fullResult = null;
    try {
      fullResult = await parseIntent({ userMessage: cmd, context: mockContext });
    } catch (e) {
      fullResult = { success: false, error: e.message };
    }

    console.log(`  - isPlanningIntent: ${isPlan}`);
    console.log(`  - Deterministic Intent: ${detResult?.intent || 'none'}, Action: ${detResult?.action || 'none'}`);
    if (detResult?.params) {
      console.log(`    Params: ${JSON.stringify(detResult.params)}`);
    }
    if (detResult?.intent === 'clarify') {
      console.log(`    Clarification question: "${detResult.question}"`);
    }
    console.log(`  - Full parseIntent: ${fullResult?.success ? fullResult.intent?.intent : 'failed'}`);
    if (fullResult?.intent?.plan) {
      console.log(`    Plan generated: Goal="${fullResult.intent.plan.goal}", Steps=${fullResult.intent.plan.steps.length}`);
    }
    console.log('');
  }
}

testAll();
