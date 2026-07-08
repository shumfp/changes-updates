import { auditMetadata } from "@/lib/audit";
import { missingEnvResponse, requiredEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChangeStatus, ColourCode } from "@/lib/types";

const colours: Record<ChangeStatus, ColourCode> = {
  pending: "yellow",
  confirmed: "green",
  rejected: "red",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const missing = requiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  if (missing.length) return missingEnvResponse(missing);

  const { id } = await params;
  const { status } = await request.json();
  if (!["pending", "confirmed", "rejected"].includes(status)) {
    return Response.json({ error: "Choose a valid status." }, { status: 400 });
  }

  const nextStatus = status as ChangeStatus;
  const supabase = createAdminClient();
  const { data: current, error: findError } = await supabase
    .from("change_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (findError || !current) {
    return Response.json({ error: findError?.message || "Change request not found." }, { status: 404 });
  }

  let sheetUpdated = false;
  if (nextStatus !== "pending") {
    const sheetResponse = await fetch(new URL("/api/sheets/update", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        change_request_id: id,
        sheet_row_id: current.sheet_row_id,
        field_changed: current.field_changed,
        new_value: current.new_value,
        colour: colours[nextStatus],
      }),
    });

    if (!sheetResponse.ok) {
      const body = await sheetResponse.json().catch(() => ({}));
      return Response.json(
        { error: body.error || "Sheet update failed - please retry." },
        { status: 502 },
      );
    }
    sheetUpdated = true;
  }

  const { data, error } = await supabase
    .from("change_requests")
    .update({ status: nextStatus, colour_code: colours[nextStatus] })
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { error: auditError } = await supabase.from("audit_logs").insert({
    change_request_id: id,
    action: nextStatus,
    actor_label: "team_member",
    old_status: current.status,
    new_status: nextStatus,
    metadata: auditMetadata(data, { sheet_updated: sheetUpdated }),
  });

  if (auditError) return Response.json({ error: auditError.message }, { status: 500 });

  return Response.json({ data });
}
