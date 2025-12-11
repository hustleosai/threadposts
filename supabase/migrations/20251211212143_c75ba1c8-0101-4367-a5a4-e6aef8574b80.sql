-- Create image_votes table for tracking user votes
CREATE TABLE public.image_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id uuid NOT NULL REFERENCES public.viral_images(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_type smallint NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(image_id, user_id)
);

-- Enable RLS
ALTER TABLE public.image_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all votes"
ON public.image_votes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert own votes"
ON public.image_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
ON public.image_votes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
ON public.image_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Add virality_score column to viral_images
ALTER TABLE public.viral_images 
ADD COLUMN virality_score integer NOT NULL DEFAULT 0;

-- Create function to update virality score
CREATE OR REPLACE FUNCTION public.update_image_virality_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.viral_images
    SET virality_score = (
      SELECT COALESCE(SUM(vote_type), 0)
      FROM public.image_votes
      WHERE image_id = OLD.image_id
    )
    WHERE id = OLD.image_id;
    RETURN OLD;
  ELSE
    UPDATE public.viral_images
    SET virality_score = (
      SELECT COALESCE(SUM(vote_type), 0)
      FROM public.image_votes
      WHERE image_id = NEW.image_id
    )
    WHERE id = NEW.image_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger to auto-update virality score
CREATE TRIGGER update_virality_on_vote
AFTER INSERT OR UPDATE OR DELETE ON public.image_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_image_virality_score();