import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, HttpError } from "../_shared/rateLimit.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const authorization = request.headers.get("Authorization");
  if (!authorization) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    const input = await request.json() as { title?: string; memberIds?: string[] };
    const memberIds = [...new Set((input.memberIds ?? []).filter((id) => typeof id === "string" && id.length === 36 && id !== authData.user.id))];
    if (!memberIds.length || memberIds.length > 49) throw new HttpError("Choose between one and 49 other members.", 400);
    const title = input.title?.trim().slice(0, 100) || null;
    await enforceRateLimit(client, "create-conversation", { limit: 10, windowSeconds: 60 });
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: validProfiles, error: profileError } = await service.from("profiles").select("id").in("id", memberIds);
    if (profileError) throw profileError;
    if ((validProfiles ?? []).length !== memberIds.length) throw new HttpError("One or more selected members no longer exist.", 400);
    const { data: conversation, error: conversationError } = await service.from("conversations").insert({ kind: memberIds.length === 1 ? "direct" : "group", title, created_by: authData.user.id }).select("id").single();
    if (conversationError || !conversation) throw conversationError ?? new Error("Conversation was not created.");
    const { error: membershipError } = await service.from("conversation_members").insert([authData.user.id, ...memberIds].map((user_id) => ({ conversation_id: conversation.id, user_id })));
    if (membershipError) throw membershipError;
    return Response.json({ id: conversation.id }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Conversation could not be created" }, { status: error instanceof HttpError ? error.status : 400, headers });
  }
});
