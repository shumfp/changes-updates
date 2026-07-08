"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChangeRequest, ExtractedChange } from "@/lib/types";

const initialForm = {
  raw_input: "",
  source_channel: "whatsapp",
  registrant_name: "",
  field_changed: "",
  old_value: "",
  new_value: "",
  requester_email: "",
  sheet_row_id: "",
  confidence: 0,
  source: "manual",
  review_status: "reviewed",
};

type FormState = typeof initialForm;

function statusClass(status: string | null | undefined) {
  if (status === "confirmed") return "badge badge-green";
  if (status === "rejected") return "badge badge-red";
  return "badge badge-yellow";
}

function confidenceClass(confidence: number) {
  if (confidence >= 0.85) return "confidence confidence-green";
  if (confidence >= 0.6) return "confidence confidence-amber";
  return "confidence confidence-red";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Home() {
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const pendingCount = useMemo(
    () => changes.filter((change) => change.status === "pending").length,
    [changes],
  );

  async function loadChanges() {
    setError("");
    const response = await fetch("/api/change-requests", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Change requests could not be loaded.");
      setChanges([]);
      setLoading(false);
      return;
    }
    setChanges(payload.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadChanges();

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel("change-request-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "change_requests" },
        () => loadChanges(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "acknowledgements" },
        () => loadChanges(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function updateForm(key: keyof FormState, value: string | number) {
    setForm((current) => ({
      ...current,
      [key]: value,
      review_status:
        current.source !== "manual" &&
        ["registrant_name", "field_changed", "old_value", "new_value"].includes(key)
          ? "edited"
          : current.review_status,
    }));
  }

  async function extract() {
    if (!form.raw_input.trim()) {
      setError("Paste the request text first.");
      return;
    }

    setExtracting(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/ai/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_input: form.raw_input }),
    });
    const payload = (await response.json().catch(() => ({}))) as Partial<ExtractedChange> & {
      source_channel?: string;
      error?: string;
    };
    setExtracting(false);

    if (!response.ok) {
      setError(payload.error || "Auto-fill unavailable - please fill in manually.");
      return;
    }

    setForm((current) => ({
      ...current,
      source_channel: payload.source_channel || current.source_channel,
      registrant_name: payload.registrant_name || current.registrant_name,
      field_changed: payload.field_changed || current.field_changed,
      old_value: payload.old_value || current.old_value,
      new_value: payload.new_value || current.new_value,
      requester_email: payload.requester_email || current.requester_email,
      confidence: Number(payload.confidence || 0),
      source: payload.source || "ai",
      review_status: payload.review_status || "unreviewed",
    }));
    setNotice(payload.notice || "Auto-fill complete.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(payload.error || "Change request could not be saved.");
      return;
    }

    setForm(initialForm);
    setNotice("Change request logged.");
    await loadChanges();
  }

  async function setStatus(id: string, status: "confirmed" | "rejected") {
    setActingId(id);
    setError("");
    setNotice("");
    const response = await fetch(`/api/change-requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json().catch(() => ({}));
    setActingId(null);

    if (!response.ok) {
      setError(payload.error || "Status could not be updated.");
      return;
    }
    setNotice(status === "confirmed" ? "Confirmed and synced to the Sheet." : "Rejected and synced to the Sheet.");
    await loadChanges();
  }

  async function sendAck(id: string) {
    setActingId(id);
    setError("");
    setNotice("");
    const response = await fetch("/api/ack/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change_request_id: id }),
    });
    const payload = await response.json().catch(() => ({}));
    setActingId(null);

    if (!response.ok) {
      setError(payload.error || "Email could not be sent.");
      return;
    }
    setNotice("Acknowledgement sent.");
    await loadChanges();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Registration Changes</p>
          <h1>Change desk</h1>
        </div>
        <nav>
          <Link href="/" className="nav-link active">
            Dashboard
          </Link>
          <Link href="/audit" className="nav-link">
            Audit
          </Link>
        </nav>
      </header>

      <section className="metrics">
        <div>
          <span>{changes.length}</span>
          <p>Total requests</p>
        </div>
        <div>
          <span>{pendingCount}</span>
          <p>Pending review</p>
        </div>
        <div>
          <span>{changes.filter((change) => change.acknowledgements?.length).length}</span>
          <p>Acknowledged</p>
        </div>
      </section>

      {(error || notice) && (
        <div className={error ? "toast error" : "toast success"}>{error || notice}</div>
      )}

      <section className="workspace">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="panel-heading">
            <h2>Log change</h2>
            {form.source !== "manual" && (
              <span className={confidenceClass(Number(form.confidence))}>
                {Math.round(Number(form.confidence) * 100)}%
              </span>
            )}
          </div>

          <label>
            Request text
            <textarea
              value={form.raw_input}
              onChange={(event) => updateForm("raw_input", event.target.value)}
              placeholder="John Doe needs to change his session from 9am to 2pm"
              rows={5}
            />
          </label>

          <div className="form-actions">
            <button type="button" className="secondary" onClick={extract} disabled={extracting}>
              {extracting ? "Filling..." : "Auto-fill"}
            </button>
          </div>

          <div className="grid-fields">
            <label>
              Registrant
              <input
                value={form.registrant_name}
                onChange={(event) => updateForm("registrant_name", event.target.value)}
              />
            </label>
            <label>
              Field
              <input
                value={form.field_changed}
                onChange={(event) => updateForm("field_changed", event.target.value)}
              />
            </label>
            <label>
              Old value
              <input
                value={form.old_value}
                onChange={(event) => updateForm("old_value", event.target.value)}
              />
            </label>
            <label>
              New value
              <input
                value={form.new_value}
                onChange={(event) => updateForm("new_value", event.target.value)}
              />
            </label>
            <label>
              Requester email
              <input
                type="email"
                value={form.requester_email}
                onChange={(event) => updateForm("requester_email", event.target.value)}
              />
            </label>
            <label>
              Sheet row
              <input
                value={form.sheet_row_id}
                onChange={(event) => updateForm("sheet_row_id", event.target.value)}
                placeholder="row_12"
              />
            </label>
          </div>

          <button className="primary" disabled={saving}>
            {saving ? "Saving..." : "Save request"}
          </button>
        </form>

        <section className="panel table-panel">
          <div className="panel-heading">
            <h2>Requests</h2>
            <button type="button" className="icon-button" onClick={loadChanges} aria-label="Refresh">
              ↻
            </button>
          </div>

          {loading ? (
            <div className="state">Loading requests...</div>
          ) : error && !changes.length ? (
            <div className="state error-state">Requests could not be loaded.</div>
          ) : !changes.length ? (
            <div className="state">No change requests yet.</div>
          ) : (
            <div className="request-list">
              {changes.map((change) => {
                const ackSent = Boolean(change.acknowledgements?.length);
                const status = String(change.status || "pending");
                return (
                  <article className="request-row" key={change.id}>
                    <div className="request-main">
                      <div>
                        <h3>{change.registrant_name || "Unnamed registrant"}</h3>
                        <p>
                          {change.field_changed || "registration"}:{" "}
                          <strong>{change.old_value || "current"}</strong> →{" "}
                          <strong>{change.new_value || "new value"}</strong>
                        </p>
                        <small>
                          {change.source_channel || "other"} · {change.sheet_row_id || "no row"} ·{" "}
                          {formatDate(change.created_at)}
                        </small>
                      </div>
                      <div className="row-badges">
                        <span className={statusClass(status)}>{status}</span>
                        {change.new_value_confidence !== null && (
                          <span className={confidenceClass(Number(change.new_value_confidence))}>
                            {Math.round(Number(change.new_value_confidence) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary"
                        disabled={status !== "pending" || actingId === change.id}
                        onClick={() => setStatus(change.id, "confirmed")}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="secondary danger"
                        disabled={status !== "pending" || actingId === change.id}
                        onClick={() => setStatus(change.id, "rejected")}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="primary"
                        disabled={
                          !["confirmed", "rejected"].includes(status) ||
                          ackSent ||
                          actingId === change.id
                        }
                        onClick={() => sendAck(change.id)}
                      >
                        {ackSent ? "Ack sent" : "Send ack"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
