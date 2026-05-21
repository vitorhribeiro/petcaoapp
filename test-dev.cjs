const { createClient } = require('@supabase/supabase-js');
const url = 'https://rphhgpcuzkdnytsjjcjo.supabase.co';
const key = 'sb_publishable_CqSqvqBHjglAdf0bLyPkyw_amvx7y9u';
const supabase = createClient(url, key);
async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'dev@petcaoapp.com.br',
    password: '@vitor1599'
  });
  if (authError) { console.error('Auth Error:', authError.message); return; }
  console.log('Logged in as', authData.user.id);
  const { data, error } = await supabase.functions.invoke('seed-dev-user', {
    body: { action: 'create', email: 'test_creation@test.com', password: 'password123', name: 'Test User', role: 'admin' }
  });
  console.log('Function Response:', { data, error: error ? error.message : null });
}
run();
