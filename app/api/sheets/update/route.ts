import { updateSheetCell } from "@/lib/google-sheets";
import { auditMetadata } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const payload = await request.json();
  const missing = ["GOOGLE_SERVICE_ACCOUNT_JSON", "SHEET_ID"].filter(
    (key) => !process.env[key],
  );
  if (missing.length) {
    return Response.json(
      { error: `Sheet update failed - missing ${missing.join(", ")}.` },
      { status: 503 },
    );
  }

  if (!payload.sheet_row_id || !payload.field_changed || !payload.new_value) {
    return Response.json(
      { error: "Sheet row, field, and new value are required." },
      { status: 400 },
    );
  }

  try {
    const result = await updateSheetCell({
      sheetRowId: payload.sheet_row_id,
      fieldChanged: payload.field_changed,
      newValue: payload.new_value,
      colour: payload.colour,
    });

    if (payload.change_request_id) {
      const supabase = createAdminClient();
      const { data: change } = await supabase
        .from("change_requests")
        .select("*")
        .eq("id", payload.change_request_id)
        .single();

      if (change) {
        await supabase.from("audit_logs").insert({
          change_request_id: payload.change_request_id,
          action: "sheet_updated",
          actor_label: "system",
          old_status: change.status,
          new_status: change.status,
          metadata: auditMetadata(change, result),
        });
      }
    }

    return Response.json({ data: result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Sheet update failed - please retry." },
      { status: 502 },
    );
  }
}
