"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

const EMPTY = { title: "", kind: "custom", direction: "up", target: "", unit: "", deadline: "", notes: "" };

export function GoalBoard({ goals }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    setError("");
    try {
      await api("goal.save", form);
      setForm(EMPTY);
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStatus(goal, status) {
    await api("goal.save", { ...goal, status });
    router.refresh();
  }

  return (
    <div className="stack">
      <header>
        <p className="kicker">Goals</p>
        <h1>Targets you care about.</h1>
        <p className="lede">A lift, a body weight, a pain limit, or a weekly streak. Pause one when it stops mattering.</p>
      </header>
      <div className="stack">
        {goals.map((goal) => (
          <article className="card" key={goal.id}>
            <div className="spread">
              <h3>{goal.title}</h3>
              <span className="tag">{goal.status}</span>
            </div>
            <p className="muted">{goal.kind}{goal.target != null ? ` · target ${goal.target} ${goal.unit || ""}` : ""}{goal.deadline ? ` · by ${goal.deadline}` : ""}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{goal.notes}</p>
            <div className="row">
              <button className="btn ghost" type="button" onClick={() => setStatus(goal, goal.status === "active" ? "paused" : "active")}>{goal.status === "active" ? "Pause" : "Resume"}</button>
              <button className="btn good" type="button" onClick={() => setStatus(goal, "done")}>Mark done</button>
              <button className="btn danger" type="button" onClick={async () => { await api("goal.delete", { id: goal.id }); router.refresh(); }}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      <form className="card form-grid" onSubmit={save}>
        <label className="wide">Goal<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label>Kind
          <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
            <option value="custom">Custom</option>
            <option value="weight">Body weight</option>
            <option value="lift">A lift</option>
            <option value="pain">Pain</option>
            <option value="consistency">Consistency</option>
          </select>
        </label>
        <label>Direction
          <select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })}>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="hold">Hold</option>
          </select>
        </label>
        <label>Target<input value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} /></label>
        <label>Unit<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></label>
        <label>Deadline<input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label>
        <label className="wide">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <div><button className="btn copper" type="submit">Add goal</button></div>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
