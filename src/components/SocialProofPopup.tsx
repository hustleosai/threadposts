import { useState, useEffect } from 'react';
import { X, UserPlus, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Region-specific names for realistic social proof
const namesByRegion: Record<string, string[]> = {
  'USA': ['Sarah', 'Michael', 'Emma', 'James', 'Olivia', 'William', 'Sophia', 'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Daniel', 'Harper', 'Matthew', 'Evelyn', 'David'],
  'UK': ['Oliver', 'George', 'Harry', 'Jack', 'Charlie', 'Thomas', 'Oscar', 'William', 'Emily', 'Poppy', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Amelia', 'Jessica', 'Lily', 'Sophie', 'Grace', 'Evie'],
  'Canada': ['Liam', 'Noah', 'Oliver', 'William', 'Benjamin', 'Lucas', 'Emma', 'Olivia', 'Charlotte', 'Amelia', 'Sophia', 'Ava', 'Mia', 'Isabella', 'Evelyn', 'Harper', 'Camila', 'Aria', 'Luna', 'Chloe'],
  'Australia': ['Oliver', 'William', 'Jack', 'Noah', 'Thomas', 'James', 'Leo', 'Charlie', 'Charlotte', 'Olivia', 'Mia', 'Amelia', 'Isla', 'Ava', 'Grace', 'Willow', 'Chloe', 'Harper', 'Ella', 'Sophie'],
  'Germany': ['Ben', 'Leon', 'Paul', 'Finn', 'Elias', 'Felix', 'Noah', 'Luis', 'Emma', 'Mia', 'Hannah', 'Sofia', 'Anna', 'Emilia', 'Marie', 'Lena', 'Leonie', 'Lea', 'Johanna', 'Clara'],
  'France': ['Gabriel', 'Léo', 'Raphaël', 'Arthur', 'Louis', 'Lucas', 'Adam', 'Jules', 'Emma', 'Louise', 'Jade', 'Alice', 'Chloé', 'Lina', 'Mila', 'Léa', 'Manon', 'Rose', 'Anna', 'Inès'],
  'Netherlands': ['Noah', 'Sem', 'Liam', 'Lucas', 'Daan', 'Finn', 'Levi', 'Luuk', 'Emma', 'Julia', 'Mila', 'Tessa', 'Sophie', 'Zoë', 'Sara', 'Anna', 'Noor', 'Saar', 'Lotte', 'Eva'],
  'UAE': ['Mohammed', 'Ahmed', 'Ali', 'Omar', 'Khalid', 'Rashid', 'Hassan', 'Youssef', 'Fatima', 'Maryam', 'Aisha', 'Sara', 'Layla', 'Noor', 'Hana', 'Zara', 'Amira', 'Dana', 'Reem', 'Lina'],
  'Singapore': ['Ryan', 'Ethan', 'Lucas', 'Jayden', 'Caleb', 'Dylan', 'Ian', 'Asher', 'Chloe', 'Sophie', 'Emma', 'Olivia', 'Charlotte', 'Mia', 'Emily', 'Zoe', 'Ava', 'Isla', 'Grace', 'Amelia'],
  'Japan': ['Haruto', 'Yuto', 'Sota', 'Yuki', 'Hayato', 'Haruki', 'Ryusei', 'Kota', 'Himari', 'Hina', 'Yua', 'Sakura', 'Ichika', 'Akari', 'Sara', 'Yui', 'Rio', 'Mio', 'Koharu', 'Mei'],
  'Default': ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Sam', 'Jamie', 'Avery', 'Quinn', 'Skyler', 'Peyton', 'Hayden', 'Emery', 'Finley', 'Reese', 'Rowan', 'Eden', 'Blake', 'Sage']
};

const locationsByRegion: Record<string, string[]> = {
  'USA': ['New York, USA', 'Los Angeles, USA', 'Chicago, USA', 'Miami, USA', 'Seattle, USA', 'Austin, USA', 'Denver, USA', 'Boston, USA', 'San Francisco, USA', 'Phoenix, USA'],
  'UK': ['London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK', 'Bristol, UK', 'Liverpool, UK', 'Leeds, UK', 'Glasgow, UK'],
  'Canada': ['Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Calgary, Canada', 'Ottawa, Canada', 'Edmonton, Canada'],
  'Australia': ['Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia', 'Adelaide, Australia'],
  'Germany': ['Berlin, Germany', 'Munich, Germany', 'Hamburg, Germany', 'Frankfurt, Germany', 'Cologne, Germany'],
  'France': ['Paris, France', 'Lyon, France', 'Marseille, France', 'Toulouse, France', 'Nice, France'],
  'Netherlands': ['Amsterdam, Netherlands', 'Rotterdam, Netherlands', 'The Hague, Netherlands', 'Utrecht, Netherlands'],
  'UAE': ['Dubai, UAE', 'Abu Dhabi, UAE', 'Sharjah, UAE'],
  'Singapore': ['Singapore'],
  'Japan': ['Tokyo, Japan', 'Osaka, Japan', 'Kyoto, Japan', 'Yokohama, Japan', 'Nagoya, Japan']
};

// Get region from location string
function getRegionFromLocation(location: string): string {
  if (location.includes('USA')) return 'USA';
  if (location.includes('UK')) return 'UK';
  if (location.includes('Canada')) return 'Canada';
  if (location.includes('Australia')) return 'Australia';
  if (location.includes('Germany')) return 'Germany';
  if (location.includes('France')) return 'France';
  if (location.includes('Netherlands')) return 'Netherlands';
  if (location.includes('UAE')) return 'UAE';
  if (location.includes('Singapore')) return 'Singapore';
  if (location.includes('Japan')) return 'Japan';
  return 'Default';
}

interface SignupData {
  name: string;
  location: string;
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
  // Pick a random region
  const regions = Object.keys(locationsByRegion);
  const randomRegion = regions[Math.floor(Math.random() * regions.length)];
  const locations = locationsByRegion[randomRegion];
  const names = namesByRegion[randomRegion] || namesByRegion['Default'];
  
  const timeOptions = ['just now', '2 minutes ago', '5 minutes ago', '8 minutes ago', '12 minutes ago'];
  
  return {
    name: names[Math.floor(Math.random() * names.length)],
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
        .select('full_name, created_at, location')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const signups: SignupData[] = data
          .filter(profile => profile.full_name)
          .map(profile => {
            // Use real location if available, otherwise generate region-appropriate one
            const location = profile.location || generateRandomSignup().location;
            return {
              name: profile.full_name!.split(' ')[0],
              location,
              time: getTimeAgo(new Date(profile.created_at)),
              isReal: true
            };
          });
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
          const newProfile = payload.new as { full_name?: string; created_at: string; location?: string };
          if (newProfile.full_name) {
            const newSignup: SignupData = {
              name: newProfile.full_name.split(' ')[0],
              location: newProfile.location || generateRandomSignup().location,
              time: 'just now',
              isReal: true
            };
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
    const initialDelay = Math.random() * 5000 + 5000;
    
    let showTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    const showPopup = () => {
      let nextSignup: SignupData;
      
      if (realSignups.length > 0 && Math.random() > 0.3) {
        nextSignup = realSignups[realSignupIndex % realSignups.length];
        setRealSignupIndex(prev => prev + 1);
      } else {
        nextSignup = generateRandomSignup();
      }
      
      setSignup(nextSignup);
      setIsExiting(false);
      setIsVisible(true);
      
      hideTimeout = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => setIsVisible(false), 300);
      }, 4000);
    };

    showTimeout = setTimeout(() => {
      showPopup();
      
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
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground">
              {signup.name} from {signup.location}
            </p>
            {signup.isReal && (
              <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>
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
