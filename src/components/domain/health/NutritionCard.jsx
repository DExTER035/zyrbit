import React, { useState, useMemo } from 'react';
import { Utensils, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { C, ProgressBar } from './shared.jsx';
import PersonalUsualsBar from '../food/PersonalUsualsBar.jsx';
import SavedMealsSection from '../food/SavedMealsSection.jsx';
import MealSection from '../food/MealSection.jsx';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function NutritionCard({
  fuel,
  mealLogs = [],
  personalUsuals = [],
  savedMeals = [],
  userId,
  onAddFood,
  onDeleteLog,
  onEditLog,
  onLogSavedMeal,
  onDeleteSavedMeal,
  onSelectUsual,
  onRepeatYesterday,
  onMealSaved,
}) {
  const [showMealDetails, setShowMealDetails] = useState(false);

  const logsByMeal = useMemo(() => {
    const map = {};
    MEAL_TYPES.forEach((t) => { map[t] = []; });
    (mealLogs || []).forEach((l) => {
      if (map[l.meal_type]) map[l.meal_type].push(l);
    });
    return map;
  }, [mealLogs]);

  const calories = fuel?.calories || 0;
  const targetCalories = fuel?.targetCalories || 2200;
  const protein = fuel?.protein || 0;
  const targetProtein = fuel?.targetProtein || 130;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.nutrition}`,
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Utensils size={15} color={C.nutrition} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, letterSpacing: '0.5px' }}>
            NUTRITION & FUEL
          </span>
        </div>
        <span style={{ fontSize: '10px', color: C.sub, fontWeight: 700 }}>
          Target: {targetCalories} kcal · {targetProtein}g P
        </span>
      </div>

      {/* ── Main Stat ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: C.text, lineHeight: 1 }}>
            {calories}
          </span>
          <span style={{ fontSize: '12px', color: C.muted, fontWeight: 500 }}>
            / {targetCalories} kcal
          </span>
          <span style={{ fontSize: '12px', color: C.protein, fontWeight: 700, marginLeft: 'auto' }}>
            {protein}g protein
          </span>
        </div>
        {fuel?.balance?.text && (
          <div style={{ fontSize: '11px', color: C.sub, marginTop: '5px', lineHeight: 1.4 }}>
            {fuel.balance.text}
          </div>
        )}
      </div>

      {/* ── Progress Bar ── */}
      <ProgressBar value={calories} max={targetCalories} color={C.nutrition} height={5} />

      {/* ── 1-Tap Personal Usuals ── */}
      {personalUsuals.length > 0 && (
        <PersonalUsualsBar usuals={personalUsuals} onSelectUsual={onSelectUsual} />
      )}

      {/* ── 1-Tap Saved Meal Combos ── */}
      {savedMeals.length > 0 && (
        <SavedMealsSection
          savedMeals={savedMeals}
          onLogSavedMeal={onLogSavedMeal}
          onDelete={onDeleteSavedMeal}
        />
      )}

      {/* ── Repeat Yesterday Action ── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onRepeatYesterday}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: '10px',
            background: `${C.nutrition}12`,
            border: `1px solid ${C.nutrition}28`,
            color: C.nutrition,
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCcw size={12} />
          Repeat Yesterday's Meals
        </button>

        <button
          type="button"
          onClick={() => setShowMealDetails((p) => !p)}
          style={{
            padding: '9px 12px',
            borderRadius: '10px',
            background: C.elev,
            border: `1px solid ${C.border2}`,
            color: C.sub,
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {showMealDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showMealDetails ? 'Hide Meals' : `View Meals (${mealLogs.length})`}
        </button>
      </div>

      {/* ── Expandable Meal Details (Breakfast, Lunch, Dinner, Snack) ── */}
      {showMealDetails && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', borderTop: `1px solid ${C.border2}`, paddingTop: '12px', animation: 'fadeSlideUp 0.2s ease' }}>
          {MEAL_TYPES.map((type) => (
            <MealSection
              key={type}
              mealType={type}
              logs={logsByMeal[type]}
              userId={userId}
              onAddFood={onAddFood}
              onDeleteLog={onDeleteLog}
              onEditLog={onEditLog}
              onMealSaved={onMealSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
