import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const {
      data: { user: caller },
    } = await supabaseAdmin.auth.getUser(token);

    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is DEV
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "dev")
      .maybeSingle();

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Permissão negada. Somente DEV pode executar esta ação." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { reason, dev_password, petshop_id } = body;

    if (!reason || !dev_password || !petshop_id) {
      return new Response(
        JSON.stringify({ error: "reason, dev_password e petshop_id são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate reason length
    if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 500) {
      return new Response(
        JSON.stringify({ error: "Motivo deve ter entre 3 e 500 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify DEV password
    const callerEmail = caller.email;
    if (!callerEmail) {
      return new Response(
        JSON.stringify({ error: "Conta DEV sem email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { error: signInError } = await testClient.auth.signInWithPassword({
      email: callerEmail,
      password: dev_password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Senha DEV incorreta." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CASCADE DELETE for the petshop
    // 1. Get all appointments for this petshop
    const { data: appts } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("petshop_id", petshop_id);

    if (appts && appts.length > 0) {
      const apptIds = appts.map((a: any) => a.id);
      // Delete appointment_pets
      await supabaseAdmin.from("appointment_pets").delete().in("appointment_id", apptIds);
    }

    // 2. Delete appointments
    await supabaseAdmin.from("appointments").delete().eq("petshop_id", petshop_id);

    // 3. Delete customer_packages
    await supabaseAdmin.from("customer_packages").delete().eq("petshop_id", petshop_id);

    // 4. Audit log
    await supabaseAdmin.from("audit_log").insert({
      actor_id: caller.id,
      action: "clear_dashboard",
      details: {
        reason: reason.trim(),
        petshop_id,
        appointments_deleted: appts?.length || 0,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Dados do dashboard excluídos com sucesso.", deleted: appts?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
