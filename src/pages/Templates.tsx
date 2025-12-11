import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Layout, Star, Copy, Twitter, Linkedin, MessageCircle, Sparkles, Lock, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Template {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  engagement_score: number | null;
  platforms: string[] | null;
}

const categoryColors: Record<string, string> = {
  business: 'bg-blue-500/20 text-blue-400',
  motivation: 'bg-yellow-500/20 text-yellow-400',
  education: 'bg-green-500/20 text-green-400',
  storytelling: 'bg-purple-500/20 text-purple-400',
  marketing: 'bg-pink-500/20 text-pink-400',
  personal: 'bg-orange-500/20 text-orange-400',
  tech: 'bg-cyan-500/20 text-cyan-400',
};

const platformIcons: Record<string, React.ElementType> = {
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: MessageCircle,
  threads: Sparkles,
};

// Sample templates for demo
const sampleTemplates: Template[] = [
  {
    id: '1',
    title: 'The Hook Thread',
    description: 'Start with a bold statement that grabs attention',
    content: '1/ [Bold controversial statement]\n\nHere\'s why:\n\n2/ [First point with evidence]\n\n3/ [Second point with story]\n\n4/ [Third point with data]\n\n5/ [Call to action + question]',
    category: 'marketing',
    engagement_score: 95,
    platforms: ['twitter', 'threads'],
  },
  {
    id: '2',
    title: 'Lessons Learned',
    description: 'Share valuable lessons from your experience',
    content: '1/ I spent [X years/months] doing [activity].\n\nHere are [X] lessons that changed everything:\n\n2/ Lesson 1: [Key insight]\n\n3/ Lesson 2: [Key insight]\n\n4/ Lesson 3: [Key insight]\n\n5/ The biggest takeaway?\n\n[Summary + CTA]',
    category: 'education',
    engagement_score: 88,
    platforms: ['twitter', 'linkedin'],
  },
  {
    id: '3',
    title: 'Story Thread',
    description: 'Tell a compelling story that resonates',
    content: '1/ [Year] - I was [situation].\n\n[Dramatic setup]\n\n2/ Everything changed when [inciting incident]\n\n3/ I decided to [action taken]\n\n4/ The result?\n\n[Outcome with numbers if possible]\n\n5/ If you\'re in [similar situation], here\'s what I\'d do:\n\n[Actionable advice]',
    category: 'storytelling',
    engagement_score: 92,
    platforms: ['twitter', 'linkedin', 'facebook'],
  },
  {
    id: '4',
    title: 'Myth Buster',
    description: 'Challenge common misconceptions',
    content: '1/ [Popular belief] is completely wrong.\n\nHere\'s the truth:\n\n2/ Myth #1: [Common belief]\nReality: [Actual truth]\n\n3/ Myth #2: [Common belief]\nReality: [Actual truth]\n\n4/ Myth #3: [Common belief]\nReality: [Actual truth]\n\n5/ Stop believing [myths] and start [correct action].\n\nRetweet if you agree.',
    category: 'education',
    engagement_score: 85,
    platforms: ['twitter', 'threads'],
  },
  {
    id: '5',
    title: 'How-To Guide',
    description: 'Step-by-step actionable guide',
    content: '1/ How to [achieve result] in [timeframe]:\n\n(Step-by-step guide)\n\n2/ Step 1: [Action]\n\nWhy: [Brief explanation]\n\n3/ Step 2: [Action]\n\nTip: [Pro tip]\n\n4/ Step 3: [Action]\n\nAvoid: [Common mistake]\n\n5/ That\'s it!\n\nSave this thread and start today.\n\nQuestions? Drop them below.',
    category: 'education',
    engagement_score: 90,
    platforms: ['twitter', 'linkedin', 'threads'],
  },
  {
    id: '6',
    title: 'Success Story',
    description: 'Share a transformation story',
    content: '1/ From $0 to $[X] in [timeframe].\n\nHere\'s exactly how I did it:\n\n2/ Month 1-3: [Foundation phase]\n\n3/ Month 4-6: [Growth phase]\n\n4/ Month 7-12: [Scale phase]\n\n5/ The tools I used:\n\n• [Tool 1]\n• [Tool 2]\n• [Tool 3]\n\n6/ Want to replicate this?\n\n[Offer or CTA]',
    category: 'business',
    engagement_score: 94,
    platforms: ['twitter', 'linkedin'],
  },
];

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>(sampleTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { subscribed, session } = useAuth();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('engagement_score', { ascending: false });
    
    if (data && data.length > 0) {
      setTemplates(data as Template[]);
    }
  };

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Template copied to clipboard!');
  };

  const handleUpgrade = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to upgrade');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  const filteredTemplates = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  const categories = Array.from(new Set(templates.map(t => t.category)));

  // Show paywall for non-subscribed users
  if (!subscribed) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Template Library</h1>
            <p className="text-muted-foreground">Proven thread templates to maximize engagement</p>
          </div>

          {/* Blurred Preview with Paywall */}
          <div className="relative">
            {/* Blurred templates grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 blur-sm pointer-events-none select-none">
              {sampleTemplates.slice(0, 6).map((template) => (
                <Card key={template.id} className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">{template.engagement_score}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={categoryColors[template.category] || 'bg-secondary'}>
                        {template.category}
                      </Badge>
                    </div>
                    <div className="bg-secondary/30 p-3 rounded-lg text-xs text-muted-foreground h-20" />
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paywall Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
              <Card className="max-w-md mx-4 border-primary/50 bg-card/95">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-display font-bold">Unlock Template Library</h3>
                  <p className="text-muted-foreground">
                    Get access to proven thread templates that maximize engagement across all platforms.
                  </p>
                  <ul className="text-sm text-left space-y-2 py-2">
                    <li className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span>High-converting templates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span>Platform-optimized formats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span>Engagement score ratings</span>
                    </li>
                  </ul>
                  <Button onClick={handleUpgrade} className="w-full" size="lg">
                    <Lock className="h-4 w-4 mr-2" />
                    Upgrade to Pro - $5/month
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Template Library</h1>
          <p className="text-muted-foreground">Proven thread templates to maximize engagement</p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="bg-card border-border hover:border-primary/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{template.engagement_score}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={categoryColors[template.category] || 'bg-secondary'}>
                    {template.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {template.platforms?.map((p) => {
                      const Icon = platformIcons[p] || Sparkles;
                      return <Icon key={p} className="h-4 w-4 text-muted-foreground" />;
                    })}
                  </div>
                </div>
                
                <div className="bg-secondary/30 p-3 rounded-lg text-xs text-muted-foreground max-h-32 overflow-hidden relative">
                  <pre className="whitespace-pre-wrap font-sans">{template.content}</pre>
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => copyTemplate(template.content)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
