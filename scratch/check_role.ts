import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const DEV_EMAIL = 'dev@petcao.com';
  const DEV_PASS = process.env.DEV_SEED_PASSWORD || 'DevPass123!';
  
  // Login as dev first to get elevated privileges
  const { data: devLogin } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASS
  });
  
  if (!devLogin.user) {
    console.log('Failed to login as dev@petcao.com');
  }

  // Find users named Vitor or with vitor email
  const { data: accounts } = await supabase
    .from('user_accounts')
    .select('*')
    .ilike('email', '%vitor%');
    
  console.log('Accounts with vitor:', accounts);
  
  if (accounts && accounts.length > 0) {
    for (const acc of accounts) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', acc.id);
      console.log(`Roles for ${acc.email}:`, roles);
    }
  }
}

run();
