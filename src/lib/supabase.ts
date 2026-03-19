/*
 * File:        src/lib/supabase.ts
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? supabaseAnonKey;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export async function getSupabaseFunctionHeaders() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token ?? supabaseAnonKey ?? supabasePublishableKey;

  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: supabaseAnonKey ?? supabasePublishableKey,
  };
}
