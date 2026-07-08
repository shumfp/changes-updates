# Intelligence Layer

## Messy Inputs
- WhatsApp message: _"Hi, can John Doe please be moved from the 9am slot to 2pm on Friday?"_
- Email body: _"Please update Sarah Lee's dietary requirement to vegan."_

## Auto-Structure Schema (JSON)
```json
{
  "registrant_name": "John Doe",
  "field_changed": "session_time",
  "old_value": "9am Friday",
  "new_value": "2pm Friday",
  "requester_email": "sender@example.com",
  "confidence": 0.91,
  "source": "openai-gpt-4o",
  "review_status": "unreviewed"
}
```

## Events to Track
- Change request logged
- AI extraction completed (confidence score recorded)
- Team member edited AI output
- Status changed (pending → confirmed/rejected)
- Sheet updated
- Acknowledgement sent

## Scoring Rules (v1 — rule-based)
- confidence ≥ 0.85 → highlight green, auto-fill fields
- confidence 0.60–0.84 → highlight amber, prompt team review
- confidence < 0.60 → highlight red, require manual fill

## What Gets Ranked
- Change requests sorted by: oldest pending first, then low-confidence first

## v1 vs Later
**v1:** AI extracts fields; confidence score shown; manual override always available.
**Later:** Auto-ingest from Gmail/WhatsApp webhook; learn from team edits to improve prompts; batch change detection.
