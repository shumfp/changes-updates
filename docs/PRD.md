# PRD — Registration Changes Tracker

## Problem
The team receives registration change requests via WhatsApp and email. These are missed, forgotten, or never reflected in the master Google Sheet, and requesters are rarely acknowledged.

## Target Users
Internal team members (ops, coordinators) who manage event/course registrations together.

## Core Objects
- **Change Request** — the incoming change (source, registrant, field changed, old value, new value, status)
- **Registration** — the record being changed (linked to Google Sheet row)
- **Acknowledgement** — the outbound reply sent to the requester
- **Audit Log** — every state transition, who did it, when

## MVP Must-Haves
- [ ] Log a new change request manually (paste from WhatsApp/email)
- [ ] AI auto-extracts: registrant name, field changed, old value, new value
- [ ] Change request shown on shared team dashboard with status (Pending / Confirmed / Rejected)
- [ ] One-click confirm → Google Sheet row updated, cell colour-coded (yellow = pending, green = confirmed, red = rejected)
- [ ] One-click send acknowledgement email to requester
- [ ] All changes visible to all team members in real time

## Non-Goals (v1)
- WhatsApp/email auto-ingestion (manual paste only)
- Full user auth / login wall
- Multi-team isolation
- Mobile app

## Success Criteria
> A team member pastes a WhatsApp message saying "John Doe needs to change his session from 9am to 2pm". The system extracts the change, the team confirms it, the Google Sheet cell turns green, and an acknowledgement email is sent — all within 2 minutes, logged in the audit trail.
