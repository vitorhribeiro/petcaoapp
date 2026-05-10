-- Create gallery_comment_likes table
CREATE TABLE public.gallery_comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES public.gallery_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.gallery_comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view comment likes" 
ON public.gallery_comment_likes FOR SELECT TO public
USING (true);

CREATE POLICY "Authenticated users can insert comment likes" 
ON public.gallery_comment_likes FOR INSERT TO public
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own comment likes" 
ON public.gallery_comment_likes FOR DELETE TO public
USING (auth.uid() = user_id);



-- Create indexes for performance
CREATE INDEX idx_gallery_comment_likes_comment_id ON public.gallery_comment_likes(comment_id);
CREATE INDEX idx_gallery_comment_likes_user_id ON public.gallery_comment_likes(user_id);
