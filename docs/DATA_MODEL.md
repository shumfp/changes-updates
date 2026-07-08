# Data Model

## `change_requests`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid nullable | owner (set at lock-down) |
| raw_input | text | pasted WhatsApp/email text |
| source_channel | text | 'whatsapp' \| 'email' \| 'other' |
| registrant_name | text | AI or manual |
| registrant_name_source | text | 'ai' \| 'manual' |
| registrant_name_confidence | numeric | 0–1 |
| registrant_name_review_status | text | default 'unreviewed' |
| field_changed | text | e.g. 'session_time' |
| field_changed_source | text | |
| field_changed_confidence | numeric | |
| field_changed_review_status | text | default 'unreviewed' |
| old_value | text | |
| new_value | text | |
| new_value_source | text | |
| new_value_confidence | numeric | |
| new_value_review_status | text | default 'unreviewed' |
| requester_email | text | for ack reply |
| sheet_row_id | text | Google Sheet row reference |
| status | text | 'pending' \| 'confirmed' \| 'rejected' |
| colour_code | text | 'yellow' \| 'green' \| 'red' |
| created_at | timestamptz | now() |

## `acknowledgements`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| change_request_id | uuid | FK → change_requests.id |
| sent_to | text | email address |
| body | text | message sent |
| sent_at | timestamptz | |
| created_at | timestamptz | now() |

## `audit_logs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid nullable | |
| change_request_id | uuid | |
| action | text | 'created'\|'confirmed'\|'rejected'\|'ack_sent'\|'sheet_updated' |
| actor_label | text | name or 'system' |
| old_status | text | |
| new_status | text | |
| metadata | jsonb | extra context |
| created_at | timestamptz | now() |

## RLS
All tables: RLS enabled. v1 policies allow full anonymous read/write (replaced by owner-scoped policies at lock-down sprint).
