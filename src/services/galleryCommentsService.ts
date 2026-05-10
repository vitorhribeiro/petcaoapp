import { supabase } from '@/integrations/supabase/client';

export interface GalleryComment {
  id: string;
  photo_id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  comment_text: string;
  created_at: string;
}

export async function getCommentsForPhoto(photoId: string): Promise<GalleryComment[]> {
  const { data, error } = await supabase
    .from('gallery_comments')
    .select('id, photo_id, user_id, user_name, user_avatar_url, comment_text, created_at')
    .eq('photo_id', photoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getCommentsForPhoto error:', error);
    return [];
  }
  return (data || []) as GalleryComment[];
}

export async function addComment(
  photoId: string,
  userId: string,
  userName: string,
  avatarUrl: string | null,
  text: string
): Promise<GalleryComment | null> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) return null;

  const { data, error } = await supabase
    .from('gallery_comments')
    .insert({
      photo_id: photoId,
      user_id: userId,
      user_name: userName,
      user_avatar_url: avatarUrl,
      comment_text: trimmed,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('addComment error:', error);
    return null;
  }
  return data as GalleryComment;
}

export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('gallery_comments')
    .delete()
    .eq('id', commentId);
  return !error;
}

export async function getCommentCountsForPhotos(photoIds: string[]): Promise<Record<string, number>> {
  if (photoIds.length === 0) return {};
  const { data } = await supabase
    .from('gallery_comments')
    .select('photo_id')
    .in('photo_id', photoIds);

  const counts: Record<string, number> = {};
  for (const id of photoIds) counts[id] = 0;
  for (const row of data || []) {
    counts[(row as any).photo_id] = (counts[(row as any).photo_id] || 0) + 1;
  }
  return counts;
}

export async function getCommentLikes(commentIds: string[]): Promise<Record<string, { count: number; likedByMe: boolean }>> {
  if (commentIds.length === 0) return {};
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  const { data } = await supabase
    .from('gallery_comment_likes')
    .select('id, comment_id, user_id')
    .in('comment_id', commentIds);

  const result: Record<string, { count: number; likedByMe: boolean }> = {};
  for (const id of commentIds) result[id] = { count: 0, likedByMe: false };
  for (const row of data || []) {
    const r = row as any;
    result[r.comment_id].count += 1;
    if (userId && r.user_id === userId) {
      result[r.comment_id].likedByMe = true;
    }
  }
  return result;
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; success: boolean }> {
  const { data: existing } = await supabase
    .from('gallery_comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('gallery_comment_likes').delete().eq('id', existing.id);
    return { liked: false, success: !error };
  } else {
    const { error } = await supabase.from('gallery_comment_likes').insert({ comment_id: commentId, user_id: userId } as any);
    return { liked: true, success: !error };
  }
}
