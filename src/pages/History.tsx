import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Clock, Heart, Copy, Trash2, Twitter, Linkedin, MessageCircle, Sparkles } from 'lucide-react';

interface ThreadHistory {
  id: string;
  topic: string;
  platform: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
}

const platformIcons: Record<string, React.ElementType> = {
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: MessageCircle,
  threads: Sparkles,
};

export default function History() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadHistory[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
  }, [user]);

  const fetchThreads = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('thread_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch thread history');
    } else {
      setThreads(data || []);
    }
    setLoading(false);
  };

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('thread_history')
      .update({ is_favorite: !currentStatus })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update favorite');
    } else {
      setThreads(threads.map(t => 
        t.id === id ? { ...t, is_favorite: !currentStatus } : t
      ));
      toast.success(currentStatus ? 'Removed from favorites' : 'Added to favorites');
    }
  };

  const deleteThread = async (id: string) => {
    const { error } = await supabase
      .from('thread_history')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete thread');
    } else {
      setThreads(threads.filter(t => t.id !== id));
      toast.success('Thread deleted');
    }
  };

  const copyThread = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!');
  };

  const filteredThreads = filter === 'favorites' 
    ? threads.filter(t => t.is_favorite)
    : threads;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Thread History</h1>
          <p className="text-muted-foreground">Your generated threads and favorites</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Threads
          </Button>
          <Button
            variant={filter === 'favorites' ? 'default' : 'outline'}
            onClick={() => setFilter('favorites')}
          >
            <Heart className="h-4 w-4 mr-2" />
            Favorites
          </Button>
        </div>

        {/* Threads List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            Loading...
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{filter === 'favorites' ? 'No favorites yet' : 'No threads generated yet'}</p>
            <p className="text-sm mt-2">Start generating threads from the dashboard</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredThreads.map((thread) => {
              const Icon = platformIcons[thread.platform] || Sparkles;
              return (
                <Card key={thread.id} className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{thread.topic}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(thread.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {thread.platform}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-secondary/30 p-4 rounded-lg text-sm max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans">{thread.content}</pre>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyThread(thread.content)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFavorite(thread.id, thread.is_favorite)}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${thread.is_favorite ? 'fill-current text-red-500' : ''}`} />
                        {thread.is_favorite ? 'Unfavorite' : 'Favorite'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteThread(thread.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
