import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, HttpError } from "../_shared/rateLimit.ts";

Deno.serve(async (request) => {
  const auth = request.headers.get("Authorization");
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: userData } = await client.auth.getUser();
  if (!userData.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await enforceRateLimit(client, "request-data-export", {
      limit: 2,
      windowSeconds: 86_400,
    });
    const { data, error } = await client
      .from("data_export_requests")
      .insert({ user_id: userData.user.id })
      .select()
      .single();
    if (error) throw error;
    return Response.json({ data, message: "Export queued" }, { status: 202 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Export request failed",
      },
      { status: error instanceof HttpError ? error.status : 400 },
    );
  }
});
