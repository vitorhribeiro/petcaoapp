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

    // Auth + role check: only existing DEV users can call this function
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);

    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["dev", "admin"])
      .maybeSingle();

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: "Permissão negada. Somente DEV ou ADMIN." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    
    const action = body?.action || "seed";

    // Action: create a new user with a specific role
    if (action === "create") {
      const { email, password, name, role } = body;
      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: "Missing email, password or name" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cleanup orphaned records that might break the on_auth_user_created trigger
      await supabaseAdmin.from("user_accounts").delete().eq("email", email.toLowerCase());
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) throw createError;

      // Update role from default 'cliente' to requested role
      if (role && role !== 'cliente') {
        await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", newUser.user.id);
      }

      // Update profile name
      await supabaseAdmin
        .from("profiles")
        .update({ name })
        .eq("user_id", newUser.user.id);

      return new Response(
        JSON.stringify({ message: "User created", userId: newUser.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: fully delete a user account from auth.users
    if (action === "delete") {
      const { userId } = body;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // We manually clean up profile and roles first just in case cascades aren't fully set up
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ message: "User completely deleted from auth.users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default action: seed the dev user
    const email = "dev@petcao.com";
    const password = Deno.env.get("DEV_SEED_PASSWORD");
    if (!password) {
      return new Response(
        JSON.stringify({ error: "DEV_SEED_PASSWORD secret not configured." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);

    if (existing) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", existing.id)
        .maybeSingle();

      if (!profile) {
        await supabaseAdmin.from("profiles").insert({
          user_id: existing.id,
          name: "Desenvolvedor",
          phone: "",
        });
      }

      const { data: role } = await supabaseAdmin
        .from("user_roles")
        .select("*")
        .eq("user_id", existing.id)
        .eq("role", "dev")
        .maybeSingle();

      if (!role) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", existing.id);
        await supabaseAdmin.from("user_roles").insert({ user_id: existing.id, role: "dev" });
      }

      return new Response(
        JSON.stringify({ message: "Dev user already exists", userId: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Desenvolvedor" },
    });

    if (createError) throw createError;

    await supabaseAdmin
      .from("user_roles")
      .update({ role: "dev" })
      .eq("user_id", newUser.user.id);

    return new Response(
      JSON.stringify({ message: "Dev user created", userId: newUser.user.id }),
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
