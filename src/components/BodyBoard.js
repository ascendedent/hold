"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

const FIELDS = [
  ["weight", "Weight"],
  ["waist", "Waist"],
  ["chest", "Chest"],
  ["hips", "Hips"],
  ["thigh", "Thigh"],
  ["arm", "Arm"],
  ["neck", "Neck"],
];

export function BodyBoard({ logs, unit }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ logged_on: today, notes: "" });
  const [error, setError] = useState("");
  const weights = [...logs].filter((row) => row.weight != null).reverse();

  async function save(event) {
    event.preventDefault();
    setError("");
    try {
      await api("body.save", { ...form, unit });
      setForm({ logged_on: today, notes: "" });
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <header>
        <p className="kicker">Body</p>
        <h1>Weight and measurements.</h1>
        <p className="lede">The scale is one number. Waist, chest, hips, thigh, arm, and neck tell you what changed with it.</p>
      </header>
      <div className="card">
        <Chart values={weights.map((row) => row.weight)} />
        {weights.length ? <p className="faint">Latest {weights[weights.length - 1].weight} {weights[weights.length - 1].unit} on {weights[weights.length - 1].logged_on}</p> : <p className="muted">Log a weigh-in and the line starts.</p>}
      </div>
      <form className="card form-grid" onSubmit={save}>
        <label>Date<input type="date" value={form.logged_on} onChange={(event) => setForm({ ...form, logged_on: event.target.value })} required /></label>
        {FIELDS.map(([key, label]) => (
          <label key={key}>{label} ({key === "weight" ? unit : unit === "kg" ? "cm" : "in"})
            <input inputMode="decimal" value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
        <label className="wide">Note<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <div><button className="btn copper" type="submit">Save entry</button></div>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {logs.length ? (
        <table className="table">
          <thead><tr><th>Date</th>{FIELDS.map(([, label]) => <th key={label}>{label}</th>)}<th></th></tr></thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td>{row.logged_on}</td>
                {FIELDS.map(([key]) => <td key={key}>{row[key] ?? "—"}</td>)}
                <td><button className="btn danger" type="button" onClick={async () => { await api("body.delete", { id: row.id }); router.refresh(); }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export function Chart({ values }) {
  if (values.length < 2) return null;
  const width = 640;
  const height = 180;
  const pad = 16;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend">
      <polyline fill="none" stroke="#e08a4f" strokeWidth="3" points={points} />
    </svg>
  );
}
