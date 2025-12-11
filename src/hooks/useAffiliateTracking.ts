import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AFFILIATE_STORAGE_KEY = 'threadposts_affiliate_id';

export function useAffiliateTracking() {
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for referral code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      trackReferral(refCode);
    } else {
      // Check localStorage for existing affiliate
      const storedAffiliateId = localStorage.getItem(AFFILIATE_STORAGE_KEY);
      if (storedAffiliateId) {
        setAffiliateId(storedAffiliateId);
      }
    }
  }, []);

  const trackReferral = async (referralCode: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-referral`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            referral_code: referralCode,
            source: document.referrer || 'direct'
          }),
        }
      );

      const data = await response.json();
      
      if (data.success && data.affiliate_id) {
        // Store affiliate ID in localStorage for checkout attribution
        localStorage.setItem(AFFILIATE_STORAGE_KEY, data.affiliate_id);
        setAffiliateId(data.affiliate_id);
        console.log('Referral tracked:', data.affiliate_id);
      }
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  const getAffiliateId = () => {
    return affiliateId || localStorage.getItem(AFFILIATE_STORAGE_KEY);
  };

  const clearAffiliateId = () => {
    localStorage.removeItem(AFFILIATE_STORAGE_KEY);
    setAffiliateId(null);
  };

  return { affiliateId, getAffiliateId, clearAffiliateId };
}
