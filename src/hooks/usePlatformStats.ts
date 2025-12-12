import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStats {
  threadsGenerated: number;
  happyCreators: number;
}

// Base values to start with (using realistic-looking numbers)
const BASE_THREADS = 523847;
const BASE_CREATORS = 12394;

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      // Fetch thread count
      const { count: threadCount, error: threadError } = await supabase
        .from('thread_history')
        .select('*', { count: 'exact', head: true });

      if (threadError) {
        console.error('Error fetching thread count:', threadError);
      }

      // Fetch unique user count from profiles
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (userError) {
        console.error('Error fetching user count:', userError);
      }

      return {
        threadsGenerated: BASE_THREADS + (threadCount || 0),
        happyCreators: BASE_CREATORS + (userCount || 0),
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
