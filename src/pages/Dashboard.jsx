import React, { useState, useEffect } from 'react';
import { User, Plus, Check, SkipForward, Undo2 } from 'lucide-react';
import HabitModal from '../components/HabitModal';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { id: 'today', label: 'Today', color: 'text-white' },
  { id: 'health', label: 'Health', color: 'text-[#FF5252]', bg: 'bg-[#FF5252]' },
  { id: 'learning', label: 'Learning', color: 'text-[#00BCD4]', bg: 'bg-[#00BCD4]' },
  { id: 'religious', label: 'Religious', color: 'text-[#9C27B0]', bg: 'bg-[#9C27B0]' },
  { id: 'fitness', label: 'Fitness', color: 'text-[#4CAF50]', bg: 'bg-[#4CAF50]' },
];

export default function Dashboard() {
  const [activeCategory, setActiveCategory] = useState('today');
  const [userMode, setUserMode] = useState('🎓 Student');
  const [habits, setHabits] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [activities, setActivities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [userId, setUserId] = useState(null);
  const [undoLog, setUndoLog] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchData(user.id);
      }
    });

    const sub = supabase.channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_streaks' }, payload => {
        setStreaks(prev => ({ ...prev, [payload.new.habit_id]: payload.new.current_streak }));
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  const fetchData = async (uid) => {
    const { data: hData } = await supabase.from('habits').select('*').eq('user_id', uid);
    if (hData) setHabits(hData);

    const { data: sData } = await supabase.from('user_streaks').select('*').eq('user_id', uid);
    if (sData) {
      const streakMap = {};
      sData.forEach(s => streakMap[s.habit_id] = s.current_streak);
      setStreaks(streakMap);
    }

    const { data: aData } = await supabase.from('activity_log').select('*').eq('user_id', uid);
    if (aData) setActivities(aData);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const handleComplete = async (habit, status = 'completed') => {
    const logEntry = {
      habit_id: habit.id,
      user_id: userId,
      completed_date: todayStr,
      status: status
    };
    
    const existing = activities.find(a => a.habit_id === habit.id && a.completed_date === todayStr);
    if (existing) return;

    // Optimistic Update
    setActivities(prev => [...prev, { ...logEntry, id: 'temp-'+Date.now() }]);

    const btn = document.getElementById('btn-'+habit.id);
    if (btn) {
      btn.style.transform = 'scale(1.2)';
      setTimeout(() => btn.style.transform = 'scale(1)', 150);
    }

    const { data } = await supabase.from('activity_log').insert([logEntry]).select().single();
    if (data) {
      setActivities(prev => prev.map(a => a.habit_id === habit.id && a.completed_date === todayStr ? data : a));
      setUndoLog(data);
      setTimeout(() => setUndoLog(current => current?.id === data.id ? null : current), 5000);
    }
  };

  const handleUndo = async () => {
    if (!undoLog) return;
    await supabase.from('activity_log').delete().eq('id', undoLog.id);
    setActivities(prev => prev.filter(a => a.id !== undoLog.id));
    setUndoLog(null);
    fetchData(userId); // Sync streaks again
  };

  const filteredHabits = activeCategory === 'today' 
    ? habits 
    : habits.filter(h => h.category === activeCategory);

  return (
    <div className="h-full w-full flex flex-col pb-20 relative animate-fade-in">
      <header className="px-6 pt-10 pb-4 flex justify-between items-center bg-gradient-to-b from-[#1a1a1a] to-transparent">
        <h1 className="text-2xl font-bold tracking-tight">Anti Gravity</h1>
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
          <User className="w-5 h-5 text-gray-400" />
        </div>
      </header>

      <div className="px-6 mb-6 flex justify-between items-center">
        <select 
          value={userMode} 
          onChange={(e) => setUserMode(e.target.value)}
          className="bg-[#1f1f1f] border border-gray-800 text-sm rounded-lg py-2 px-3 w-max appearance-none focus:outline-none"
        >
          <option>🎓 Student</option>
          <option>💼 Professional</option>
          <option>💪 Fitness</option>
        </select>
        
        {undoLog && (
          <button onClick={handleUndo} className="flex items-center gap-1 text-sm bg-gray-800 px-3 py-1.5 rounded-full text-gray-300 animate-fade-in hover:bg-gray-700">
            <Undo2 className="w-4 h-4" /> Undo
          </button>
        )}
      </div>

      <div className="overflow-x-auto no-scrollbar px-6 mb-6">
        <div className="flex gap-4 min-w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeCategory === cat.id 
                  ? `border-current ${cat.color}` 
                  : 'border-transparent text-gray-500 hover:text-gray-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 flex-1 overflow-y-auto space-y-4">
        {filteredHabits.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            No habits yet.<br/>Tap + to add one!
          </div>
        )}

        {filteredHabits.map(habit => {
          const catDef = CATEGORIES.find(c => c.id === habit.category) || CATEGORIES[1];
          const habitActivities = activities.filter(a => a.habit_id === habit.id);
          const isDoneToday = habitActivities.some(a => a.completed_date === todayStr && a.status === 'completed');
          const isSkippedToday = habitActivities.some(a => a.completed_date === todayStr && a.status === 'skipped');
          const currentStreak = streaks[habit.id] || 0;
          
          const historyMap = {};
          habitActivities.forEach(a => { if(a.status === 'completed') historyMap[a.completed_date] = true; });
          
          const past30Days = Array.from({length: 30}).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return historyMap[d.toISOString().split('T')[0]] || false;
          });

          return (
            <div key={habit.id} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4 transition-transform active:scale-[0.98]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => { setEditHabit(habit); setIsModalOpen(true); }}>
                  <div className={`w-12 h-12 rounded-xl bg-[#242424] flex items-center justify-center text-2xl`}>
                    {habit.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{habit.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-orange-500 text-sm">🔥</span>
                      <span className="text-sm text-gray-400 font-medium">{currentStreak} day streak</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!isDoneToday && !isSkippedToday && (
                    <button onClick={() => handleComplete(habit, 'skipped')} className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-800 text-gray-500 hover:border-gray-600 transition-colors">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    id={`btn-${habit.id}`}
                    onClick={() => handleComplete(habit, 'completed')}
                    disabled={isDoneToday}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                      isDoneToday 
                        ? `${catDef.bg} border-transparent bg-opacity-100 text-[#121212]` 
                        : `border-gray-700 hover:border-current ${catDef.color} text-transparent hover:text-current`
                    }`}
                  >
                    <Check className="w-5 h-5 absolute" />
                  </button>
                </div>
              </div>

              {/* Heatmap Dots */}
              <div className="grid grid-cols-10 grid-rows-3 gap-1.5 mt-4">
                {past30Days.map((done, i) => (
                  <div 
                    key={i} 
                    className={`h-2.5 rounded-sm transition-colors ${done ? catDef.bg : 'bg-[#2a2a2a]'}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => { setEditHabit(null); setIsModalOpen(true); }} className="fixed bottom-6 right-6 w-14 h-14 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center hover:scale-105 transition-transform z-40">
        <Plus className="w-6 h-6" />
      </button>

      <HabitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        habitToEdit={editHabit} 
        onSave={(data) => {
          if(editHabit) setHabits(prev => prev.map(h => h.id === data.id ? data : h));
          else setHabits(prev => [...prev, data]);
        }}
        onDelete={(id) => setHabits(prev => prev.filter(h => h.id !== id))}
      />
    </div>
  );
}
