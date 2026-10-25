import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Zenith from '../pages/Zenith/index.jsx';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useLocation: () => ({ search: '' }),
}));

// Mock Supabase
vi.mock('../lib/supabase/index.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [] }),
          gte: () => Promise.resolve({ data: [] }),
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
        order: () => Promise.resolve({ data: [] }),
      }),
    }),
  },
}));

// Mock habitService and other external services
vi.mock('../services/habitService.js', () => ({
  toggleHabit: vi.fn(),
  skipHabit: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  submitDailyReflection: vi.fn(),
}));

vi.mock('../services/growthService.js', () => ({
  completeTask: vi.fn(),
}));

vi.mock('../services/healthService.js', () => ({
  getHealthSnapshot: vi.fn().mockResolvedValue({}),
}));

describe('Stage 3 — Zenith First-Open Experience & Truthful Empty States', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Renders welcoming daily orientation and context-aware next step on first open', () => {
    const html = renderToStaticMarkup(<Zenith />);

    // 1. Branding & Orientation
    expect(html).toContain('ZYRBIT');
    expect(html).toContain('PERSONAL OS');

    // 2. Intention Hero — Context-aware next step
    expect(html).toContain('YOUR DAY, WITH INTENTION');
    expect(html).toContain('Begin with one focused block or daily habit.');
    expect(html).toContain('Start a 25-minute focus session');

    // 3. Priorities — Truthful empty states without fake data or fabricated streaks
    expect(html).toContain("Today&#x27;s priorities");
    expect(html).toContain('No active tasks');
    expect(html).toContain('No habits scheduled');
    expect(html).toContain('+ Task');
    expect(html).toContain('+ Habit');

    // 4. Dex Command Center & Real Action Discovery Pills
    expect(html).toContain('Ask Dex');
    expect(html).toContain('Natural language OS');
    expect(html).toContain('⌘K');
    expect(html).toContain('⏱️ Start 25m focus');
    expect(html).toContain('💧 Log 500ml water');
    expect(html).toContain('🎯 What should I focus on?');
  });
});
