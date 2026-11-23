"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (client) return client;
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Avatar uploads are not configured for this deployment.");
  client = createBrowserClient<Database>(config.url, config.key);
  return client;
}
