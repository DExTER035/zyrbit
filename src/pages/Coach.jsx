import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Loader2 } from 'lucide-react';

export default function Coach() {
  const [habits, setHabits] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [userMode, setUserMode] = useState('Student');
  const [userName, setUserName] = useState('');
  
  const [coachingText, setCoachingText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || 'Astronaut');
        fetchData(user.id);
      }
    });
  }, []);

  const fetchData = async (uid) => {
    const { data: aData } = await supabase.from('activity_log').select('*').eq('user_id', uid);
    const { data: hData } = await supabase.from('habits').select('*').eq('user_id', uid);
    const { data: sData } = await supabase.from('user_streaks').select('*').eq('user_id', uid);
    if (aData) setActivities(aData);
    if (hData) setHabits(hData);
    if (sData) setStreaks(sData);
  };

  const getCoaching = async (type = 'daily') => {
    setLoading(true);
    setCoachingText('');
    try {
      const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_KEY || GEMINI_KEY === 'your_gemini_api_key') {
        setCoachingText("Please set VITE_GEMINI_API_KEY in your .env file to activate the AI Coach. (This is a system message, not medical advice.)");
        setLoading(false);
        return;
      }

      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

      const systemPrompt = `You are an AI wellness coach inside Anti Gravity, a habit tracking app.
Give short, warm, motivational coaching based on user's habit data.
You are NOT a doctor. Never give medical diagnoses.
End every response with: "This is general wellness advice, not medical advice."
Keep responses under 100 words. Be friendly and encouraging. Focus heavily on streaks and momentum.`;

      const todayStr = new Date().toISOString().split('T')[0];
      const doneToday = activities.filter(a => a.completed_date === todayStr && a.status === 'completed').length;
      const maxStreak = Math.max(...streaks.map(s => s.longest_streak), 0);
      const curStreak = Math.max(...streaks.map(s => s.current_streak), 0);

      const userContext = `
        Name: ${userName}, Mode: ${userMode}
        Report Type: ${type}
        Total Habits tracked: ${habits.length}
        Habits Completed today: ${doneToday}/${habits.length}
        Longest streak ever: ${maxStreak} days
        Current max streak: ${curStreak} days
      `;

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Data:\n${userContext}` }] }]
        })
      });

      const data = await response.json();
      if(data.candidates && data.candidates[0].content.parts[0].text) {
        setCoachingText(data.candidates[0].content.parts[0].text);
      } else {
        setCoachingText("You're doing great! Keep building those habits! (This is general wellness advice, not medical advice.)");
      }
    } catch (e) {
      console.error(e);
      setCoachingText("Coach connection lost. Keep pushing your limits! (This is general wellness advice, not medical advice.)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col p-6 animate-fade-in pb-24 relative overflow-hidden">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2 pt-4">
        <Sparkles className="w-8 h-8 text-[#9C27B0]" /> AI Coach
      </h1>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => getCoaching('daily')}
          disabled={loading}
          className="flex-1 bg-white text-black font-semibold rounded-2xl py-4 hover:bg-gray-200 active:scale-95 transition-all text-sm"
        >
          Daily Check-in
        </button>
        <button 
          onClick={() => getCoaching('weekly')}
          disabled={loading}
          className="flex-1 bg-[#242424] border border-gray-700 text-white font-semibold rounded-2xl py-4 hover:bg-[#2a2a2a] active:scale-95 transition-all text-sm"
        >
          Weekly Summary
        </button>
      </div>

      <div className="flex-1 bg-gradient-to-br from-[#1a1a1a] to-[#121212] border border-gray-800 rounded-3xl p-6 relative flex flex-col items-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#9C27B0]" />
            <p className="font-medium">Synthesizing telemetry...</p>
          </div>
        ) : coachingText ? (
          <div className="text-gray-200 text-base sm:text-lg leading-relaxed whitespace-pre-wrap animate-slideUp text-center w-full my-auto italic">
            "{coachingText}"
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
            <Sparkles className="w-16 h-16 mb-6 opacity-30 text-[#9C27B0]" />
            <p className="max-w-[200px] leading-relaxed">Tap a button above to run your personalized AI coaching diagnostic.</p>
          </div>
        )}
      </div>
    </div>
  );
}
