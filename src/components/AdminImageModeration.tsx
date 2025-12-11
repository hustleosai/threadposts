import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useImageCategories } from '@/hooks/useImageCategories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, Loader2, Image as ImageIcon, Plus } from 'lucide-react';

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
  const { user } = useAuth();
  const { categoryNames, loading: categoriesLoading } = useImageCategories();
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Admin upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const resetUploadForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setTags('');
    setFile(null);
    setPreview(null);
  };

  const handleAdminUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !title || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `admin/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('viral-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('viral-images')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('viral_images')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
          image_url: urlData.publicUrl,
          uploaded_by: user.id,
          status: 'approved'
        });

      if (insertError) throw insertError;

      toast.success('Image added to library!');
      resetUploadForm();
      setUploadOpen(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image Moderation
            </CardTitle>
            <CardDescription>
              Review and approve user-submitted images ({pendingImages.length} pending)
            </CardDescription>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Image
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Image to Library</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdminUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-image">Image *</Label>
                  <Input
                    id="admin-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {preview && (
                    <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-lg mt-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-title">Title *</Label>
                  <Input
                    id="admin-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Image title"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-category">Category *</Label>
                  <Select value={category} onValueChange={setCategory} disabled={categoriesLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={categoriesLoading ? "Loading..." : "Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryNames.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-description">Description</Label>
                  <Textarea
                    id="admin-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-tags">Tags (comma separated)</Label>
                  <Input
                    id="admin-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. success, motivation"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Image'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
