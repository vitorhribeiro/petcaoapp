import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sql = `
DROP FUNCTION IF EXISTS public.lookup_account_by_phone(text);

CREATE FUNCTION public.lookup_account_by_phone(phone_input text)
 RETURNS TABLE(auth_provider text, has_password boolean, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ua.auth_provider, COALESCE(p.profile_completed, false) AS has_password, ua.email
  FROM public.user_accounts ua
  LEFT JOIN public.profiles p ON p.user_id = ua.id
  WHERE ua.phone_e164 = public.to_br_e164(phone_input)
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_account_by_phone(text) TO anon, authenticated;
`;

async function run() {
  const { error } = await supabase.rpc('query_runner', { sql_query: sql }).maybeSingle();
  if (error) {
    console.error('Could not use query_runner, will try another method:', error.message);
  }
  
  // Actually, supabase-js doesn't support arbitrary SQL. 
  // Instead, output the SQL for the user to run.
  console.log('Please run this SQL in the Supabase SQL Editor:');
  console.log(sql);
}

run();
