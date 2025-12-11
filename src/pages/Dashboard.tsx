import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  MessageCircle
} from 'lucide-react';

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
  const { user, session } = useAuth();
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('twitter');
  const [generatedThread, setGeneratedThread] = useState('');
  const [loading, setLoading] = useState(false);

  const generateThread = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
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

      // Save to history
      await supabase.from('thread_history').insert({
        user_id: user?.id,
        topic,
        platform: platform as 'twitter' | 'linkedin' | 'facebook' | 'threads',
        content: data.content,
      });
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
