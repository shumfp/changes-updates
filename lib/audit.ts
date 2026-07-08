import type { ChangeRequest } from "@/lib/types";

export function auditMetadata(change: ChangeRequest, extra: Record<string, unknown> = {}) {
  return {
    registrant_name: change.registrant_name,
    field_changed: change.field_changed,
    sheet_row_id: change.sheet_row_id,
    ...extra,
  };
}
