import { describe, expect, it } from "vitest";

describe("Supabase public configuration", () => {
  it("can reach the configured project auth settings with the anonymous key", async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(url, "EXPO_PUBLIC_SUPABASE_URL must be configured").toBeTruthy();
    expect(anonKey, "EXPO_PUBLIC_SUPABASE_ANON_KEY must be configured").toBeTruthy();

    const response = await fetch(`${url!.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: anonKey! },
    });
    expect(response.ok, "Supabase auth settings endpoint should accept the configured anonymous key").toBe(true);
  }, 15_000);
});
