"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export function QuickStart() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const result = await api("session.blank", { name: "Workout" });
      router.push(`/session/${result.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <button className="btn accent" type="button" onClick={start} disabled={busy}>{busy ? "Opening…" : "Start empty workout"}</button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
