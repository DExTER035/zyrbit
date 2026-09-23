/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase/index.js';

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
        .maybeSingle();
      
      if (error) {
        // Safe default if subscription_tier column does not exist in schema yet
        const isMissingColumn =
          error.code === 'PGRST204' ||
          error.code === 'PGRST205' ||
          error.message?.includes('subscription_tier');

        if (isMissingColumn) {
          setTier('free');
          return;
        }
        // Unrelated database or network error: report for diagnostics
        throw error;
      }
      
      setTier(data?.subscription_tier || 'free');
    } catch (e) {
      console.warn('[Subscription] Error fetching subscription tier:', e.message);
      setTier('free');
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

  // Update subscription in database (server authoritative)
  const updateSubscription = useCallback(async (newTier) => {
    if (!userId) return false;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: newTier })
        .eq('id', userId);
      
      if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('subscription_tier')) {
          console.warn('[Subscription] Cannot persist subscription: subscription_tier column pending migration.');
          return false;
        }
        throw error;
      }
      
      setTier(newTier);
      return true;
    } catch (e) {
      console.error('[Subscription] Error updating subscription:', e.message);
      return false;
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
