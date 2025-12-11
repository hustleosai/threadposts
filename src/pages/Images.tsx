import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import ImageUploadDialog from '@/components/ImageUploadDialog';
import { Image, Download, Search, ExternalLink, Clock, Lock, Crown, Sparkles } from 'lucide-react';
interface ViralImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  tags: string[] | null;
  status?: string;
  uploaded_by?: string | null;
}

// Sample images for demo
const sampleImages: ViralImage[] = [{
  id: '1',
  title: 'Motivational Quote',
  description: 'Success mindset quote',
  image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
  category: 'Motivation',
  tags: ['success', 'mindset', 'business']
}, {
  id: '2',
  title: 'Tech Innovation',
  description: 'AI and technology visual',
  image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
  category: 'Tech',
  tags: ['AI', 'technology', 'innovation']
}, {
  id: '3',
  title: 'Business Growth',
  description: 'Chart showing growth',
  image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
  category: 'Business',
  tags: ['growth', 'analytics', 'success']
}, {
  id: '4',
  title: 'Team Collaboration',
  description: 'Team working together',
  image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
  category: 'Business',
  tags: ['team', 'collaboration', 'office']
}, {
  id: '5',
  title: 'Creative Workspace',
  description: 'Modern workspace setup',
  image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
  category: 'Lifestyle',
  tags: ['workspace', 'productivity', 'design']
}, {
  id: '6',
  title: 'Morning Routine',
  description: 'Productive morning visual',
  image_url: 'https://images.unsplash.com/photo-1484627147104-f5197bcd6651?w=400',
  category: 'Lifestyle',
  tags: ['morning', 'routine', 'productivity']
}, {
  id: '7',
  title: 'Networking Event',
  description: 'Professional networking',
  image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
  category: 'Business',
  tags: ['networking', 'events', 'professional']
}, {
  id: '8',
  title: 'Reading & Learning',
  description: 'Education and growth',
  image_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
  category: 'Education',
  tags: ['learning', 'books', 'growth']
}];
export default function Images() {
  const {
    user,
    subscribed,
    checkingSubscription
  } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<ViralImage[]>(sampleImages);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  useEffect(() => {
    fetchImages();
  }, []);
  const fetchImages = async () => {
    const {
      data,
      error
    } = await supabase.from('viral_images').select('*').order('created_at', {
      ascending: false
    });
    if (data && data.length > 0) {
      setImages(data);
    }
  };
  const myPendingImages = images.filter(img => img.status === 'pending' && img.uploaded_by === user?.id);
  const approvedImages = images.filter(img => img.status === 'approved' || !img.status);
  const downloadImage = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };
  const categories = Array.from(new Set(images.map(i => i.category)));
  const filteredImages = images.filter(image => {
    const matchesSearch = searchQuery === '' || image.title.toLowerCase().includes(searchQuery.toLowerCase()) || image.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === null || image.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const handleUpgrade = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to start checkout');
    }
  };

  // Show paywall if not subscribed
  if (!checkingSubscription && !subscribed) {
    return <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Viral Image Library</h1>
            <p className="text-muted-foreground">Curated images that drive engagement</p>
          </div>

          {/* Blurred Preview */}
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 blur-sm pointer-events-none select-none">
              {sampleImages.slice(0, 8).map(image => <Card key={image.id} className="bg-card border-border overflow-hidden">
                  <CardContent className="p-0">
                    <img src={image.image_url} alt={image.title} className="w-full aspect-square object-cover" />
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{image.title}</p>
                    </div>
                  </CardContent>
                </Card>)}
            </div>

            {/* Paywall Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Card className="max-w-md mx-4 border-primary/20 bg-card/95 backdrop-blur">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-display font-bold">Unlock the Viral Image Library</h2>
                    <p className="text-muted-foreground">
                      Get access to hundreds of viral-ready images to supercharge your social content.
                    </p>
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">Curated high-engagement images</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">Organized by category & tags</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">Instant download for any platform</span>
                    </div>
                  </div>

                  <Button onClick={handleUpgrade} size="lg" className="w-full gap-2">
                    <Crown className="h-4 w-4" />
                    {user ? 'Upgrade to Pro - $5/month' : 'Sign Up to Get Started'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Viral Image Library</h1>
            <p className="text-muted-foreground">Curated images that drive engagement</p>
          </div>
          {user && <ImageUploadDialog onSuccess={fetchImages} />}
        </div>

        {/* My Pending Submissions */}
        {myPendingImages.length > 0 && <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Your Pending Submissions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {myPendingImages.map(image => <Card key={image.id} className="bg-card border-border overflow-hidden opacity-75">
                  <CardContent className="p-0 relative">
                    <img src={image.image_url} alt={image.title} className="w-full aspect-square object-cover" />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
                        Pending Review
                      </Badge>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{image.title}</p>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search images..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={selectedCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>
              All
            </Button>
            {categories.map(category => <Button key={category} variant={selectedCategory === category ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(category)}>
                {category}
              </Button>)}
          </div>
        </div>

        {/* Images Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.filter(img => img.status === 'approved' || !img.status).map(image => <Card key={image.id} className="bg-card border-border overflow-hidden group">
              <CardContent className="p-0 relative">
                <img src={image.image_url} alt={image.title} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                  <h3 className="font-semibold text-sm text-center">{image.title}</h3>
                  <p className="text-xs text-muted-foreground text-center">{image.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => downloadImage(image.image_url, image.title)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(image.image_url, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-background/80 text-xs">
                  {image.category}
                </div>
              </CardContent>
            </Card>)}
        </div>

        {filteredImages.length === 0 && <div className="text-center py-16 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No images found</p>
          </div>}
      </div>
    </DashboardLayout>;
}