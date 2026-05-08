import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifyCaller(supabaseAdmin: any, req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
  if (!caller) throw { status: 401, message: "Não autenticado" };

  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "dev")
    .maybeSingle();

  if (!roleRow) throw { status: 403, message: "Somente DEV pode executar esta ação." };
  return caller;
}

async function verifyPassword(caller: any) {
  const testClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
  );
  return testClient;
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

    const caller = await verifyCaller(supabaseAdmin, req);
    const body = await req.json();
    const { action, dev_password, petshop_id, reason } = body;

    if (!action || !dev_password || !petshop_id || !reason) {
      return json({ error: "action, dev_password, petshop_id e reason são obrigatórios." }, 400);
    }

    if (typeof reason !== "string" || reason.trim().length < 3) {
      return json({ error: "Motivo deve ter pelo menos 3 caracteres." }, 400);
    }

    // Verify password
    const testClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { error: signInError } = await testClient.auth.signInWithPassword({
      email: caller.email!,
      password: dev_password,
    });
    if (signInError) return json({ error: "Senha DEV incorreta." }, 403);

    if (action === "delete_all_clients") {
      return await deleteAllClients(supabaseAdmin, caller, petshop_id, reason);
    } else if (action === "reset_all") {
      return await resetAll(supabaseAdmin, caller, petshop_id, reason);
    } else {
      return json({ error: "Ação inválida." }, 400);
    }
  } catch (error: any) {
    if (error.status) return json({ error: error.message }, error.status);
    return json({ error: error.message || "Erro inesperado" }, 500);
  }
});

async function deleteAllClients(admin: any, caller: any, petshopId: string, reason: string) {
  // Get all cliente-role users
  const { data: clientRoles } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "cliente");

  if (!clientRoles || clientRoles.length === 0) {
    return json({ success: true, message: "Nenhum cliente encontrado.", deleted: 0 });
  }

  const userIds = clientRoles.map((r: any) => r.user_id);
  let deleted = 0;

  for (const userId of userIds) {
    // Delete appointments and sub-records
    const { data: appts } = await admin.from("appointments").select("id").eq("customer_id", userId);
    if (appts && appts.length > 0) {
      await admin.from("appointment_pets").delete().in("appointment_id", appts.map((a: any) => a.id));
    }
    await admin.from("appointments").delete().eq("customer_id", userId);
    await admin.from("customer_packages").delete().eq("customer_id", userId);

    // Reviews
    const { data: reviews } = await admin.from("reviews").select("id").eq("user_id", userId);
    if (reviews && reviews.length > 0) {
      await admin.from("review_photos").delete().in("review_id", reviews.map((r: any) => r.id));
    }
    await admin.from("reviews").delete().eq("user_id", userId);

    // Gallery, pets, notifications
    await admin.from("gallery_photos").delete().eq("submitted_by_user_id", userId);
    await admin.from("pet_notes").delete().in("pet_id",
      ((await admin.from("pets").select("id").eq("owner_id", userId)).data || []).map((p: any) => p.id)
    );
    await admin.from("pets").delete().eq("owner_id", userId);
    await admin.from("notifications").delete().eq("user_id", userId);
    await admin.from("dashboard_preferences").delete().eq("user_id", userId);
    await admin.from("user_accounts").delete().eq("id", userId);
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("user_id", userId);

    // Delete auth user
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    deleted++;
  }

  await admin.from("audit_log").insert({
    actor_id: caller.id,
    action: "delete_all_clients",
    details: { reason: reason.trim(), petshop_id: petshopId, clients_deleted: deleted },
  });

  return json({ success: true, message: `${deleted} clientes excluídos.`, deleted });
}

async function resetAll(admin: any, caller: any, petshopId: string, reason: string) {
  // Get all non-dev users
  const { data: allRoles } = await admin.from("user_roles").select("user_id, role");
  const nonDevUsers = (allRoles || []).filter((r: any) => r.role !== "dev").map((r: any) => r.user_id);

  let clientsDeleted = 0;

  // Delete all non-dev users and their data
  for (const userId of nonDevUsers) {
    const { data: appts } = await admin.from("appointments").select("id").eq("customer_id", userId);
    if (appts && appts.length > 0) {
      await admin.from("appointment_pets").delete().in("appointment_id", appts.map((a: any) => a.id));
    }
    await admin.from("appointments").delete().eq("customer_id", userId);
    await admin.from("customer_packages").delete().eq("customer_id", userId);

    const { data: reviews } = await admin.from("reviews").select("id").eq("user_id", userId);
    if (reviews && reviews.length > 0) {
      await admin.from("review_photos").delete().in("review_id", reviews.map((r: any) => r.id));
    }
    await admin.from("reviews").delete().eq("user_id", userId);
    await admin.from("gallery_photos").delete().eq("submitted_by_user_id", userId);
    await admin.from("pet_notes").delete().in("pet_id",
      ((await admin.from("pets").select("id").eq("owner_id", userId)).data || []).map((p: any) => p.id)
    );
    await admin.from("pets").delete().eq("owner_id", userId);
    await admin.from("notifications").delete().eq("user_id", userId);
    await admin.from("dashboard_preferences").delete().eq("user_id", userId);
    await admin.from("user_accounts").delete().eq("id", userId);
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    clientsDeleted++;
  }

  // Clean orphan data for the petshop
  await admin.from("appointments").delete().eq("petshop_id", petshopId);
  await admin.from("customer_packages").delete().eq("petshop_id", petshopId);
  await admin.from("gallery_photos").delete().eq("petshop_id", petshopId);
  await admin.from("reviews").delete().eq("petshop_id", petshopId);
  await admin.from("expenses").delete().eq("petshop_id", petshopId);

  // Clear audit log (except this action - inserted below)
  await admin.from("audit_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  await admin.from("audit_log").insert({
    actor_id: caller.id,
    action: "reset_all",
    details: { reason: reason.trim(), petshop_id: petshopId, users_deleted: clientsDeleted },
  });

  return json({ success: true, message: `Reset completo. ${clientsDeleted} usuários removidos.`, deleted: clientsDeleted });
}
