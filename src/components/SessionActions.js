"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export function SessionActions({ id, completed }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);

  async function run(op) {
    setError("");
    try {
      await api(op, { id });
      if (op === "session.delete") router.push("/history");
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="row">
      {completed ? <button className="btn ghost" type="button" onClick={() => run("session.reopen")}>Reopen</button> : null}
      {armed ? (
        <button className="btn danger" type="button" onClick={() => run("session.delete")}>Delete this session for good</button>
      ) : (
        <button className="btn danger" type="button" onClick={() => setArmed(true)}>Delete session</button>
      )}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
