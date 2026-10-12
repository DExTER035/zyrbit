import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HealthMealsList from '../components/domain/health/HealthMealsList.jsx';
import BodyRhythmVisualizer from '../components/domain/health/BodyRhythmVisualizer.jsx';

describe('Food UI Truth & Empty-State Regression Suite', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // CASE A: Empty Meal List
  // ──────────────────────────────────────────────────────────────────────────
  describe('Case A: Empty meal list handling', () => {
    it('HealthMealsList: displays 0 count, clean honest empty state, and no fake Poha', () => {
      const html = renderToStaticMarkup(
        <HealthMealsList
          mealLogs={[]}
          favoriteFoodNames={new Set()}
          onAddMeal={() => {}}
          onEditMeal={() => {}}
          onDeleteMeal={() => {}}
        />
      );

      // 1. Count must be 0
      expect(html).toContain('>0<');
      expect(html).not.toContain('>1<');

      // 2. No Poha or fake placeholder data
      expect(html).not.toContain('Poha');
      expect(html).not.toContain('meal-default-1');
      expect(html).not.toContain('280 kcal');
      expect(html).not.toContain('1 plate');

      // 3. Honest empty state message displayed
      expect(html).toContain('No meals logged today. Tap Log Food to get started.');

      // 4. Log food action remains available
      expect(html).toContain('+ Log food');
    });

    it('BodyRhythmVisualizer: displays 0 meals, no fake rhythm markers, and no 3-meals label', () => {
      const html = renderToStaticMarkup(
        <BodyRhythmVisualizer
          sleepHours={0}
          mealLogs={[]}
          waterLogs={[]}
        />
      );

      // 1. Must report "0 meals"
      expect(html).toContain('0 meals');
      expect(html).not.toContain('3 meals');

      // 2. Track 2 (Fuel track) must not render fabricated meal dots
      // Each Fuel meal dot had boxShadow: 0 0 6px rgba(233, 180, 76, 0.5)
      expect(html).not.toContain('rgba(233, 180, 76, 0.5)');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE B: Real Meal List
  // ──────────────────────────────────────────────────────────────────────────
  describe('Case B: Real meal list rendering', () => {
    const realMeal = {
      id: 'real-meal-uuid-123',
      meal_name: 'Grilled Paneer Salad',
      name: 'Grilled Paneer Salad',
      serving_size: '150g',
      calories: 380,
      protein_g: 26,
      carbs_g: 8,
      fat_g: 28,
      meal_time: '13:15',
      confidence: 'KNOWN',
    };

    it('HealthMealsList: displays real meal count 1, real food name, and real nutrition', () => {
      const html = renderToStaticMarkup(
        <HealthMealsList
          mealLogs={[realMeal]}
          favoriteFoodNames={new Set()}
          onAddMeal={() => {}}
          onEditMeal={() => {}}
          onDeleteMeal={() => {}}
        />
      );

      // 1. Count must be 1
      expect(html).toContain('>1<');

      // 2. Real meal details rendered
      expect(html).toContain('Grilled Paneer Salad');
      expect(html).toContain('150g');
      expect(html).toContain('~380 kcal');
      expect(html).toContain('13:15');
      expect(html).toContain('KNOWN');

      // 3. No fake fallback message or fake poha
      expect(html).not.toContain('No meals logged today');
      expect(html).not.toContain('Poha');
    });

    it('BodyRhythmVisualizer: displays 1 meal and renders real timeline dot', () => {
      const html = renderToStaticMarkup(
        <BodyRhythmVisualizer
          sleepHours={7.5}
          mealLogs={[realMeal]}
          waterLogs={[]}
        />
      );

      // 1. Must report "1 meal"
      expect(html).toContain('1 meal');
      expect(html).not.toContain('0 meals');
      expect(html).not.toContain('3 meals');

      // 2. Meal dot positioned at 13:15 -> 13.25h -> (13.25 / 24) * 100 = 55.2083...%
      expect(html).toContain('left:55.208333333333336%');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE C: Zero-Calorie Food
  // ──────────────────────────────────────────────────────────────────────────
  describe('Case C: Zero-calorie food handling', () => {
    const zeroCalMeal = {
      id: 'zero-cal-uuid-456',
      meal_name: 'Black Americano',
      serving_size: '250ml',
      calories: 0,
      protein_g: 0.2,
      carbs_g: 0,
      fat_g: 0,
      meal_time: '07:30',
      confidence: 'KNOWN',
    };

    it('HealthMealsList: displays 0 kcal and NEVER falls back to 280 kcal', () => {
      const html = renderToStaticMarkup(
        <HealthMealsList
          mealLogs={[zeroCalMeal]}
          favoriteFoodNames={new Set()}
          onAddMeal={() => {}}
        />
      );

      // 1. Must display ~0 kcal
      expect(html).toContain('~0 kcal');

      // 2. Must NEVER display 280 kcal
      expect(html).not.toContain('280 kcal');
      expect(html).not.toContain('~280 kcal');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE D: Missing / Null Calories
  // ──────────────────────────────────────────────────────────────────────────
  describe('Case D: Missing / null calorie data handling', () => {
    const nullCalMeal = {
      id: 'null-cal-uuid-789',
      meal_name: 'Herbal Infusion Tea',
      serving_size: '1 cup',
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      meal_time: '16:00',
      confidence: 'ESTIMATED',
    };

    it('HealthMealsList: does not fabricate 280 kcal or ~5g/~48g/~7g for null values', () => {
      const html = renderToStaticMarkup(
        <HealthMealsList
          mealLogs={[nullCalMeal]}
          favoriteFoodNames={new Set()}
          onAddMeal={() => {}}
        />
      );

      // 1. Must safely fall back to 0 without fabricating 280
      expect(html).toContain('~0 kcal');
      expect(html).not.toContain('280 kcal');
      expect(html).not.toContain('~280 kcal');

      // 2. Must not contain fake Poha macros
      expect(html).not.toContain('~5g');
      expect(html).not.toContain('~48g');
      expect(html).not.toContain('~7g');
    });
  });
});
