import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { url, anonKey, enabled: Boolean(url && anonKey) };
}

const config = getSupabaseConfig();

if (!config.enabled) {
  throw new Error("Discurd requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

const sessionStorage = {
  getItem: async (key: string) => Platform.OS === "web" ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

/** The sole application data/auth client. Privileged keys never enter this bundle. */
export const supabase = createClient(config.url, config.anonKey, {
  auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export type SupabaseProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_path: string | null;
  status_text: string;
  is_developer?: boolean;
  is_verified?: boolean;
};
