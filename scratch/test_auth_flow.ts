import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_PHONE = '11999999991';
const TEST_EMAIL = 'test_agent_123@example.com';
const TEST_PASS = 'TestPass123!';

async function run() {
  console.log('--- START TEST ---');

  // 1. REGISTER
  console.log('1. Registering user with email and phone...');
  const { data: authData, error: regError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASS,
    options: {
      data: {
        name: 'Test Client Agent',
        phone: TEST_PHONE,
        phone_e164: `+55${TEST_PHONE}`
      }
    }
  });

  if (regError) {
    console.error('Registration failed:', regError.message);
    if (!regError.message.includes('already registered')) {
      return;
    }
  } else {
    console.log('Registration success:', authData.user?.id);
    
    // update phone_e164 in user_accounts to simulate backend trigger
    // Actually the trigger public.handle_new_user() does this automatically!
    await new Promise(r => setTimeout(r, 2000)); // wait for trigger
  }

  // LOGOUT
  await supabase.auth.signOut();

  // 2. LOGIN BY EMAIL
  console.log('\n2. Testing login by EMAIL...');
  const { data: loginEmailData, error: loginEmailErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS
  });
  if (loginEmailErr) {
    console.error('Email login failed:', loginEmailErr.message);
  } else {
    console.log('Email login success!', loginEmailData.user?.id);
  }

  await supabase.auth.signOut();

  // 3. LOGIN BY PHONE (via RPC lookup first, like AuthContext)
  console.log('\n3. Testing login by PHONE...');
  const { data: lookupData, error: lookupErr } = await supabase.rpc('lookup_account_by_phone', {
    phone_input: TEST_PHONE
  });
  
  if (lookupErr || !lookupData || lookupData.length === 0) {
    console.error('Phone lookup failed or not found:', lookupErr?.message);
  } else {
    console.log('Lookup found:', lookupData[0]);
    
    const account = lookupData[0];
    const authEmail = account.email || `${TEST_PHONE}@phone.petcao.app`;
    console.log('Using auth email:', authEmail);

    const { data: loginPhoneData, error: loginPhoneErr } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: TEST_PASS
    });

    if (loginPhoneErr) {
      console.error('Phone login failed:', loginPhoneErr.message);
    } else {
      console.log('Phone login success!', loginPhoneData.user?.id);
    }
  }

  // 4. TEST DELETE CLIENT
  // To delete a client, we need to be DEV. Let's login as dev.
  const DEV_EMAIL = 'dev@petcao.com';
  const DEV_PASS = process.env.DEV_SEED_PASSWORD || 'DevPass123!';
  
  console.log('\n4. Logging in as DEV to delete client...');
  const { data: devLogin, error: devErr } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASS
  });
  
  if (devErr) {
    console.error('Failed to login as DEV:', devErr.message);
    console.log('Is DEV_SEED_PASSWORD correct?');
    return;
  }
  
  console.log('DEV login success:', devLogin.user?.id);
  
  // Find the target user id to delete (the one we just created)
  const { data: targetAccount, error: fetchErr } = await supabase
    .from('user_accounts')
    .select('id')
    .eq('email', TEST_EMAIL)
    .single();
  
  if (fetchErr || !targetAccount) {
    console.log('Could not find test user account to delete.', fetchErr);
    return;
  }
  
  const targetId = targetAccount.id;
  console.log('Target user ID to delete:', targetId);
  
  // Invoke edge function delete-client
  console.log('Invoking delete-client edge function...');
  const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-client', {
    body: { target_user_id: targetId, dev_password: DEV_PASS }
  });
  
  if (fnError) {
    console.error('Edge function network/invocation error:', fnError.message);
  } else {
    console.log('Edge function response:', fnData);
  }
  
  console.log('--- END TEST ---');
}

run();
