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
    const { token, platform } = await request.json() as { token?: string; platform?: string };
    if (!token || token.length > 4096 || (platform !== "android" && platform !== "ios")) throw new HttpError("A valid native device token and platform are required.", 400);
    await enforceRateLimit(client, "register-device-token", { limit: 10, windowSeconds: 60 });
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await service.from("device_tokens").upsert({ user_id: authData.user.id, token, platform, updated_at: new Date().toISOString() }, { onConflict: "token" });
    if (error) throw error;
    return Response.json({ ok: true }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Device token could not be registered" }, { status: error instanceof HttpError ? error.status : 400, headers }); }
});
