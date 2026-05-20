import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phone_e164, password, email, pets } = await req.json();

    if (!phone_e164 || !password) {
      return new Response(JSON.stringify({ error: "Telefone e senha são obrigatórios." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Lookup user by phone using the RPC
    const { data: accounts, error: lookupErr } = await supabaseAdmin.rpc('lookup_account_by_phone', { phone_input: phone_e164 });
    
    if (lookupErr || !accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ error: "Cadastro não encontrado." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const account = accounts[0];

    // If the account already has a password, it's not a pre-registered account
    if (account.has_password) {
      return new Response(JSON.stringify({ error: "Esta conta já foi completada. Por favor, faça login." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // We need the user's ID to update them. Since lookup_account_by_phone no longer returns ID (or does it? Wait, let's query user_accounts directly just to be safe).
    const { data: userAccount, error: accErr } = await supabaseAdmin
      .from('user_accounts')
      .select('id')
      .eq('phone_e164', phone_e164)
      .single();

    if (accErr || !userAccount) {
      return new Response(JSON.stringify({ error: "Erro ao localizar a conta no banco de dados." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userAccount.id;

    // Build update object
    const updateData: any = { password };
    
    // If they provided a real email, update it
    if (email && email.includes('@')) {
      updateData.email = email;
      updateData.email_confirm = true;
    }

    // Update the auth user
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update profile as completed
    await supabaseAdmin.from('profiles').update({
      profile_completed: true,
    }).eq('user_id', userId);

    // Update or insert pets
    if (pets && Array.isArray(pets) && pets.length > 0) {
      const { data: petshop } = await supabaseAdmin.from("petshops").select("id").limit(1).single();
      if (petshop) {
        for (const pet of pets) {
          if (pet.id) {
            // Update existing pet
            await supabaseAdmin.from('pets').update({
              name: pet.name,
              size: (pet.size || 'medio').toLowerCase(),
              breed: pet.breed || ''
            }).eq('id', pet.id).eq('owner_id', userId);
          } else {
            // Insert new pet
            await supabaseAdmin.from('pets').insert({
              owner_id: userId,
              petshop_id: petshop.id,
              name: pet.name,
              size: (pet.size || 'medio').toLowerCase(),
              breed: pet.breed || ''
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Cadastro completado com sucesso." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
