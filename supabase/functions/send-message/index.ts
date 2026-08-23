import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, HttpError } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  const auth = request.headers.get("Authorization");
  if (!auth)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  try {
    await enforceRateLimit(client, "send-message", {
      limit: 30,
      windowSeconds: 60,
    });
    const body = (await request.json()) as {
      channelId?: string;
      conversationId?: string;
      body?: string;
      parentMessageId?: string;
    };
    if (
      !body.body?.trim() ||
      body.body.length > 4000 ||
      Boolean(body.channelId) === Boolean(body.conversationId)
    )
      throw new Error("Invalid message payload");
    const { data, error } = await client
      .from("messages")
      .insert({
        channel_id: body.channelId ?? null,
        conversation_id: body.conversationId ?? null,
        body: body.body.trim(),
        parent_message_id: body.parentMessageId ?? null,
        author_id: userData.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Message creation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: error instanceof HttpError ? error.status : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
