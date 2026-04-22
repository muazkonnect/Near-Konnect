import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = ["admin", "manager", "ads_manager", "moderator", "worker", "customer"] as const;
type AppRole = (typeof ALLOWED_ROLES)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is staff
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden — staff only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, email, fullName, role, userId, password, redirectTo } = body as {
      action: "invite" | "create" | "assign_role" | "remove_role" | "delete_user";
      email?: string;
      fullName?: string;
      role?: AppRole;
      userId?: string;
      password?: string;
      redirectTo?: string;
    };

    if (role && !ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "invite") {
      if (!email || !role) throw new Error("email and role required");
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName ?? "", role },
        redirectTo,
      });
      if (error) throw error;
      const newUserId = data.user?.id;
      if (newUserId) {
        await admin.from("user_roles").insert({ user_id: newUserId, role }).then(() => {});
      }
      return ok({ user: data.user });
    }

    if (action === "create") {
      if (!email || !password || !role) throw new Error("email, password and role required");
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName ?? "", role },
      });
      if (error) throw error;
      const newUserId = data.user?.id;
      if (newUserId) {
        await admin.from("user_roles").insert({ user_id: newUserId, role });
      }
      return ok({ user: data.user });
    }

    if (action === "assign_role") {
      if (!userId || !role) throw new Error("userId and role required");
      const { error } = await admin.from("user_roles").insert({ user_id: userId, role });
      if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;

      // If switching to customer-only, demote from worker: remove worker role + delete worker record
      if (role === "customer") {
        const { data: existingRoles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const roleSet = new Set((existingRoles ?? []).map((r: { role: string }) => r.role));
        if (roleSet.has("worker")) {
          await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "worker");
          await admin.from("workers").delete().eq("user_id", userId);
        }
      }
      return ok({ ok: true });
    }

    if (action === "remove_role") {
      if (!userId || !role) throw new Error("userId and role required");
      // Prevent removing your own admin role
      if (userId === userData.user.id && role === "admin") {
        return new Response(JSON.stringify({ error: "You cannot remove your own admin role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;

      // When worker role is removed, also delete the worker profile so the account becomes a regular customer
      if (role === "worker") {
        await admin.from("workers").delete().eq("user_id", userId);
        // Ensure they have at least the customer role
        await admin
          .from("user_roles")
          .insert({ user_id: userId, role: "customer" })
          .then(() => {});
      }
      return ok({ ok: true });
    }

    if (action === "delete_user") {
      if (!userId) throw new Error("userId required");
      if (userId === userData.user.id) {
        return new Response(JSON.stringify({ error: "You cannot delete yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return ok({ ok: true });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-invite-user error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
