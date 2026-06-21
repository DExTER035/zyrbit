import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useHabitReminders(userId) {
  const timeoutsRef = useRef({});

  useEffect(() => {
    if (!userId) {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
      return;
    }

    const scheduleReminders = async () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};

      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const { data: habits, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('reminder_enabled', true);

      if (error || !habits) return;

      const now = new Date();

      habits.forEach(habit => {
        if (!habit.reminder_time) return;

        const [hours, minutes] = habit.reminder_time.split(':').map(Number);
        const target = new Date();
        target.setHours(hours, minutes, 0, 0);

        if (target.getTime() <= now.getTime()) {
          target.setDate(target.getDate() + 1);
        }

        const delay = target.getTime() - now.getTime();

        const triggerNotification = async () => {
          try {
            const checkDate = new Date().toLocaleDateString('en-CA');
            const { data: logs } = await supabase
              .from('activity_log')
              .select('*')
              .eq('habit_id', habit.id)
              .eq('completed_date', checkDate)
              .eq('status', 'completed')
              .limit(1);

            if (!logs || logs.length === 0) {
              new Notification(`Habit: ${habit.icon || '🪐'} ${habit.name}`, {
                body: `Time to complete your habit!`,
                icon: '/favicon.svg'
              });
            }
          } catch (e) {
            console.error('Habit notification error:', e);
          }

          timeoutsRef.current[habit.id] = setTimeout(triggerNotification, 24 * 60 * 60 * 1000);
        };

        timeoutsRef.current[habit.id] = setTimeout(triggerNotification, delay);
      });
    };

    scheduleReminders();

    const channel = supabase
      .channel('habits-reminders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => {
        scheduleReminders();
      })
      .subscribe();

    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
