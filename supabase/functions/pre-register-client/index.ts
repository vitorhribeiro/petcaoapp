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

    // Get caller from JWT
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);

    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller is DEV or ADMIN
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["dev", "admin"])
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Permissão negada." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { name, phone_e164, pet_name, pet_breed, pet_size, notes } = await req.json();

    if (!name || !phone_e164) {
      return new Response(JSON.stringify({ error: "Nome e telefone são obrigatórios." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.rpc('lookup_account_by_phone', { phone_input: phone_e164 });
    if (existingUser && existingUser.length > 0) {
      return new Response(JSON.stringify({ error: "Este telefone já está vinculado a uma conta existente." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Virtual email
    const digits = phone_e164.replace(/\D/g, "");
    const virtualEmail = `${digits}@phone.petcao.app`;

    // Random password
    const tempPw = crypto.randomUUID().slice(0, 16) + "Aa1!";

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: virtualEmail,
      password: tempPw,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { name: name.trim(), phone_e164 },
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // Update profile
    await supabaseAdmin.from("profiles").update({
      profile_completed: false,
      phone: phone_e164,
      name: name.trim(),
    }).eq("user_id", userId);

    // Insert pet if provided
    if (pet_name) {
      const sizeLower = (pet_size || "medio").toLowerCase();
      
      const { data: petshop } = await supabaseAdmin.from("petshops").select("id").limit(1).single();
      
      if (petshop) {
        await supabaseAdmin.from("pets").insert({
          owner_id: userId,
          petshop_id: petshop.id,
          name: pet_name.trim(),
          size: sizeLower,
          breed: pet_breed || "",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
