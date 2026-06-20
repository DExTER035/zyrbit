import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase.js';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [tier, setTier] = useState('free'); // 'free' | 'premium' | 'elite'
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');

  const fetchSubscription = useCallback(async (uid) => {
    if (!uid) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', uid)
        .single();
      
      if (error) throw error;
      if (data) {
        setTier(data.subscription_tier || 'free');
      }
    } catch (e) {
      console.error('Error fetching subscription:', e);
      // Fallback to local storage if offline/placeholder client
      const savedTier = localStorage.getItem(`zyrbit_sub_tier_${uid}`);
      if (savedTier) {
        setTier(savedTier);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) fetchSubscription(uid);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) fetchSubscription(uid);
      else {
        setTier('free');
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchSubscription]);

  const triggerPaywall = useCallback((reason = '') => {
    setPaywallReason(reason);
    setShowPaywall(true);
  }, []);

  const closePaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallReason('');
  }, []);

  // Update subscription in database (and sync with local storage)
  const updateSubscription = useCallback(async (newTier) => {
    if (!userId) return false;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: newTier })
        .eq('id', userId);
      
      if (error) throw error;
      
      setTier(newTier);
      localStorage.setItem(`zyrbit_sub_tier_${userId}`, newTier);
      return true;
    } catch (e) {
      console.error('Error updating subscription:', e);
      // Simulating update in local storage for placeholder/local-only setups
      setTier(newTier);
      localStorage.setItem(`zyrbit_sub_tier_${userId}`, newTier);
      return true;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const isPremium = tier === 'premium' || tier === 'elite';
  const isElite = tier === 'elite';

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isPremium,
        isElite,
        loading,
        showPaywall,
        paywallReason,
        triggerPaywall,
        closePaywall,
        updateSubscription,
        refreshSubscription: () => fetchSubscription(userId)
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
