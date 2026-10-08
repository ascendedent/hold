"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

const AREAS = [
  ["training", "Training"],
  ["recovery", "Recovery"],
  ["life", "Life"],
  ["focus", "Focus"],
];

export function ContextBoard({ me, notes, zones }) {
  const router = useRouter();
  const [area, setArea] = useState("training");
  const [profileForm, setProfileForm] = useState({
    name: me.name,
    age: me.age ?? "",
    unit: me.unit,
  });
  const [draft, setDraft] = useState({ title: "", body: "", pinned: false });
  const [error, setError] = useState("");
  const shown = notes.filter((note) => note.area === area);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    try {
      await api("profile.save", profileForm);
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    setError("");
    try {
      await api("note.save", { ...draft, area, pinned: draft.pinned ? 1 : 0 });
      setDraft({ title: "", body: "", pinned: false });
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <header>
        <p className="kicker">You</p>
        <h1>Your log.</h1>
        <p className="lede">Name, units, and notes you write yourself. Nothing here is prefilled from a plan.</p>
      </header>
      <form className="card form-grid" onSubmit={saveProfile}>
        <label>Name<input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
        <label>Age<input inputMode="numeric" value={profileForm.age} onChange={(event) => setProfileForm({ ...profileForm, age: event.target.value })} placeholder="Optional, for heart-rate zones" /></label>
        <label>Unit
          <select value={profileForm.unit} onChange={(event) => setProfileForm({ ...profileForm, unit: event.target.value })}>
            <option value="lb">Pounds</option>
            <option value="kg">Kilograms</option>
          </select>
        </label>
        <div style={{ alignSelf: "end" }}><button className="btn accent" type="submit">Save profile</button></div>
      </form>
      {zones ? <p className="muted">Estimated max heart rate {zones.max}. Warmup {zones.warmup}. Lifting {zones.lifting}. Finisher {zones.finisher}.</p> : null}
      <div className="row">
        {AREAS.map(([key, label]) => (
          <button key={key} type="button" className={`chip ${area === key ? "active" : ""}`} onClick={() => setArea(key)}>{label}</button>
        ))}
      </div>
      {shown.map((note) => (
        <article className="card" key={note.id}>
          <div className="spread">
            <h3>{note.title}</h3>
            <span className="faint">{note.pinned ? "Pinned · " : ""}{note.logged_on}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{note.body}</p>
          <button className="btn danger" type="button" onClick={async () => { await api("note.delete", { id: note.id }); router.refresh(); }}>Delete</button>
        </article>
      ))}
      <form className="card stack" onSubmit={saveNote}>
        <h3>Add a {AREAS.find(([key]) => key === area)[1].toLowerCase()} note</h3>
        <label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
        <label>Note<textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required /></label>
        <label className="row"><input type="checkbox" style={{ width: "auto" }} checked={draft.pinned} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })} /> Pin this</label>
        <button className="btn" type="submit">Add note</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
