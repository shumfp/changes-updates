# Tasks & Sprints

## Gantt (sprint → feature)
```
Sprint 1: DB + core change-request engine (end-to-end)
Sprint 2: Google Sheets sync + colour coding
Sprint 3: Acknowledgement email + audit log UI       ← v1 FUNCTIONAL milestone
Sprint 4: AI extraction + confidence scoring
Sprint 5: Lock it down (auth + RLS owner policies)
```

---

## Sprint 1 — Database + Core Change-Request Engine
**Goal:** A team member can log, view, confirm, and reject change requests. Core CRUD works against the DB. App is demoable without login.

- [ ] Run migration SQL: create `change_requests`, `acknowledgements`, `audit_logs`; seed 4 demo rows
- [ ] Build dashboard page (`/`) — table of all change requests with status badges (loading / empty / partial / error / ready states all handled)
- [ ] Build Log Change form — paste raw text + fill registrant/field/old/new manually; submits to DB
- [ ] Confirm button → sets `status = confirmed`, `colour_code = green`, writes audit log row
- [ ] Reject button → sets `status = rejected`, `colour_code = red`, writes audit log row
- [ ] No dead buttons: every action persists and dashboard reflects change immediately
- [ ] Demo seed rows visible on first load without login

**Definition of Done:** Open `/` in a fresh browser (no login). See 4 demo change requests. Click Confirm on one — status updates to Confirmed in the table. Click Reject on another — status updates to Rejected. Log a new request manually — it appears in the table. All changes survive a page refresh.

---

## Sprint 2 — Google Sheets Sync + Colour Coding
**Goal:** Confirming or rejecting a change also updates the linked Google Sheet cell with the correct colour.

- [ ] Store `GOOGLE_SERVICE_ACCOUNT_JSON` and `SHEET_ID` in Vercel env
- [ ] Build server route `POST /api/sheets/update` — accepts row id, new value, colour; calls Sheets API
- [ ] Confirm action calls Sheets update → green fill; Reject → red fill; Pending → yellow fill
- [ ] Audit log entry includes `sheet_updated: true` in metadata
- [ ] Handle Sheets API error gracefully: show error toast, do NOT silently fail or mark confirmed
- [ ] Test with a real Sheet: verify cell colour and value match

**Definition of Done:** Confirm a change request → open the linked Google Sheet → the correct cell is green and contains the new value. Reject another → cell turns red. A Sheets API failure shows an error message in the UI and leaves DB status unchanged.

---

## Sprint 3 — Acknowledgement Email + Audit Log UI ✅ v1 FUNCTIONAL
**Goal:** Team can send acknowledgement emails; full audit trail is visible.

- [ ] Store `RESEND_API_KEY` in Vercel env
- [ ] Build server route `POST /api/ack/send` — composes and sends email via Resend; saves to `acknowledgements`
- [ ] Send Ack button on each confirmed/rejected request → fires email, disables button after send
- [ ] Build Audit Log page (`/audit`) — chronological list of all actions (who, what, when)
- [ ] Empty state for audit log; error state if fetch fails
- [ ] All five UI states handled on every screen

**Definition of Done:** Confirm a change request, click Send Ack — requester receives email within 60 seconds. Acknowledgement row exists in DB. Audit log page shows created → confirmed → ack_sent entries for that request. The full v1 success scenario (paste → extract → confirm → Sheet updated → ack sent) completes end-to-end.

---

## Sprint 4 — AI Extraction + Confidence Scoring
**Goal:** Pasting raw WhatsApp/email text auto-fills the structured fields.

- [ ] Store `OPENAI_API_KEY` in Vercel env
- [ ] Build server route `POST /api/ai/extract` — sends raw text to GPT-4o, returns structured JSON
- [ ] Log Change form: on paste submit, call extract route; auto-fill fields; show confidence badge
- [ ] Colour-coded confidence: ≥0.85 green, 0.60–0.84 amber, <0.60 red
- [ ] All AI fields store `_source`, `_confidence`, `_review_status` columns
- [ ] Team member can edit any AI-filled field before confirming
- [ ] If AI unavailable, form falls back to manual entry with a visible notice

**Definition of Done:** Paste "Move John Doe from 9am to 2pm Friday" → fields auto-fill with confidence ≥ 0.85 and green badge. Edit a field → `review_status` updates to 'edited'. Disconnect OpenAI key → form still submits manually without error.

---

## Sprint 5 — Lock It Down (Auth + Per-User RLS)
**Goal:** Real team members log in; data is owner-scoped; demo policies replaced.

- [ ] Enable Supabase Auth (email/password or magic link)
- [ ] Add login / signup pages; protect dashboard behind session
- [ ] Replace v1 RLS policies with `auth.uid() = user_id` owner-scoped policies on all tables
- [ ] Backfill `user_id` on any existing rows for the owning account
- [ ] Confirm no data leaks between users in preview
- [ ] Document: "do not put real registrant data in the system until this sprint is complete"

**Definition of Done:** Two test accounts cannot see each other's change requests. Logging out redirects to login page. Audit logs record the authenticated user's ID on every action.
