# Agentic Layer

## Risk Levels & Actions

### Low Risk — Auto (no approval)
- Extract structured fields from pasted text (OpenAI)
- Tag source channel
- Score confidence
- Draft acknowledgement email body

### Medium Risk — Light Approval (team member clicks Confirm)
- Update Google Sheet cell value and colour
- Mark change request as confirmed/rejected

### High Risk — Approval Required
- Send acknowledgement email to requester (human clicks Send Ack button)

### Critical — Human Only
- Delete a change request
- Bulk-reject or bulk-confirm multiple requests

## Named Tools (server-side only)
| Tool | Trigger | Risk |
|---|---|---|
| `ai_extract_change` | on paste submit | Low |
| `sheets_update_cell` | on Confirm click | Medium |
| `email_send_ack` | on Send Ack click | High |

## Audit Log Fields
`id, change_request_id, action, actor_label, old_status, new_status, metadata (jsonb), created_at`

## v1 vs Later
**v1:** All three named tools active; every action logged.
**Later:** Auto-trigger `sheets_update_cell` when confidence ≥ 0.95 and team opt-in enabled; WhatsApp send-ack via Twilio.
