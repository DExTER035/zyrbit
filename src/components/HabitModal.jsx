import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { id: 'health', label: 'Health', color: 'bg-[#FF5252]', tx: 'text-[#FF5252]' },
  { id: 'learning', label: 'Learning', color: 'bg-[#00BCD4]', tx: 'text-[#00BCD4]' },
  { id: 'religious', label: 'Religious', color: 'bg-[#9C27B0]', tx: 'text-[#9C27B0]' },
  { id: 'fitness', label: 'Fitness', color: 'bg-[#4CAF50]', tx: 'text-[#4CAF50]' },
];

const ICONS = ['💧', '🏃‍♂️', '📚', '🙏', '💻', '🧘‍♀️', '🍎', '💤', '💊', '🎨', '🎸', '☀️'];

export default function HabitModal({ isOpen, onClose, habitToEdit, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('health');
  const [icon, setIcon] = useState('💧');
  const [frequency, setFrequency] = useState('daily');
  const [goal, setGoal] = useState('');

  useEffect(() => {
    if (habitToEdit) {
      setName(habitToEdit.name);
      setCategory(habitToEdit.category);
      setIcon(habitToEdit.icon);
      setFrequency(habitToEdit.frequency === 'daily' ? 'daily' : 'weekly');
      setGoal(habitToEdit.goal_value || '');
    } else {
      setName('');
      setCategory('health');
      setIcon('💧');
      setFrequency('daily');
      setGoal('');
    }
  }, [habitToEdit, isOpen]);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const catDef = CATEGORIES.find(c => c.id === category);
    const habitData = {
      user_id: user.id,
      name,
      category,
      color: catDef.tx,
      icon,
      frequency,
      goal_value: parseInt(goal) || 1
    };

    if (habitToEdit) {
      const { data, error } = await supabase.from('habits').update(habitData).eq('id', habitToEdit.id).select().single();
      if (!error) onSave(data);
    } else {
      const { data, error } = await supabase.from('habits').insert([habitData]).select().single();
      if (!error) onSave(data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (confirm('Delete this habit?')) {
      await supabase.from('habits').delete().eq('id', habitToEdit.id);
      onDelete(habitToEdit.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 overflow-hidden">
      <div className="bg-[#1a1a1a] w-full max-w-md rounded-t-3xl p-6 relative animate-[slideUp_0.3s_ease-out]">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-6">{habitToEdit ? 'Edit Habit' : 'New Habit'}</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Name</label>
            <input 
              value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#242424] border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-gray-500"
              placeholder="e.g. Drink Water"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex-1 py-1.5 text-xs sm:py-2 sm:text-sm rounded-lg font-medium transition-colors border ${
                    category === cat.id ? `border-current ${cat.tx} bg-[#242424]` : 'border-gray-700 text-gray-400 opacity-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map(i => (
                <button 
                  key={i} onClick={() => setIcon(i)}
                  className={`text-2xl pt-1 pb-2 rounded-xl border ${icon === i ? 'bg-[#242424] border-gray-500' : 'border-transparent opacity-50 hover:bg-[#242424]'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-1">Frequency</label>
              <select 
                value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full bg-[#242424] border border-gray-700 rounded-xl p-3 focus:outline-none appearance-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-1">Goal (Numeric)</label>
              <input 
                type="number" value={goal} onChange={e => setGoal(e.target.value)}
                className="w-full bg-[#242424] border border-gray-700 rounded-xl p-3 focus:outline-none"
                placeholder="e.g. 2"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            {habitToEdit && (
              <button 
                onClick={handleDelete}
                className="p-3.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={handleSave}
              className="flex-1 bg-white text-black font-semibold rounded-xl py-3.5 hover:bg-gray-200"
            >
              Save Habit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
