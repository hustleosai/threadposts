import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TemplateCategory = Database['public']['Enums']['template_category'];
type PlatformType = Database['public']['Enums']['platform_type'];

interface Template {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: TemplateCategory;
  platforms: PlatformType[] | null;
  engagement_score: number | null;
}

const CATEGORIES: TemplateCategory[] = ['business', 'motivation', 'education', 'storytelling', 'marketing', 'personal', 'tech'];
const PLATFORMS: PlatformType[] = ['twitter', 'linkedin', 'facebook', 'threads'];

export default function AdminTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'business' as TemplateCategory,
    platforms: ['twitter'] as PlatformType[],
    engagement_score: 0,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching templates', variant: 'destructive' });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      category: 'business',
      platforms: ['twitter'],
      engagement_score: 0,
    });
    setEditingTemplate(null);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      description: template.description || '',
      content: template.content,
      category: template.category,
      platforms: template.platforms || ['twitter'],
      engagement_score: template.engagement_score || 0,
    });
    setDialogOpen(true);
  };

  const handlePlatformToggle = (platform: PlatformType) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !formData.category) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (formData.platforms.length === 0) {
      toast({ title: 'Select at least one platform', variant: 'destructive' });
      return;
    }

    const templateData = {
      title: formData.title,
      description: formData.description || null,
      content: formData.content,
      category: formData.category,
      platforms: formData.platforms,
      engagement_score: formData.engagement_score,
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('templates')
        .update(templateData)
        .eq('id', editingTemplate.id);

      if (error) {
        toast({ title: 'Error updating template', variant: 'destructive' });
        return;
      }
      toast({ title: 'Template updated' });
    } else {
      const { error } = await supabase.from('templates').insert(templateData);

      if (error) {
        toast({ title: 'Error creating template', variant: 'destructive' });
        return;
      }
      toast({ title: 'Template created' });
    }

    setDialogOpen(false);
    resetForm();
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('templates').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error deleting template', variant: 'destructive' });
      return;
    }

    toast({ title: 'Template deleted' });
    fetchTemplates();
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading templates...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Templates</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add New Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Template title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Template content with placeholders like [topic], [key point], etc."
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as TemplateCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Engagement Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.engagement_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, engagement_score: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Platforms *</Label>
                <div className="flex flex-wrap gap-4">
                  {PLATFORMS.map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform}
                        checked={formData.platforms.includes(platform)}
                        onCheckedChange={() => handlePlatformToggle(platform)}
                      />
                      <label htmlFor={platform} className="text-sm capitalize cursor-pointer">
                        {platform}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No templates yet. Add your first template!</p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border bg-secondary/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{template.title}</h4>
                    <Badge variant="outline" className="capitalize text-xs">
                      {template.category}
                    </Badge>
                    {template.engagement_score && (
                      <Badge variant="secondary" className="text-xs">
                        {template.engagement_score}% engagement
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                  )}
                  <div className="flex gap-1 mt-2">
                    {template.platforms?.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs capitalize">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
