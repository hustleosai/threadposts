import { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample names and locations for realistic social proof
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

const timeAgo = [
  'just now', '2 minutes ago', '5 minutes ago', '8 minutes ago', '12 minutes ago'
];

interface SignupData {
  name: string;
  location: string;
  time: string;
}

function generateRandomSignup(): SignupData {
  return {
    name: firstNames[Math.floor(Math.random() * firstNames.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    time: timeAgo[Math.floor(Math.random() * timeAgo.length)]
  };
}

export function SocialProofPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [signup, setSignup] = useState<SignupData | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Initial delay before showing first popup (5-10 seconds)
    const initialDelay = Math.random() * 5000 + 5000;
    
    let showTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    const showPopup = () => {
      setSignup(generateRandomSignup());
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
  }, []);

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
            {signup.name} from {signup.location}
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
