import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useVisitorTracking = () => {
  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Get current page path
        const pagePath = window.location.pathname;
        const userAgent = navigator.userAgent;

        // Call the edge function to track the visit
        await supabase.functions.invoke('track-visit', {
          body: {
            page_path: pagePath,
            user_agent: userAgent,
          },
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience for analytics
        console.debug('Visit tracking failed:', error);
      }
    };

    trackVisit();
  }, []);
};
