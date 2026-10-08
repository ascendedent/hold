"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export function StartPanel({ templateId, label = "Start this routine" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const result = await api("session.start", { templateId, energy: "good" });
      router.push(`/session/${result.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h3>Train</h3>
      <p className="muted">Starts a fresh log from this routine. Later edits to the routine do not rewrite this session.</p>
      <button className="btn accent" type="button" onClick={start} disabled={busy || !templateId}>{busy ? "Opening…" : label}</button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
