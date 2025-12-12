import { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Sample names and locations for realistic social proof (fallback)
const firstNames = [
  'Sarah', 'Michael', 'Emma', 'James', 'Olivia', 'William', 'Sophia', 'Benjamin',
  'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Daniel',
  'Harper', 'Matthew', 'Evelyn', 'David', 'Abigail', 'Joseph', 'Emily', 'Samuel',
  'Madison', 'Christopher', 'Elizabeth', 'Andrew', 'Sofia', 'Joshua', 'Avery', 'Ryan'
];

const locations = [
  'New York, USA', 'London, UK', 'Toronto, Canada', 'Sydney, Australia',
  'Berlin, Germany', 'Paris, France', 'Amsterdam, Netherlands', 'Dubai, UAE',
  'Singapore', 'Tokyo, Japan', 'Los Angeles, USA', 'Chicago, USA',
  'Miami, USA', 'Seattle, USA', 'Austin, USA', 'Denver, USA',
  'Boston, USA', 'San Francisco, USA', 'Vancouver, Canada', 'Melbourne, Australia'
];

interface SignupData {
  name: string;
  location?: string;
  time: string;
  isReal: boolean;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return 'recently';
}

function generateRandomSignup(): SignupData {
  const timeOptions = ['just now', '2 minutes ago', '5 minutes ago', '8 minutes ago', '12 minutes ago'];
  return {
    name: firstNames[Math.floor(Math.random() * firstNames.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    time: timeOptions[Math.floor(Math.random() * timeOptions.length)],
    isReal: false
  };
}

export function SocialProofPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [signup, setSignup] = useState<SignupData | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [realSignups, setRealSignups] = useState<SignupData[]>([]);
  const [realSignupIndex, setRealSignupIndex] = useState(0);

  // Fetch recent real signups from the database
  useEffect(() => {
    const fetchRecentSignups = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const signups: SignupData[] = data
          .filter(profile => profile.full_name) // Only include profiles with names
          .map(profile => ({
            name: profile.full_name!.split(' ')[0], // Use first name only for privacy
            location: locations[Math.floor(Math.random() * locations.length)], // Random location for privacy
            time: getTimeAgo(new Date(profile.created_at)),
            isReal: true
          }));
        setRealSignups(signups);
      }
    };

    fetchRecentSignups();

    // Subscribe to real-time new signups
    const channel = supabase
      .channel('signup-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const newProfile = payload.new as { full_name?: string; created_at: string };
          if (newProfile.full_name) {
            const newSignup: SignupData = {
              name: newProfile.full_name.split(' ')[0],
              location: locations[Math.floor(Math.random() * locations.length)],
              time: 'just now',
              isReal: true
            };
            // Add to front of real signups and show immediately
            setRealSignups(prev => [newSignup, ...prev.slice(0, 9)]);
            setSignup(newSignup);
            setIsExiting(false);
            setIsVisible(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Initial delay before showing first popup (5-10 seconds)
    const initialDelay = Math.random() * 5000 + 5000;
    
    let showTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    const showPopup = () => {
      // Alternate between real and fake signups, prioritizing real ones
      let nextSignup: SignupData;
      
      if (realSignups.length > 0 && Math.random() > 0.3) {
        // 70% chance to show real signup if available
        nextSignup = realSignups[realSignupIndex % realSignups.length];
        setRealSignupIndex(prev => prev + 1);
      } else {
        // 30% chance or fallback to fake signup
        nextSignup = generateRandomSignup();
      }
      
      setSignup(nextSignup);
      setIsExiting(false);
      setIsVisible(true);
      
      // Hide after 4 seconds
      hideTimeout = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => setIsVisible(false), 300);
      }, 4000);
    };

    // Show first popup after initial delay
    showTimeout = setTimeout(() => {
      showPopup();
      
      // Then show every 15-25 seconds
      intervalId = setInterval(() => {
        showPopup();
      }, Math.random() * 10000 + 15000);
    }, initialDelay);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
      clearInterval(intervalId);
    };
  }, [realSignups, realSignupIndex]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible || !signup) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 max-w-sm bg-card border border-border rounded-lg shadow-lg p-4 transition-all duration-300",
        isExiting 
          ? "opacity-0 translate-y-2" 
          : "opacity-100 translate-y-0 animate-fade-in"
      )}
    >
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3 pr-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {signup.name}{signup.location ? ` from ${signup.location}` : ''}
          </p>
          <p className="text-sm text-muted-foreground">
            just signed up for ThreadPosts
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {signup.time}
          </p>
        </div>
      </div>
    </div>
  );
}
