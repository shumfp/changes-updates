import { missingEnvResponse, requiredEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const missing = requiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  if (missing.length) return missingEnvResponse(missing);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, change_requests(registrant_name, field_changed)")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ data: data || [] });
}
