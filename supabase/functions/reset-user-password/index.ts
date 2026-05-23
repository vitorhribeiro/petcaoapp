import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const special = "!@#$%";
  let pw = "";
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) pw += chars[arr[i] % chars.length];
  pw += special[arr[8] % special.length];
  pw += arr[9] % 10;
  return pw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is dev/admin
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRole || !["dev", "admin"].includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateTempPassword();

    // Update auth password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: tempPassword,
    });

    if (updateError) throw updateError;

    // Set expiry to 30 minutes from now + mark must_change_password
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: true,
        temp_password_expires_at: expiresAt,
      })
      .eq("user_id", user_id);

    // Audit log
    await supabaseAdmin.from("audit_log").insert({
      actor_id: caller.id,
      action: "reset_password",
      entity: "user",
      target_id: user_id,
      details: { method: "temp_password", expires_at: expiresAt },
    });

    return new Response(
      JSON.stringify({ temp_password: tempPassword, expires_at: expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
