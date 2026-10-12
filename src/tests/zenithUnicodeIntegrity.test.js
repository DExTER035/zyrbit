/* global process */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Zenith Unicode & Mojibake Integrity', () => {
  const filePath = path.resolve(process.cwd(), 'src/pages/Zenith/index.jsx');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  it('contains zero mojibake byte corruption sequences', () => {
    // Mojibake patterns that previously corrupted Zenith
    const forbiddenSequences = [
      'ðŸ§ ',
      'âš¡',
      'ðŸŒ±',
      'ðŸŒŒ',
      'ðŸ’§',
      'ðŸ ƒ',
      'ðŸ“š',
      'ðŸ§˜',
      'ðŸŽ¯',
      'ðŸ’¤',
      'â Œ',
      'âœ…',
      'â ­ï¸ ',
      'ðŸ—‘ï¸ ',
      'ðŸ“ ',
      'â€”',
      'â‚¹',
      'â”€',
    ];

    for (const seq of forbiddenSequences) {
      expect(fileContent.includes(seq), `File should not contain mojibake sequence: ${seq}`).toBe(false);
    }
  });

  it('restores clean ZONE_OPTIONS emojis matching Growth', () => {
    expect(fileContent).toContain("{ id: 'mind', label: 'Mind', icon: '🧠' }");
    expect(fileContent).toContain("{ id: 'body', label: 'Body', icon: '⚡' }");
    expect(fileContent).toContain("{ id: 'growth', label: 'Growth', icon: '🌱' }");
    expect(fileContent).toContain("{ id: 'soul', label: 'Soul', icon: '🌌' }");
  });

  it('restores clean QUICK_ICONS array', () => {
    expect(fileContent).toContain("const QUICK_ICONS = ['🌱', '⚡', '🧠', '🌌', '💧', '🏃', '📚', '🧘', '🎯', '💤'];");
  });

  it('restores Indian Rupee symbol and em-dashes in timeline and state labels', () => {
    expect(fileContent).toContain("`₹${Number(e.amount).toFixed(0)} — ${e.note || e.category || 'Expense'}`");
    expect(fileContent).toContain("`Rest day — focus on sleep and water (${recoveryScore}% recovery)`");
    expect(fileContent).toContain("'Monthly budget reached — slow down spending today'");
    expect(fileContent).toContain("`Slept ${Number(lastSleep.duration_hours).toFixed(1)}h — Quality ${lastSleep.quality}/5`");
  });

  it('restores intended toast feedback glyphs', () => {
    expect(fileContent).toContain("showToast(isCompleted ? '❌ Failed to uncheck habit.' : \"❌ Failed to log today's habit.\", 'error');");
    expect(fileContent).toContain("showToast('✅ Habit logged!', 'success');");
    expect(fileContent).toContain("showToast('⏭️ Skipped — stay consistent tomorrow!', 'warning');");
    expect(fileContent).toContain("showToast('❌ Failed to skip habit.', 'error');");
    expect(fileContent).toContain("showToast('✅ Habit updated!', 'success');");
    expect(fileContent).toContain("showToast('🌱 New habit added!', 'success');");
    expect(fileContent).toContain("showToast('🗑️ Habit removed', 'info');");
    expect(fileContent).toContain("showToast('📝 Daily reflection saved!', 'success');");
    expect(fileContent).toContain("showToast('🎯 Priority complete!', 'success');");
  });
});
