/**
 * HealthMealsList — Today's Meals with KNOWN/ESTIMATED/UNKNOWN Classification
 * Communicates Fuel Rhythm & Food State without turning Health into a calorie spreadsheet.
 */
import React, { useState } from 'react';
import { Utensils, ChevronDown, ChevronUp } from 'lucide-react';

export default function HealthMealsList({ mealLogs = [], onSeeAll }) {
  const [expandedId, setExpandedId] = useState(null);

  // Fallback representative meals if fresh day
  const displayMeals = mealLogs.length > 0 ? mealLogs : [
    {
      id: 'meal-default-1',
      meal_name: 'Poha',
      serving_size: '1 plate',
      calories: 280,
      protein_g: 5.2,
      carbs_g: 48,
      fat_g: 7,
      meal_time: '09:15',
      confidence: 'ESTIMATED',
    },
  ];

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <span style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#ECE8DF',
          letterSpacing: '-0.01em',
        }}>
          Today's meals
        </span>
        <button
          onClick={onSeeAll}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#38BDF8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '2px 0',
          }}
        >
          See all
        </button>
      </div>

      {/* Meals List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayMeals.map((meal) => {
          const isExpanded = expandedId === meal.id;
          const confidence = meal.confidence || (meal.source === 'verified_db' ? 'KNOWN' : 'ESTIMATED');

          return (
            <div
              key={meal.id}
              onClick={() => toggleExpand(meal.id)}
              style={{
                background: '#15161B',
                border: '1px solid #26272D',
                borderRadius: '16px',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3A3B40';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#26272D';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Meal icon/avatar */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(233, 180, 76, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#E9B44C',
                  }}>
                    🍲
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ECE8DF' }}>
                        {meal.meal_name || meal.name}
                      </span>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: confidence === 'KNOWN' ? '#10B981' : '#E9B44C',
                        background: confidence === 'KNOWN' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(233, 180, 76, 0.12)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        letterSpacing: '0.04em',
                      }}>
                        {confidence}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#9A978F', marginTop: '2px' }}>
                      {meal.serving_size || '1 plate'} • ~{Math.round(meal.calories || 280)} kcal
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>
                    {meal.meal_time || '9:15 AM'}
                  </div>
                  <div style={{ color: '#9A978F', marginTop: '4px' }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
              </div>

              {/* Expandable Macro Details (Inspected on user tap) */}
              {isExpanded && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #26272D',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  textAlign: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#ECE8DF' }}>
                      {Math.round(meal.calories || 280)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9A978F' }}>kcal</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>
                      {meal.protein_g ? `${meal.protein_g}g` : '~5g'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9A978F' }}>protein</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#E9B44C' }}>
                      {meal.carbs_g ? `${meal.carbs_g}g` : '~48g'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9A978F' }}>carbs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#F43F5E' }}>
                      {meal.fat_g ? `${meal.fat_g}g` : '~7g'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9A978F' }}>fat</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
