import { supabase } from '@/integrations/supabase/client';
import { PETSHOP_ID } from '@/lib/constants';

export interface StickerCard {
  id: string;
  petshop_id: string;
  url: string;
  pet_name: string | null;
  owner_name: string | null;
  caption: string | null;
  alt: string | null;
  slot_number: number | null;
  moderation_status: string;
  created_at: string;
}

/** Load all album sticker cards (category = 'album') */
export async function getAlbumStickers(): Promise<StickerCard[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('petshop_id', PETSHOP_ID)
    .eq('category', 'pets')
    .ilike('alt', 'Figurinha%')
    .eq('moderation_status', 'aprovado')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getAlbumStickers error:', error);
    return [];
  }
  return (data || []) as StickerCard[];
}

/** Add a new sticker card to the album */
export async function createStickerCard(data: {
  url: string;
  pet_name?: string;
  owner_name?: string;
  caption?: string;
  slot_number?: number;
}): Promise<StickerCard | null> {
  const { data: row, error } = await supabase
    .from('gallery_photos')
    .insert({
      petshop_id: PETSHOP_ID,
      url: data.url,
      alt: data.pet_name ? `Figurinha de ${data.pet_name}` : 'Figurinha PetCão',
      caption: data.caption || '',
      category: 'pets',
      source: 'PETSHOP',
      pet_name: data.pet_name || null,
      owner_name: data.owner_name || null,
      moderation_status: 'aprovado',
    } as any)
    .select()
    .single();

  if (error) {
    console.error('createStickerCard error:', error);
    return null;
  }
  return row as StickerCard;
}

/** Update a sticker card */
export async function updateStickerCard(
  id: string,
  data: Partial<Pick<StickerCard, 'pet_name' | 'owner_name' | 'caption' | 'url'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('gallery_photos')
    .update(data as any)
    .eq('id', id);

  if (error) {
    console.error('updateStickerCard error:', error);
    return false;
  }
  return true;
}

/** Delete a sticker card */
export async function deleteStickerCard(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('gallery_photos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteStickerCard error:', error);
    return false;
  }
  return true;
}
