import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const PETSHOP_ID = '3a4467d3-6fb3-4f93-b673-9a3d4f826354'; // Typical petshop ID

async function main() {
  // Try to find correct petshop id first
  const { data: shops } = await supabase.from('petshops').select('id').limit(1);
  const shopId = shops?.[0]?.id || PETSHOP_ID;
  
  const { data: existing } = await supabase.from('gallery_categories')
    .select('*')
    .eq('petshop_id', shopId)
    .eq('slug', 'copa');
    
  if (existing && existing.length > 0) {
    console.log('Copa category already exists.');
    return;
  }
  
  const { data, error } = await supabase.from('gallery_categories').insert({
    petshop_id: shopId,
    name: 'Copa',
    slug: 'copa',
    max_photos: 50,
    sort_order: 10,
    is_active: true
  });
  
  if (error) {
    console.error('Error creating:', error);
  } else {
    console.log('Successfully created Copa category!');
  }
}

main();
