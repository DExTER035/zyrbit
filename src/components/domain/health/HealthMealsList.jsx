/**
 * HealthMealsList — Editorial Today's Meals with KNOWN/ESTIMATED Classification
 * Communicates Fuel Rhythm & Food State without turning Health into a calorie spreadsheet.
 * On tap: opens a focused Meal Detail Sheet with macros, confidence, edit & delete.
 */
import React, { useState } from 'react';
import { X, Edit3, Trash2, ChevronRight, ArrowUpRight, Star, BookmarkCheck } from 'lucide-react';

export default function HealthMealsList({
  mealLogs = [],
  favoriteFoodNames = new Set(),
  onSeeAll,
  onEditMeal,
  onDeleteMeal,
  onToggleFavorite,
  onSaveCombo,
  onAddMeal,
  onRepeatYesterday,
  personalUsuals = [],
  onSelectUsual,
}) {
  const [selectedMeal, setSelectedMeal] = useState(null);

  // Fallback representative meals if fresh day
  const displayMeals = mealLogs.length > 0 ? mealLogs : [
    {
      id: 'meal-default-1',
      meal_name: 'Poha',
      name: 'Poha',
      serving_size: '1 plate',
      calories: 280,
      protein_g: 5.2,
      carbs_g: 48,
      fat_g: 7,
      meal_time: '09:15',
      confidence: 'ESTIMATED',
      cost: 30,
    },
  ];

  const handleOpenDetail = (meal) => {
    setSelectedMeal(meal);
  };

  const handleCloseDetail = () => {
    setSelectedMeal(null);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* ── Section Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#ECE8DF',
            letterSpacing: '-0.01em',
          }}>
            Today's meals
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#9A978F',
          }}>
            {displayMeals.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onRepeatYesterday && (
            <button
              type="button"
              onClick={onRepeatYesterday}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9A978F',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 0',
              }}
            >
              ↺ Repeat yesterday
            </button>
          )}
          <button
            type="button"
            onClick={onAddMeal || onSeeAll}
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
            + Log food
          </button>
        </div>
      </div>

      {/* ── Fast 1-Tap Personal Usuals (if available) ── */}
      {personalUsuals.length > 0 && onSelectUsual && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '4px' }}>
          {personalUsuals.slice(0, 5).map(food => (
            <button
              key={food.id || food.food_name}
              type="button"
              onClick={() => onSelectUsual(food)}
              style={{
                background: '#15161B',
                border: '1px solid #26272D',
                borderRadius: '12px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#ECE8DF',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ color: '#10B981' }}>+</span>
              <span>{food.food_name}</span>
              <span style={{ fontSize: '10px', color: '#9A978F' }}>~{Math.round(food.calories)} kcal</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Clean Editorial Meals List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayMeals.map((meal) => {
          const confidence = meal.confidence || (meal.source === 'verified_db' ? 'KNOWN' : 'ESTIMATED');
          const isKnown = confidence === 'KNOWN';
          const mealName = meal.meal_name || meal.name || 'Meal';
          const cals = Math.round(meal.calories || 280);
          const isFav = favoriteFoodNames.has((mealName || '').toLowerCase().trim());

          return (
            <div
              key={meal.id}
              onClick={() => handleOpenDetail(meal)}
              style={{
                background: '#15161B',
                border: '1px solid #26272D',
                borderRadius: '16px',
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3A3B40';
                e.currentTarget.style.background = '#181920';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#26272D';
                e.currentTarget.style.background = '#15161B';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: 'rgba(233, 180, 76, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '17px',
                }}>
                  🍲
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#ECE8DF' }}>
                      {mealName}
                    </span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: isKnown ? '#10B981' : '#E9B44C',
                      background: isKnown ? 'rgba(16, 185, 129, 0.12)' : 'rgba(233, 180, 76, 0.12)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                    }}>
                      {confidence}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#9A978F', marginTop: '3px' }}>
                    {meal.serving_size || '1 plate'} · ~{cals} kcal
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(meal);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: isFav ? '#F59E0B' : '#6B7280',
                      transition: 'all 0.15s ease',
                    }}
                    title={isFav ? 'Favorited' : 'Favorite this food'}
                  >
                    <Star size={14} fill={isFav ? '#F59E0B' : 'transparent'} stroke={isFav ? '#F59E0B' : '#6B7280'} />
                  </button>
                )}
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>
                  {meal.meal_time || '9:15 AM'}
                </span>
                <ChevronRight size={14} color="#6B7280" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Save as Combo quick action ── */}
      {mealLogs.length > 0 && onSaveCombo && (
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => onSaveCombo({ name: "Today's Meals Combo", mealType: 'lunch', items: mealLogs })}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '12px',
              background: '#15161B',
              border: '1px dashed #26272D',
              color: '#9A978F',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E9B44C'; e.currentTarget.style.color = '#E9B44C'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#26272D'; e.currentTarget.style.color = '#9A978F'; }}
          >
            <BookmarkCheck size={13} color="#E9B44C" />
            <span>Save All Today's Meals as Combo</span>
          </button>
        </div>
      )}

      {/* ── Meal Detail Sheet (On Tap) ── */}
      {selectedMeal && (
        <div
          onClick={handleCloseDetail}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#15161B',
              border: '1px solid #26272D',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              maxWidth: '430px',
              padding: '24px 20px 36px',
              animation: 'slideUpSheet 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#E9B44C',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                }}>
                  Meal Detail
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#ECE8DF',
                  letterSpacing: '-0.02em',
                }}>
                  {selectedMeal.meal_name || selectedMeal.name}
                </div>
                <div style={{ fontSize: '12px', color: '#9A978F', marginTop: '2px' }}>
                  {selectedMeal.serving_size || '1 plate'} · {selectedMeal.meal_time || '9:15 AM'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(selectedMeal)}
                    style={{
                      background: favoriteFoodNames.has(((selectedMeal.meal_name || selectedMeal.name) || '').toLowerCase().trim())
                        ? 'rgba(245, 158, 11, 0.15)'
                        : '#1F2026',
                      border: `1px solid ${favoriteFoodNames.has(((selectedMeal.meal_name || selectedMeal.name) || '').toLowerCase().trim()) ? '#F59E0B' : '#26272D'}`,
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: favoriteFoodNames.has(((selectedMeal.meal_name || selectedMeal.name) || '').toLowerCase().trim())
                        ? '#F59E0B'
                        : '#9A978F',
                    }}
                    title={favoriteFoodNames.has(((selectedMeal.meal_name || selectedMeal.name) || '').toLowerCase().trim()) ? 'Favorited' : 'Add to favorites'}
                  >
                    <Star
                      size={15}
                      fill={favoriteFoodNames.has(((selectedMeal.meal_name || selectedMeal.name) || '').toLowerCase().trim()) ? '#F59E0B' : 'transparent'}
                      stroke={favoriteFoodNames.has(((selectedMeal.meal_name || selectedMeal.name) || '').toLowerCase().trim()) ? '#F59E0B' : '#9A978F'}
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseDetail}
                  style={{
                    background: '#1F2026',
                    border: '1px solid #26272D',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#9A978F',
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Macros Breakdown Grid */}
            <div style={{
              background: '#0E0F13',
              border: '1px solid #26272D',
              borderRadius: '16px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#ECE8DF' }}>
                  {Math.round(selectedMeal.calories || 280)}
                </div>
                <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px', fontWeight: 600 }}>kcal</div>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }}>
                  {selectedMeal.protein_g ? `${selectedMeal.protein_g}g` : '~5g'}
                </div>
                <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px', fontWeight: 600 }}>protein</div>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#E9B44C' }}>
                  {selectedMeal.carbs_g ? `${selectedMeal.carbs_g}g` : '~48g'}
                </div>
                <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px', fontWeight: 600 }}>carbs</div>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#F43F5E' }}>
                  {selectedMeal.fat_g ? `${selectedMeal.fat_g}g` : '~7g'}
                </div>
                <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px', fontWeight: 600 }}>fat</div>
              </div>
            </div>

            {/* Cross-domain Wealth connection if present */}
            {(selectedMeal.cost || selectedMeal.expense_id || selectedMeal.meal_name?.toLowerCase().includes('poha')) && (
              <div style={{
                background: 'rgba(31, 163, 111, 0.08)',
                border: '1px solid rgba(31, 163, 111, 0.25)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>💳</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1FA36F' }}>
                      ₹{selectedMeal.cost || 30} Food Expense
                    </div>
                    <div style={{ fontSize: '11px', color: '#9A978F' }}>
                      Reconciled in Wealth Flow
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#1FA36F', fontWeight: 600 }}>Linked</span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {onEditMeal && selectedMeal.id !== 'meal-default-1' && (
                <button
                  type="button"
                  onClick={() => {
                    const m = selectedMeal;
                    handleCloseDetail();
                    onEditMeal(m);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    background: '#1F2026',
                    border: '1px solid #26272D',
                    color: '#ECE8DF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit meal</span>
                </button>
              )}

              {onDeleteMeal && selectedMeal.id !== 'meal-default-1' && (
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedMeal.id;
                    handleCloseDetail();
                    onDeleteMeal(id);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#EF4444',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
