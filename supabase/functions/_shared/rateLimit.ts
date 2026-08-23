import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type RateLimitRule = { limit: number; windowSeconds: number };

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function validateRule(rule: RateLimitRule) {
  if (
    !Number.isInteger(rule.limit) ||
    !Number.isInteger(rule.windowSeconds) ||
    rule.limit < 1 ||
    rule.windowSeconds < 1
  ) {
    throw new HttpError("Invalid rate-limit configuration", 500);
  }
}

/** Consumes an atomic, authenticated per-user PostgreSQL rate-limit bucket. */
export async function enforceRateLimit(
  client: SupabaseClient,
  action: string,
  rule: RateLimitRule,
): Promise<void> {
  validateRule(rule);
  const { data, error } = await client.rpc("consume_rate_limit", {
    target_action: action,
    max_count: rule.limit,
    window_seconds: rule.windowSeconds,
  });
  if (error) throw new HttpError("Rate-limit check failed", 500);
  if (!data)
    throw new HttpError("Too many requests. Please try again shortly.", 429);
}

/** Limits a webhook/service-only operation through a separate service-role RPC. */
export async function enforceInternalRateLimit(
  service: SupabaseClient,
  scope: string,
  rule: RateLimitRule,
): Promise<void> {
  validateRule(rule);
  const { data, error } = await service.rpc("consume_internal_rate_limit", {
    target_scope: scope,
    max_count: rule.limit,
    window_seconds: rule.windowSeconds,
  });
  if (error) throw new HttpError("Internal rate-limit check failed", 500);
  if (!data)
    throw new HttpError("Notification throughput is temporarily limited", 429);
}
