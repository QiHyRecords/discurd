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
    const { messageId, storagePath, fileName, contentType, byteSize } = await request.json() as { messageId?: string; storagePath?: string; fileName?: string; contentType?: string; byteSize?: number };
    if (!messageId || !storagePath?.startsWith(`${authData.user.id}/`) || !fileName || !contentType || !Number.isInteger(byteSize) || byteSize < 1 || byteSize > 26214400) throw new HttpError("Invalid attachment metadata.", 400);
    await enforceRateLimit(client, "attach-message", { limit: 20, windowSeconds: 60 });
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: message, error: messageError } = await service.from("messages").select("id, author_id, deleted_at").eq("id", messageId).maybeSingle();
    if (messageError || !message || message.author_id !== authData.user.id || message.deleted_at) throw new HttpError("You can only attach a file to an active message you authored.", 403);
    const { error } = await service.from("message_attachments").insert({ message_id: messageId, storage_path: storagePath, file_name: fileName.slice(0, 255), content_type: contentType.slice(0, 160), byte_size: byteSize });
    if (error) throw error;
    return Response.json({ ok: true }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Attachment could not be saved" }, { status: error instanceof HttpError ? error.status : 400, headers }); }
});
