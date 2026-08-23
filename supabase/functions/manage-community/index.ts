import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, HttpError } from "../_shared/rateLimit.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const code = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
type Action = "create_server" | "create_category" | "create_channel" | "create_invite" | "assign_role" | "toggle_pin";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const authorization = request.headers.get("Authorization");
  if (!authorization) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    const input = await request.json() as { action?: Action; serverId?: string; name?: string; description?: string; categoryId?: string | null; kind?: "text" | "voice"; memberId?: string; roleId?: string; messageId?: string; maxUses?: number | null; expiresAt?: string | null };
    if (!input.action) throw new HttpError("A management action is required.", 400);
    await enforceRateLimit(client, `manage-community:${input.action}`, { limit: 20, windowSeconds: 60 });
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userId = authData.user.id;
    if (input.action === "create_server") {
      const name = input.name?.trim();
      if (!name || name.length > 100) throw new HttpError("Server names must contain 1 to 100 characters.", 400);
      const { data: server, error } = await service.from("servers").insert({ owner_id: userId, name, description: input.description?.trim().slice(0, 500) ?? "" }).select("id").single();
      if (error || !server) throw error ?? new Error("Server was not created.");
      const { data: ownerRole, error: roleError } = await service.from("roles").insert({ server_id: server.id, name: "Owner", priority: 1000, is_default: false }).select("id").single();
      if (roleError || !ownerRole) throw roleError ?? new Error("Owner role was not created.");
      const permissions = ["VIEW_CHANNEL", "SEND_MESSAGES", "EDIT_MESSAGES", "DELETE_MESSAGES", "ATTACH_FILES", "ADD_REACTIONS", "MENTION_EVERYONE", "CREATE_THREADS", "SEND_IN_THREADS", "MANAGE_CHANNELS", "MANAGE_SERVER", "MANAGE_ROLES", "KICK_MEMBERS", "BAN_MEMBERS", "MODERATE_MEMBERS", "CONNECT", "SPEAK", "MUTE_MEMBERS", "DEAFEN_MEMBERS"];
      const { error: permissionsError } = await service.from("role_permissions").insert(permissions.map((permission) => ({ role_id: ownerRole.id, permission })));
      if (permissionsError) throw permissionsError;
      const { error: memberError } = await service.from("server_members").insert({ server_id: server.id, user_id: userId });
      if (memberError) throw memberError;
      const { error: membershipError } = await service.from("member_roles").insert({ server_id: server.id, user_id: userId, role_id: ownerRole.id });
      if (membershipError) throw membershipError;
      const { data: category, error: categoryError } = await service.from("categories").insert({ server_id: server.id, name: "General", position: 0 }).select("id").single();
      if (categoryError || !category) throw categoryError ?? new Error("Default category was not created.");
      const { error: channelError } = await service.from("channels").insert({ server_id: server.id, category_id: category.id, name: "general", kind: "text", description: "Welcome to your new space.", position: 0 });
      if (channelError) throw channelError;
      await service.from("audit_logs").insert({ server_id: server.id, actor_id: userId, action: "server.create", target_type: "server", target_id: server.id });
      return Response.json({ id: server.id }, { headers });
    }
    if (!input.serverId) throw new HttpError("A server is required.", 400);
    const { data: permitted, error: permissionError } = await client.rpc("has_server_permission", { target_server: input.serverId, requested_permission: input.action === "assign_role" ? "MANAGE_ROLES" : input.action === "toggle_pin" ? "MANAGE_SERVER" : input.action === "create_invite" ? "MANAGE_SERVER" : "MANAGE_CHANNELS" });
    if (permissionError) throw permissionError;
    if (!permitted) throw new HttpError("You do not have permission for this server action.", 403);
    if (input.action === "create_category") {
      const name = input.name?.trim(); if (!name || name.length > 80) throw new HttpError("Category names must contain 1 to 80 characters.", 400);
      const { data, error } = await service.from("categories").insert({ server_id: input.serverId, name, position: Date.now() }).select("id").single(); if (error) throw error; return Response.json({ id: data.id }, { headers });
    }
    if (input.action === "create_channel") {
      const name = input.name?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); if (!name || name.length > 80) throw new HttpError("Channel names require lowercase letters, numbers, or hyphens.", 400);
      const { data, error } = await service.from("channels").insert({ server_id: input.serverId, category_id: input.categoryId ?? null, name, kind: input.kind ?? "text", description: input.description?.trim().slice(0, 240) ?? "", position: Date.now() }).select("id").single(); if (error) throw error; return Response.json({ id: data.id }, { headers });
    }
    if (input.action === "create_invite") {
      const { data, error } = await service.from("invites").insert({ server_id: input.serverId, code: code(), created_by: userId, max_uses: input.maxUses ?? null, expires_at: input.expiresAt ?? null }).select("code").single(); if (error) throw error; return Response.json({ code: data.code }, { headers });
    }
    if (input.action === "assign_role") {
      if (!input.memberId || !input.roleId) throw new HttpError("Member and role are required.", 400);
      const { error } = await service.from("member_roles").upsert({ server_id: input.serverId, user_id: input.memberId, role_id: input.roleId }); if (error) throw error; return Response.json({ ok: true }, { headers });
    }
    if (input.action === "toggle_pin") {
      if (!input.messageId) throw new HttpError("Message is required.", 400);
      const { data: existing, error: existingError } = await service.from("message_pins").select("message_id").eq("message_id", input.messageId).maybeSingle(); if (existingError) throw existingError;
      const response = existing ? await service.from("message_pins").delete().eq("message_id", input.messageId) : await service.from("message_pins").insert({ message_id: input.messageId, pinned_by: userId }); if (response.error) throw response.error; return Response.json({ pinned: !existing }, { headers });
    }
    throw new HttpError("Unsupported management action.", 400);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Community action failed" }, { status: error instanceof HttpError ? error.status : 400, headers }); }
});
