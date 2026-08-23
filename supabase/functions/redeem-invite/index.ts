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
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await enforceRateLimit(client, "redeem-invite", {
      limit: 10,
      windowSeconds: 60,
    });
    const { code } = (await request.json()) as { code?: string };
    if (!code || !/^[A-Za-z0-9_-]{6,32}$/.test(code))
      throw new Error("Invalid invite code");
    const { data, error } = await client.rpc("redeem_invite", {
      invite_code: code,
    });
    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invite could not be redeemed",
      },
      { status: error instanceof HttpError ? error.status : 400 },
    );
  }
});
