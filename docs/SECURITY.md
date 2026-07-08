# Security

## Secret Handling
- Google service account JSON, OpenAI key, Resend API key → Vercel environment variables only
- Never referenced in client-side code or exposed in API responses
- `.env.local` in `.gitignore`; no secrets in repo

## Permission Model (v1 — open demo)
- All tables: RLS enabled, v1 policies allow anonymous read/write so demo works without login
- Lock-down sprint replaces policies with `auth.uid() = user_id` owner-scoped rules

## Permission Model (post lock-down)
- Team members: create/edit own requests, confirm/reject any (shared team scope)
- Read all change requests and audit logs (shared visibility)
- Only `service_role` key used server-side for Sheets/email calls

## Approved Tools Rule
- Only `ai_extract_change`, `sheets_update_cell`, `email_send_ack` are callable by the app
- No `run_any`, `eval`, or dynamic tool construction
- Every tool call writes to `audit_logs` before returning

## Audit Principle
- Every status change, Sheets write, and email send is logged with actor, timestamp, and before/after state
- Logs are append-only; no delete route exposed

## Payments / Data-Loss Risk
- No payments in v1
- Bulk delete is human-only; no API route exists for it in v1 — add only after auth is locked down
