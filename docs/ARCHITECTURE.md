# Architecture

## Stack
- **Frontend:** Next.js (App Router) on Vercel
- **Database:** Supabase (Postgres + RLS)
- **Google Sheets sync:** Google Sheets API via server-side Next.js route (service account key stored in Vercel env, never in client)
- **Email:** Resend API (server-side only)
- **AI extraction:** OpenAI via server-side API route

## Now vs Later
**Now:** manual paste → AI extract → dashboard → confirm → Sheets sync → email ack
**Later:** Gmail/WhatsApp webhook auto-ingest, advanced analytics, login + per-user scoping

## Key User Action — Step by Step
1. Team member pastes raw WhatsApp/email text into the **Log Change** form
2. Server sends text to OpenAI → returns structured JSON (registrant, field, old, new)
3. Structured change saved to `change_requests` table with `status = pending`
4. Dashboard refreshes; all team members see the new row highlighted yellow
5. Any member clicks **Confirm** → server calls Google Sheets API, updates cell, sets fill colour green
6. Status in DB updated to `confirmed`; audit log row written
7. Member clicks **Send Ack** → server calls Resend, fires email to requester
8. Acknowledgement saved to `acknowledgements` table

## Layer Plan
1. **Data layer first** — tables, constraints, RLS policies, seed data
2. **App logic** — CRUD routes, Sheets sync, email dispatch (works even if AI is off)
3. **Smart features** — AI extraction, confidence scoring, auto-draft ack text

## Core Without AI
If OpenAI is unavailable, team members fill in the structured fields manually. Every other function (Sheets sync, email, dashboard) continues unaffected.
