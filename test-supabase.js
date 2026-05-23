import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manually to avoid dotenv dependency issues
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^"|"$/g, '').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_PUBLISHABLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'dev@petcaoapp.com.br',
    password: '@vitor1599'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('Logged in successfully.', authData.user.id);

  console.log('Fetching a category...');
  const { data: cats, error: fetchError } = await supabase
    .from('gallery_categories')
    .select('*');

  if (fetchError || !cats || cats.length === 0) {
    console.error('Fetch error:', fetchError);
    return;
  }

  const cat = cats[cats.length - 1];
  console.log('Found category:', cat.id, 'name:', cat.name);

  console.log('Attempting to update category...');
  const { error: updateError } = await supabase
    .from('gallery_categories')
    .update({ name: cat.name + ' Edit' })
    .eq('id', cat.id);

  console.log('Update result:', updateError || 'Success');

  console.log('Attempting to delete category...');
  const { error: deleteError } = await supabase
    .from('gallery_categories')
    .delete()
    .eq('id', cat.id);

  console.log('Delete result:', deleteError || 'Success');
}

testUpdate();
