import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

interface ImageUploadDialogProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
}

const CATEGORIES = ['Motivation', 'Tech', 'Business', 'Lifestyle', 'Education', 'Finance', 'Health', 'Other'];

export default function ImageUploadDialog({ onSuccess, children }: ImageUploadDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setTags('');
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to upload images');
      return;
    }

    if (!file || !title || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('viral-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('viral-images')
        .getPublicUrl(fileName);

      // Insert into viral_images table with pending status
      const { error: insertError } = await supabase
        .from('viral_images')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
          image_url: urlData.publicUrl,
          uploaded_by: user.id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast.success('Image submitted for review!');
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Submit Image
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Viral Image</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image">Image *</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {preview && (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-40 object-cover rounded-lg mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your image a title"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. success, motivation, business"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Submit for Review'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
