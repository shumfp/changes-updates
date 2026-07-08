import { createAdminClient } from "@/lib/supabase/admin";
import { auditMetadata } from "@/lib/audit";
import { missingEnvResponse, requiredEnv } from "@/lib/env";

export async function GET() {
  const missing = requiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  if (missing.length) return missingEnvResponse(missing);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select("*, acknowledgements(*)")
    .order("status", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const sorted = [...(data || [])].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    const aConfidence = Number(a.new_value_confidence ?? 1);
    const bConfidence = Number(b.new_value_confidence ?? 1);
    if (a.status === "pending" && b.status === "pending" && aConfidence !== bConfidence) {
      return aConfidence - bConfidence;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return Response.json({ data: sorted });
}

export async function POST(request: Request) {
  const missing = requiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  if (missing.length) return missingEnvResponse(missing);

  const payload = await request.json();

  if (!payload.registrant_name?.trim()) {
    return Response.json({ error: "Registrant name is required." }, { status: 400 });
  }
  if (!payload.field_changed?.trim()) {
    return Response.json({ error: "Field changed is required." }, { status: 400 });
  }
  if (!payload.new_value?.trim()) {
    return Response.json({ error: "New value is required." }, { status: 400 });
  }

  const confidence = Number(payload.confidence ?? 0);
  const source = payload.source === "manual" ? "manual" : payload.source ? "ai" : "manual";
  const reviewStatus = payload.review_status || (source === "manual" ? "reviewed" : "unreviewed");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      raw_input: payload.raw_input || "",
      source_channel: payload.source_channel || "other",
      registrant_name: payload.registrant_name.trim(),
      registrant_name_source: source,
      registrant_name_confidence: confidence || null,
      registrant_name_review_status: reviewStatus,
      field_changed: payload.field_changed.trim(),
      field_changed_source: source,
      field_changed_confidence: confidence || null,
      field_changed_review_status: reviewStatus,
      old_value: payload.old_value || "",
      new_value: payload.new_value.trim(),
      new_value_source: source,
      new_value_confidence: confidence || null,
      new_value_review_status: reviewStatus,
      requester_email: payload.requester_email || "",
      sheet_row_id: payload.sheet_row_id || "",
      status: "pending",
      colour_code: "yellow",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { error: auditError } = await supabase.from("audit_logs").insert({
    change_request_id: data.id,
    action: "created",
    actor_label: "team_member",
    old_status: null,
    new_status: "pending",
    metadata: auditMetadata(data, {
      source: payload.source || source,
      confidence,
    }),
  });

  if (auditError) return Response.json({ error: auditError.message }, { status: 500 });

  return Response.json({ data });
}
