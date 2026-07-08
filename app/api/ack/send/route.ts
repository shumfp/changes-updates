import { auditMetadata } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { missingEnvResponse, requiredEnv } from "@/lib/env";

function acknowledgementBody(change: {
  registrant_name: string | null;
  field_changed: string | null;
  new_value: string | null;
  status: string | null;
}) {
  const statusText = change.status === "confirmed" ? "confirmed" : "reviewed";
  return [
    `Hi,`,
    "",
    `We have ${statusText} the registration change for ${change.registrant_name || "the registrant"}.`,
    `Updated field: ${change.field_changed || "registration"}`,
    `New value: ${change.new_value || "as requested"}`,
    "",
    "Thank you.",
  ].join("\n");
}

export async function POST(request: Request) {
  const missing = requiredEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "RESEND_API_KEY",
  ]);
  if (missing.length) return missingEnvResponse(missing);

  const { change_request_id } = await request.json();
  if (!change_request_id) {
    return Response.json({ error: "Change request id is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: change, error: findError } = await supabase
    .from("change_requests")
    .select("*, acknowledgements(*)")
    .eq("id", change_request_id)
    .single();

  if (findError || !change) {
    return Response.json({ error: findError?.message || "Change request not found." }, { status: 404 });
  }

  if (!["confirmed", "rejected"].includes(change.status)) {
    return Response.json({ error: "Confirm or reject the request before sending an acknowledgement." }, { status: 400 });
  }
  if (!change.requester_email) {
    return Response.json({ error: "Requester email is required before sending an acknowledgement." }, { status: 400 });
  }
  if (change.acknowledgements?.length) {
    return Response.json({ error: "Acknowledgement already sent." }, { status: 409 });
  }

  const body = acknowledgementBody(change);
  const from = process.env.ACK_FROM_EMAIL || "Registration Changes <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [change.requester_email],
      subject: `Registration change ${change.status}`,
      text: body,
    }),
  });

  if (!response.ok) {
    return Response.json({ error: "Email could not be sent." }, { status: 502 });
  }

  const { data: acknowledgement, error: ackError } = await supabase
    .from("acknowledgements")
    .insert({
      change_request_id,
      sent_to: change.requester_email,
      body,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (ackError) return Response.json({ error: ackError.message }, { status: 500 });

  const { error: auditError } = await supabase.from("audit_logs").insert({
    change_request_id,
    action: "ack_sent",
    actor_label: "team_member",
    old_status: change.status,
    new_status: change.status,
    metadata: auditMetadata(change, {
      sent_to: change.requester_email,
      resend_response: await response.json().catch(() => ({})),
    }),
  });

  if (auditError) return Response.json({ error: auditError.message }, { status: 500 });

  return Response.json({ data: acknowledgement });
}
