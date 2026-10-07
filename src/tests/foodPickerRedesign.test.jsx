import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FoodPicker from '../components/domain/food/FoodPicker.jsx';
import { FEATURES } from '../config/features.js';

describe('Zyrbit Food Picker Redesign — Reference UX & Food Knowledge V2 Integration', () => {
  const dummyPersonalFoods = [
    {
      id: 'pf_1',
      food_name: 'Pintola Peanut Butter',
      serving_size_g: 32,
      calories: 190,
      protein: 8,
      carbs: 6,
      fat: 16,
      fiber: 2,
      is_favorite: true,
    },
    {
      id: 'pf_2',
      food_name: 'My Custom Whey',
      serving_size_g: 30,
      calories: 120,
      protein: 24,
      carbs: 2,
      fat: 1.5,
      fiber: 0,
      is_favorite: false,
    },
  ];

  const dummyRecentLogs = [
    {
      id: 'log_1',
      food_name: 'Oats',
      quantity_g: 100,
      calories: 389,
      protein: 16.9,
      carbs: 66.3,
      fat: 6.9,
    },
    {
      id: 'log_2',
      food_name: 'Banana',
      quantity_g: 118,
      calories: 105,
      protein: 1.3,
      carbs: 27,
      fat: 0.3,
    },
  ];

  // 1. Title Dynamic Context
  it('displays correct dynamic meal title for Lunch, Breakfast, Dinner, and Snack', () => {
    const htmlLunch = renderToStaticMarkup(<FoodPicker mealType="lunch" onClose={() => {}} />);
    expect(htmlLunch).toContain('Add to Lunch');

    const htmlBreakfast = renderToStaticMarkup(<FoodPicker mealType="breakfast" onClose={() => {}} />);
    expect(htmlBreakfast).toContain('Add to Breakfast');

    const htmlDinner = renderToStaticMarkup(<FoodPicker mealType="dinner" onClose={() => {}} />);
    expect(htmlDinner).toContain('Add to Dinner');

    const htmlSnack = renderToStaticMarkup(<FoodPicker mealType="snack" onClose={() => {}} />);
    expect(htmlSnack).toContain('Add to Snack');
  });

  // 2. Global Search Placeholder
  it('renders reference search placeholder "Search for food (e.g. roti, rice, egg...)"', () => {
    const html = renderToStaticMarkup(<FoodPicker mealType="lunch" onClose={() => {}} />);
    expect(html).toContain('placeholder="Search for food (e.g. roti, rice, egg...)"');
  });

  // 3. No Indian-Only Language
  it('removes all obsolete Indian-only wording ("Indian foods", "Indian Foods Database")', () => {
    const html = renderToStaticMarkup(
      <FoodPicker
        mealType="lunch"
        personalFoods={dummyPersonalFoods}
        recentMealLogs={dummyRecentLogs}
        onClose={() => {}}
      />
    );
    expect(html).not.toContain('Search Indian foods');
    expect(html).not.toContain('Indian Foods Database');
    expect(html).not.toContain('Indian foods or My Foods');
  });

  // 4. Reference Tabs Structure (Recent | Favorites | All Foods)
  it('renders the 3 reference tabs: Recent, Favorites, All Foods', () => {
    const html = renderToStaticMarkup(<FoodPicker mealType="lunch" onClose={() => {}} />);
    expect(html).toContain('>Recent<');
    expect(html).toContain('>Favorites<');
    expect(html).toContain('>All Foods<');

    // Should not contain meal slot categories as filters
    expect(html).not.toContain('>Breakfast<');
    expect(html).not.toContain('>Lunch<');
    expect(html).not.toContain('>Dinner<');
  });

  // 5. Default View (Recent Foods)
  it('renders Recent foods in default Recent tab', () => {
    const html = renderToStaticMarkup(
      <FoodPicker
        mealType="lunch"
        personalFoods={dummyPersonalFoods}
        recentMealLogs={dummyRecentLogs}
        onClose={() => {}}
      />
    );
    expect(html).toContain('Oats');
    expect(html).toContain('Banana');
  });

  // 6. Action Button "Create Personal Food"
  it('renders bottom action button with label "Create Personal Food"', () => {
    const html = renderToStaticMarkup(<FoodPicker mealType="lunch" onClose={() => {}} />);
    expect(html).toContain('Create Personal Food');
    expect(html).not.toContain('+ Create New Personal Food');
  });

  // 7. Personal Food Identification
  it('labels personal foods with green "• Personal Food" badge', () => {
    const html = renderToStaticMarkup(
      <FoodPicker
        mealType="lunch"
        personalFoods={dummyPersonalFoods}
        recentMealLogs={[{ food_name: 'Pintola Peanut Butter', quantity_g: 32, calories: 190 }]}
        onClose={() => {}}
      />
    );
    expect(html).toContain('Pintola Peanut Butter');
    expect(html).toContain('• Personal Food');
  });

  // 8. Calorie and Serving Formatting
  it('formats calories and serving labels clearly with quick-add actions', () => {
    const html = renderToStaticMarkup(
      <FoodPicker
        mealType="lunch"
        personalFoods={dummyPersonalFoods}
        recentMealLogs={dummyRecentLogs}
        onClose={() => {}}
      />
    );
    expect(html).toContain('cal');
    expect(html).toContain('Quick Add to Meal');
  });

  // 9. Food Knowledge V2 Active Compatibility
  it('respects FEATURES.FOOD_KNOWLEDGE_V2 flag and renders stably', () => {
    const prevFlag = FEATURES.FOOD_KNOWLEDGE_V2;
    try {
      FEATURES.FOOD_KNOWLEDGE_V2 = true;
      const htmlV2 = renderToStaticMarkup(
        <FoodPicker mealType="dinner" personalFoods={dummyPersonalFoods} recentMealLogs={dummyRecentLogs} onClose={() => {}} />
      );
      expect(htmlV2).toContain('Add to Dinner');
      expect(htmlV2).toContain('Oats');

      FEATURES.FOOD_KNOWLEDGE_V2 = false;
      const htmlLegacy = renderToStaticMarkup(
        <FoodPicker mealType="dinner" personalFoods={dummyPersonalFoods} recentMealLogs={dummyRecentLogs} onClose={() => {}} />
      );
      expect(htmlLegacy).toContain('Add to Dinner');
      expect(htmlLegacy).toContain('Oats');
    } finally {
      FEATURES.FOOD_KNOWLEDGE_V2 = prevFlag;
    }
  });
});
