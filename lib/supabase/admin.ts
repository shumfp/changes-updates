import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || (!serviceRoleKey && !anonKey)) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, serviceRoleKey || anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
