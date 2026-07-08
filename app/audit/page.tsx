"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuditLog } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    setError("");
    const response = await fetch("/api/audit", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Audit log could not be loaded.");
      setLogs([]);
      setLoading(false);
      return;
    }
    setLogs(payload.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Registration Changes</p>
          <h1>Audit log</h1>
        </div>
        <nav>
          <Link href="/" className="nav-link">
            Dashboard
          </Link>
          <Link href="/audit" className="nav-link active">
            Audit
          </Link>
        </nav>
      </header>

      {error && <div className="toast error">{error}</div>}

      <section className="panel audit-panel">
        <div className="panel-heading">
          <h2>Activity</h2>
          <button type="button" className="icon-button" onClick={loadLogs} aria-label="Refresh">
            ↻
          </button>
        </div>

        {loading ? (
          <div className="state">Loading activity...</div>
        ) : error ? (
          <div className="state error-state">Audit log could not be loaded.</div>
        ) : !logs.length ? (
          <div className="state">No activity yet.</div>
        ) : (
          <div className="audit-list">
            {logs.map((log) => (
              <article className="audit-row" key={log.id}>
                <div>
                  <strong>{log.action || "action"}</strong>
                  <p>
                    {log.change_requests?.registrant_name || "Unknown registrant"} ·{" "}
                    {log.change_requests?.field_changed || "registration"}
                  </p>
                </div>
                <div className="audit-meta">
                  <span>{log.actor_label || "system"}</span>
                  <small>{formatDate(log.created_at)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
