export type ChangeStatus = "pending" | "confirmed" | "rejected";
export type ColourCode = "yellow" | "green" | "red";
export type SourceChannel = "whatsapp" | "email" | "other";
export type ReviewStatus = "unreviewed" | "reviewed" | "edited";
export type FieldSource = "ai" | "manual" | "fallback";

export type ChangeRequest = {
  id: string;
  user_id: string | null;
  raw_input: string | null;
  source_channel: SourceChannel | string | null;
  registrant_name: string | null;
  registrant_name_source: FieldSource | string | null;
  registrant_name_confidence: number | null;
  registrant_name_review_status: ReviewStatus | string | null;
  field_changed: string | null;
  field_changed_source: FieldSource | string | null;
  field_changed_confidence: number | null;
  field_changed_review_status: ReviewStatus | string | null;
  old_value: string | null;
  new_value: string | null;
  new_value_source: FieldSource | string | null;
  new_value_confidence: number | null;
  new_value_review_status: ReviewStatus | string | null;
  requester_email: string | null;
  sheet_row_id: string | null;
  status: ChangeStatus | string | null;
  colour_code: ColourCode | string | null;
  created_at: string;
  acknowledgements?: Acknowledgement[];
};

export type Acknowledgement = {
  id: string;
  user_id: string | null;
  change_request_id: string;
  sent_to: string | null;
  body: string | null;
  sent_at: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  change_request_id: string | null;
  action: string | null;
  actor_label: string | null;
  old_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  change_requests?: Pick<ChangeRequest, "registrant_name" | "field_changed"> | null;
};

export type ExtractedChange = {
  registrant_name: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  requester_email: string;
  confidence: number;
  source: string;
  review_status: ReviewStatus;
  notice?: string;
};
