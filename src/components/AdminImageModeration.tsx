import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface PendingImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  tags: string[] | null;
  status: string;
  uploaded_by: string | null;
  created_at: string;
}

export default function AdminImageModeration() {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingImages();
  }, []);

  const fetchPendingImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viral_images')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingImages(data || []);
    } catch (error) {
      console.error('Error fetching pending images:', error);
      toast.error('Failed to load pending images');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (imageId: string) => {
    setActionLoading(imageId);
    try {
      const { error } = await supabase
        .from('viral_images')
        .update({ status: 'approved' })
        .eq('id', imageId);

      if (error) throw error;
      
      setPendingImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image approved');
    } catch (error) {
      console.error('Error approving image:', error);
      toast.error('Failed to approve image');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (imageId: string, imageUrl: string) => {
    setActionLoading(imageId);
    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('viral_images')
        .delete()
        .eq('id', imageId);

      if (deleteError) throw deleteError;

      // Try to delete from storage (extract path from URL)
      const urlParts = imageUrl.split('/viral-images/');
      if (urlParts[1]) {
        await supabase.storage.from('viral-images').remove([urlParts[1]]);
      }
      
      setPendingImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image rejected and deleted');
    } catch (error) {
      console.error('Error rejecting image:', error);
      toast.error('Failed to reject image');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Image Moderation
        </CardTitle>
        <CardDescription>
          Review and approve user-submitted images ({pendingImages.length} pending)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingImages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending images to review</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingImages.map((image) => (
              <Card key={image.id} className="bg-secondary/50 overflow-hidden">
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-40 object-cover"
                />
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="font-semibold truncate">{image.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {image.description || 'No description'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{image.category}</Badge>
                    {image.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(image.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(image.id)}
                      disabled={actionLoading === image.id}
                      className="flex-1"
                    >
                      {actionLoading === image.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(image.id, image.image_url)}
                      disabled={actionLoading === image.id}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
