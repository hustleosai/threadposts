import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  RefreshCw, 
  Heart,
  Twitter,
  Linkedin,
  MessageCircle,
  Crown,
  CreditCard,
  Lock,
  Zap
} from 'lucide-react';

const FREE_GENERATION_LIMIT = 3;

const platforms = [
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'facebook', label: 'Facebook', icon: MessageCircle },
  { value: 'threads', label: 'Threads', icon: Sparkles },
];

const quickTopics = [
  'Productivity tips for entrepreneurs',
  'AI and the future of work',
  'Building a personal brand',
  'Lessons from successful founders',
  'Remote work best practices',
  'Investment strategies for beginners'
];

export default function Dashboard() {
  const { user, session, subscribed, checkSubscription, checkingSubscription } = useAuth();
  const { getAffiliateId, clearAffiliateId } = useAffiliateTracking();
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('twitter');
  const [generatedThread, setGeneratedThread] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  const remainingGenerations = Math.max(0, FREE_GENERATION_LIMIT - generationCount);
  const hasReachedLimit = !subscribed && generationCount >= FREE_GENERATION_LIMIT;

  // Fetch generation count
  useEffect(() => {
    async function fetchGenerationCount() {
      if (!user?.id) return;
      
      try {
        const { count, error } = await supabase
          .from('thread_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) throw error;
        setGenerationCount(count || 0);
      } catch (error) {
        console.error('Error fetching generation count:', error);
      } finally {
        setLoadingCount(false);
      }
    }

    fetchGenerationCount();
  }, [user?.id]);

  // Check for successful checkout
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Subscription activated! Welcome to ThreadPosts Pro!');
      checkSubscription();
      // Clear affiliate attribution after successful checkout
      clearAffiliateId();
    } else if (checkout === 'canceled') {
      toast.info('Checkout canceled');
    }
  }, [searchParams, checkSubscription, clearAffiliateId]);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const affiliateId = getAffiliateId();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: affiliateId ? { affiliate_id: affiliateId } : undefined,
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setPortalLoading(false);
    }
  };

  const generateThread = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    // Check generation limit for non-subscribers
    if (!subscribed && generationCount >= FREE_GENERATION_LIMIT) {
      toast.error('You have reached your free generation limit. Upgrade to Pro for unlimited generations!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thread`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ topic, platform }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate thread');
      }

      setGeneratedThread(data.content);
      toast.success('Thread generated successfully!');

      // Save to history and update count
      await supabase.from('thread_history').insert({
        user_id: user?.id,
        topic,
        platform: platform as 'twitter' | 'linkedin' | 'facebook' | 'threads',
        content: data.content,
      });

      // Update generation count
      setGenerationCount(prev => prev + 1);
    } catch (error) {
      console.error('Error generating thread:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate thread');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedThread);
    toast.success('Copied to clipboard!');
  };

  const saveAsFavorite = async () => {
    if (!generatedThread) return;
    
    try {
      // Update the most recent history entry to be a favorite
      const { data: history } = await supabase
        .from('thread_history')
        .select('id')
        .eq('user_id', user?.id)
        .eq('content', generatedThread)
        .order('created_at', { ascending: false })
        .limit(1);

      if (history && history[0]) {
        await supabase
          .from('thread_history')
          .update({ is_favorite: true })
          .eq('id', history[0].id);
        toast.success('Saved to favorites!');
      }
    } catch (error) {
      toast.error('Failed to save favorite');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Paywall - Limit Reached */}
        {hasReachedLimit && !checkingSubscription && (
          <Card className="bg-gradient-to-r from-destructive/10 to-orange-500/10 border-destructive/30">
            <CardContent className="py-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <Lock className="h-10 w-10 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Free Limit Reached</h3>
                  <p className="text-muted-foreground max-w-md">
                    You've used all {FREE_GENERATION_LIMIT} free thread generations. 
                    Upgrade to Pro for unlimited AI-powered threads!
                  </p>
                </div>
                <Button 
                  onClick={handleSubscribe} 
                  disabled={checkoutLoading}
                  size="lg"
                  className="gradient-primary mt-2"
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Upgrade to Pro - $5/month
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Free Tier Usage Counter */}
        {!subscribed && !hasReachedLimit && !checkingSubscription && !loadingCount && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Zap className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">Free Generations</h3>
                      <span className="text-sm font-medium text-primary">
                        {remainingGenerations} of {FREE_GENERATION_LIMIT} remaining
                      </span>
                    </div>
                    <Progress 
                      value={(remainingGenerations / FREE_GENERATION_LIMIT) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSubscribe} 
                  disabled={checkoutLoading}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Go Unlimited
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pro Member Banner */}
        {subscribed && (
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/20">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-green-500">Pro Member</h3>
                  <p className="text-sm text-muted-foreground">Unlimited AI thread generation</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        )}

        <div>
          <h1 className="text-3xl font-display font-bold mb-2">AI Thread Generator</h1>
          <p className="text-muted-foreground">Create viral threads for any platform in seconds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate Thread
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <p.icon className="h-4 w-4" />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic or Idea</label>
                <Textarea
                  placeholder="Enter your topic, idea, or what you want to talk about..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Quick Topics</label>
                <div className="flex flex-wrap gap-2">
                  {quickTopics.map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setTopic(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              {hasReachedLimit ? (
                <Button 
                  onClick={handleSubscribe} 
                  disabled={checkoutLoading}
                  className="w-full bg-destructive hover:bg-destructive/90"
                  size="lg"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      Upgrade to Generate More
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={generateThread} 
                  disabled={loading}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate Thread
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Generated Thread</span>
                {generatedThread && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={saveAsFavorite}>
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={generateThread} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedThread ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-secondary/30 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                  {generatedThread}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your generated thread will appear here</p>
                  <p className="text-sm mt-2">Enter a topic and click Generate to start</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
