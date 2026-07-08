import type { ExtractedChange } from "@/lib/types";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function inferSourceChannel(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("subject:") || lower.includes("dear ") || emailPattern.test(text)) {
    return "email";
  }
  if (lower.includes("whatsapp") || lower.includes("hi") || lower.includes("please")) {
    return "whatsapp";
  }
  return "other";
}

export function fallbackExtract(rawInput: string): ExtractedChange {
  const text = rawInput.trim();
  const email = text.match(emailPattern)?.[0] || "";
  const compact = text.replace(emailPattern, "").replace(/\s+/g, " ").trim();
  const namePatterns = [
    /\b(?:move|update|change)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+(?:needs|wants|from|to|please)\b/,
    /\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/,
  ];

  const registrantName =
    namePatterns.map((pattern) => compact.match(pattern)?.[1]).find(Boolean) || "";

  const lower = compact.toLowerCase();
  const fieldChanged = lower.includes("diet")
    ? "dietary_requirement"
    : lower.includes("session")
      ? "session"
      : lower.includes("slot") || lower.includes("time")
        ? "session_time"
        : lower.includes("table")
          ? "table_number"
          : lower.includes("cancel")
            ? "registration_status"
            : "registration_change";

  const fromTo = compact.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:[.!?]|$)/i);
  const toOnly = compact.match(/\bto\s+(.+?)(?:[.!?]|$)/i);
  const oldValue = fromTo?.[1]?.trim() || "";
  const newValue = (fromTo?.[2] || toOnly?.[1] || "").trim();

  const signals = [registrantName, fieldChanged, newValue].filter(Boolean).length;

  return {
    registrant_name: registrantName,
    field_changed: fieldChanged,
    old_value: oldValue,
    new_value: newValue,
    requester_email: email,
    confidence: signals >= 3 ? 0.86 : signals === 2 ? 0.68 : 0.45,
    source: "rule-fallback",
    review_status: "unreviewed",
    notice: "Auto-fill used local rules because OpenAI was unavailable.",
  };
}

export async function extractWithOpenAI(rawInput: string): Promise<ExtractedChange> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackExtract(rawInput);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract a registration change request. Return JSON only with registrant_name, field_changed, old_value, new_value, requester_email, confidence, source, review_status. Use review_status='unreviewed'. Confidence is 0 to 1.",
          },
          { role: "user", content: rawInput },
        ],
      }),
    });

    if (!response.ok) {
      return fallbackExtract(rawInput);
    }

    const payload = await response.json();
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    const fallback = fallbackExtract(rawInput);

    return {
      registrant_name: String(parsed.registrant_name || fallback.registrant_name || ""),
      field_changed: String(parsed.field_changed || fallback.field_changed || ""),
      old_value: String(parsed.old_value || fallback.old_value || ""),
      new_value: String(parsed.new_value || fallback.new_value || ""),
      requester_email: String(parsed.requester_email || fallback.requester_email || ""),
      confidence: Number(parsed.confidence || fallback.confidence || 0),
      source: String(parsed.source || "openai-gpt-4o"),
      review_status: "unreviewed",
    };
  } catch {
    return fallbackExtract(rawInput);
  }
}
