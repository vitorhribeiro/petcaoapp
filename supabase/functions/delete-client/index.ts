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
        JSON.stringify({ error: "Permissão negada. Somente DEV pode excluir clientes." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { target_user_id, dev_password } = body;

    if (!target_user_id || !dev_password) {
      return new Response(
        JSON.stringify({ error: "target_user_id e dev_password são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify DEV password by attempting sign in with caller's email
    const callerEmail = caller.email;
    if (!callerEmail) {
      return new Response(
        JSON.stringify({ error: "Conta DEV sem email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a separate client to test sign-in
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

    // Don't allow deleting DEV users
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (targetRole?.role === "dev") {
      return new Response(
        JSON.stringify({ error: "Não é possível excluir um usuário DEV." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target profile for audit
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("name, phone")
      .eq("user_id", target_user_id)
      .maybeSingle();

    // CASCADE DELETE - order matters
    // 1. appointment_pets (via appointments)
    const { data: appts } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("customer_id", target_user_id);

    if (appts && appts.length > 0) {
      const apptIds = appts.map((a: any) => a.id);
      await supabaseAdmin.from("appointment_pets").delete().in("appointment_id", apptIds);
    }

    // 2. appointments
    await supabaseAdmin.from("appointments").delete().eq("customer_id", target_user_id);

    // 3. customer_packages
    await supabaseAdmin.from("customer_packages").delete().eq("customer_id", target_user_id);

    // 4. review_photos (via reviews)
    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("user_id", target_user_id);

    if (reviews && reviews.length > 0) {
      const reviewIds = reviews.map((r: any) => r.id);
      await supabaseAdmin.from("review_photos").delete().in("review_id", reviewIds);
    }

    // 5. reviews
    await supabaseAdmin.from("reviews").delete().eq("user_id", target_user_id);

    // 6. gallery_photos
    await supabaseAdmin.from("gallery_photos").delete().eq("submitted_by_user_id", target_user_id);

    // 7. pets
    await supabaseAdmin.from("pets").delete().eq("owner_id", target_user_id);

    // 8. user_accounts
    await supabaseAdmin.from("user_accounts").delete().eq("id", target_user_id);

    // 9. user_roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id);

    // 10. profiles
    await supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id);

    // 11. Delete auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
    }

    // 12. Audit log
    await supabaseAdmin.from("audit_log").insert({
      actor_id: caller.id,
      action: "delete_client",
      target_id: target_user_id,
      details: {
        target_name: targetProfile?.name || "desconhecido",
        target_phone: targetProfile?.phone || "",
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Cliente excluído com sucesso." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
