/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import supabase from '../lib/supabase/index.js';

const SubscriptionContext = createContext(null);

export const TIERS = ['free', 'premium', 'elite'];
const normalizeTier = (t) => {
  const v = String(t ?? '').toLowerCase();
  return TIERS.includes(v) ? v : 'free';
};

export function SubscriptionProvider({ children }) {
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');

  const reqId = useRef(0);       // ignores out-of-order responses
  const lastUid = useRef(null);  // skips refetch on TOKEN_REFRESHED etc.

  const fetchSubscription = useCallback(async (uid) => {
    if (!uid) return;
    const id = ++reqId.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', uid)
        .maybeSingle();
      if (id !== reqId.current) return;
      if (error) throw error;
      setTier(normalizeTier(data?.subscription_tier));
      setError(null);
    } catch (e) {
      if (id !== reqId.current) return;
      console.warn('[Subscription] fetch failed:', e.message);
      setError(e); // keep last known tier, don't downgrade on a blip
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION itself, so no getSession() needed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (uid === lastUid.current) return;
      lastUid.current = uid;
      setUserId(uid);
      reqId.current++;           // invalidate in-flight fetches
      setTier('free');           // never show the previous user's tier
      setError(null);
      if (!uid) { setLoading(false); return; }
      setLoading(true);
      setTimeout(() => fetchSubscription(uid), 0); // avoid awaiting inside auth callback
    });
    return () => subscription.unsubscribe();
  }, [fetchSubscription]);

  // Upgrade the UI the moment the webhook updates the row (enable Realtime on profiles)
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`profile-tier-${userId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (p) => setTier(normalizeTier(p.new?.subscription_tier)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const triggerPaywall = useCallback((reason = '') => {
    setPaywallReason(reason);
    setShowPaywall(true);
  }, []);
  const closePaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallReason('');
  }, []);
  const refreshSubscription = useCallback(() => fetchSubscription(userId), [fetchSubscription, userId]);

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
      setTier(normalizeTier(newTier));
      return true;
    } catch (e) {
      console.error('[Subscription] Error updating subscription:', e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const value = useMemo(() => ({
    tier,
    isPremium: tier === 'premium' || tier === 'elite',
    isElite: tier === 'elite',
    loading,
    error,
    showPaywall,
    paywallReason,
    triggerPaywall,
    closePaywall,
    updateSubscription,
    refreshSubscription,
  }), [tier, loading, error, showPaywall, paywallReason,
    triggerPaywall, closePaywall, updateSubscription, refreshSubscription]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return ctx;
}