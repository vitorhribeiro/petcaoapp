import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auth + dev role check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);

  if (!caller) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "dev")
    .maybeSingle();

  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Permissão negada. Somente DEV." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabaseAdmin
    .from("audit_log")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ deleted: count }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
