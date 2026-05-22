import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://rphhgpcuzkdnytsjjcjo.supabase.co';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_CqSqvqBHjglAdf0bLyPkyw_amvx7y9u';

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('user_roles').upsert([
    { user_id: 'a0000000-0000-0000-0000-000000000001', role: 'test_role' }
  ]);
  console.log('Result:', data);
  console.error('Error:', error);
}

test();
