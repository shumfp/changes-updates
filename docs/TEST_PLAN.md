# Test Plan

## v1 Success Scenario (manual walkthrough)
1. Open `/` — verify 4 seed change requests load without login
2. Click **Log Change** — paste: _"Please move Sarah Lee from the morning session to the afternoon session"_
3. After AI extraction: confirm `registrant_name = Sarah Lee`, `field_changed = session`, `new_value = afternoon session`, confidence badge visible
4. Edit `new_value` to `2pm session` — verify `review_status` updates to 'edited'
5. Click **Confirm** — verify status badge turns green, audit log gains a 'confirmed' entry
6. Open linked Google Sheet — verify correct cell is green and shows new value
7. Click **Send Ack** — check requester inbox for acknowledgement email within 60 s
8. Open `/audit` — verify full chain: created → confirmed → sheet_updated → ack_sent

## Empty States
- New DB with no seed rows → dashboard shows "No change requests yet" message with Log Change CTA
- Audit log with no entries → shows "No activity yet"

## Error States
- Submit Log Change with blank registrant name → inline validation error, no DB write
- Google Sheets API returns 403 → toast: "Sheet update failed — please retry"; DB status stays Pending
- Resend API fails → toast: "Email could not be sent"; acknowledgement row NOT written
- OpenAI unavailable → extraction skipped, manual fields shown with notice: "Auto-fill unavailable — please fill in manually"

## Permissions (post lock-down sprint)
- User A cannot view User B's change requests
- Unauthenticated request to `/api/sheets/update` returns 401

## Regression Check (each sprint)
- All seed rows still visible after migration re-run
- Confirm + Reject buttons still persist after UI changes
- Audit log grows by exactly 1 row per action
