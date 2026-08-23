import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceInternalRateLimit, HttpError } from "../_shared/rateLimit.ts";

type NotificationEvent = {
  userId: string;
  title: string;
  body: string;
  targetPath?: string;
  serverId?: string;
  channelId?: string;
  isMention?: boolean;
  channel: "messages" | "mentions" | "calls" | "system";
};
type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

const encoder = new TextEncoder();
const base64Url = (value: string | ArrayBuffer) => {
  const bytes =
    typeof value === "string" ? encoder.encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};
const pemToBuffer = (pem: string) => {
  const normalized = pem.replace(
    /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
    "",
  );
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
};

async function mintFcmAccessToken(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsignedToken),
  );
  const assertion = `${unsignedToken}.${base64Url(signature)}`;
  const response = await fetch(
    serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    },
  );
  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token)
    throw new HttpError(
      data.error_description ?? "Unable to obtain Firebase access token",
      500,
    );
  return data.access_token;
}

function isTerminalTokenError(status: number, payload: unknown) {
  const error = (
    payload as {
      error?: {
        status?: string;
        message?: string;
        details?: { errorCode?: string }[];
      };
    }
  ).error;
  const fcmCode = error?.details?.find((detail) => detail.errorCode)?.errorCode;
  return (
    status === 404 ||
    fcmCode === "UNREGISTERED" ||
    (error?.status === "INVALID_ARGUMENT" &&
      /registration token/i.test(error.message ?? ""))
  );
}

Deno.serve(async (request) => {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== Deno.env.get("DISCURD_WEBHOOK_SECRET"))
    return new Response("Unauthorized", { status: 401 });
  const event = (await request.json()) as NotificationEvent;
  if (
    !event.userId ||
    !event.title?.trim() ||
    !event.body?.trim() ||
    !["messages", "mentions", "calls", "system"].includes(event.channel)
  )
    return new Response(
      JSON.stringify({ error: "Invalid notification event" }),
      { status: 400 },
    );
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    await enforceInternalRateLimit(
      service,
      `notify-event:${event.userId}:${event.channel}`,
      { limit: 60, windowSeconds: 60 },
    );
    const { error: insertError } = await service.from("notifications").insert({
      user_id: event.userId,
      kind:
        event.channel === "messages"
          ? "message"
          : event.channel === "mentions"
            ? "mention"
            : event.channel === "calls"
              ? "call"
              : "system",
      title: event.title,
      body: event.body,
      target_path: event.targetPath ?? null,
    });
    if (insertError) throw insertError;
    const { data: preferences, error: preferenceError } = await service
      .from("notification_preferences")
      .select("server_id, channel_id, level")
      .eq("user_id", event.userId);
    if (preferenceError) throw preferenceError;
    const preference =
      preferences?.find(
        (item) => item.channel_id && item.channel_id === event.channelId,
      ) ??
      preferences?.find(
        (item) => item.server_id && item.server_id === event.serverId,
      );
    const level = preference?.level ?? "all";
    if (level === "none" || (level === "mentions" && !event.isMention))
      return new Response(
        JSON.stringify({ deliveredTo: 0, suppressed: true }),
        { headers: { "Content-Type": "application/json" } },
      );

    const fcmSecret = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!fcmSecret)
      throw new HttpError("FCM_SERVICE_ACCOUNT_JSON is not configured", 500);
    const serviceAccount = JSON.parse(fcmSecret) as ServiceAccount;
    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    )
      throw new HttpError("FCM service-account secret is malformed", 500);
    const accessToken = await mintFcmAccessToken(serviceAccount);
    const { data: tokens, error: tokenError } = await service
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", event.userId);
    if (tokenError) throw tokenError;

    const results = await Promise.all(
      (tokens ?? []).map(async ({ token, platform }) => {
        try {
          const fcmResponse = await fetch(
            `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: { title: event.title, body: event.body },
                  data: {
                    targetPath: event.targetPath ?? "",
                    channel: event.channel,
                  },
                  android: {
                    priority: "high",
                    notification: { channel_id: "lumalink" },
                  },
                  apns:
                    platform === "ios"
                      ? { payload: { aps: { sound: "default" } } }
                      : undefined,
                },
              }),
            },
          );
          if (fcmResponse.ok) return { token, delivered: true, removed: false };
          const errorPayload = await fcmResponse.json().catch(() => ({}));
          const remove = isTerminalTokenError(fcmResponse.status, errorPayload);
          if (remove)
            await service.from("device_tokens").delete().eq("token", token);
          return { token, delivered: false, removed: remove };
        } catch {
          return { token, delivered: false, removed: false };
        }
      }),
    );
    return new Response(
      JSON.stringify({
        deliveredTo: results.filter((result) => result.delivered).length,
        removedTokens: results.filter((result) => result.removed).length,
        failedTokens: results.filter(
          (result) => !result.delivered && !result.removed,
        ).length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Notification delivery failed",
      }),
      {
        status: error instanceof HttpError ? error.status : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
