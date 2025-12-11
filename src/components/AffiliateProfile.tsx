import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Camera, Save, Check, X } from 'lucide-react';
import { z } from 'zod';

const referralCodeSchema = z.string()
  .min(4, 'Referral code must be at least 4 characters')
  .max(20, 'Referral code must be less than 20 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'Only letters, numbers, underscores and hyphens allowed');

interface AffiliateProfileProps {
  affiliateId: string;
  currentReferralCode: string;
  onUpdate: () => void;
}

// Generate gravatar URL from email
const getGravatarUrl = (email: string, size: number = 200) => {
  const trimmedEmail = email.trim().toLowerCase();
  // Use a simple hash for gravatar (in production you'd use MD5)
  const hash = Array.from(trimmedEmail).reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0).toString(16).replace('-', '');
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
};

export default function AffiliateProfile({ affiliateId, currentReferralCode, onUpdate }: AffiliateProfileProps) {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(currentReferralCode);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .single();
    setProfile(data);
    setProfileLoading(false);
  };

  const handleUpdateReferralCode = async () => {
    try {
      referralCodeSchema.parse(referralCode.trim());
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    // Check if code is already taken
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase())
      .neq('id', affiliateId)
      .maybeSingle();

    if (existing) {
      toast.error('This referral code is already taken');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('affiliates')
      .update({ referral_code: referralCode.toUpperCase() })
      .eq('id', affiliateId);

    if (error) {
      toast.error('Failed to update referral code');
    } else {
      toast.success('Referral code updated!');
      setIsEditing(false);
      onUpdate();
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadLoading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('viral-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('viral-images')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadLoading(false);
    }
  };

  const avatarUrl = profile?.avatar_url || (user?.email ? getGravatarUrl(user.email) : null);
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Your Affiliate Profile</CardTitle>
        <CardDescription>Customize your referral code and avatar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
              <AvatarFallback className="text-xl bg-primary/20 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
            >
              {uploadLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="font-medium">{profile?.full_name || 'Affiliate'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click the camera icon to upload a custom avatar
            </p>
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="space-y-2">
          <Label>Referral Code</Label>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="YOUR-CODE"
                className="font-mono uppercase"
                maxLength={20}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleUpdateReferralCode}
                disabled={loading}
                className="text-green-500 hover:text-green-600"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setReferralCode(currentReferralCode);
                  setIsEditing(false);
                }}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={currentReferralCode}
                readOnly
                className="font-mono"
              />
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Customize your referral code to make it memorable. Only letters, numbers, underscores, and hyphens.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
