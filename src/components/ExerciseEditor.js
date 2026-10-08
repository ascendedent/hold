"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export function ExerciseEditor({ exercise }) {
  const router = useRouter();
  const [form, setForm] = useState({
    id: exercise?.id,
    name: exercise?.name || "",
    category: exercise?.category || "",
    equipment: exercise?.equipment || "",
    watch_out: exercise?.watch_out || "",
    for_you: exercise?.for_you || "",
    steps: (exercise?.steps || []).join("\n"),
    unilateral: Boolean(exercise?.unilateral),
    video: "",
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setSaved("");
    try {
      const result = await api("exercise.save", form);
      setSaved("Saved.");
      if (!exercise) router.push(`/library/${result.id}`);
      else router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card stack" onSubmit={save}>
      <h3>{exercise ? "Edit this exercise" : "Add an exercise"}</h3>
      <div className="form-grid">
        <label className="wide">Name<input value={form.name} onChange={(event) => set("name", event.target.value)} required /></label>
        <label>Category<input value={form.category} onChange={(event) => set("category", event.target.value)} /></label>
        <label>Equipment<input value={form.equipment} onChange={(event) => set("equipment", event.target.value)} /></label>
        <label className="wide">Steps, one per line<textarea value={form.steps} onChange={(event) => set("steps", event.target.value)} /></label>
        <label className="wide">Coaching note<textarea value={form.watch_out} onChange={(event) => set("watch_out", event.target.value)} /></label>
        <label className="wide">Your note<textarea value={form.for_you} onChange={(event) => set("for_you", event.target.value)} /></label>
        <label className="wide">YouTube link
          <input value={form.video} placeholder={exercise?.video_id ? "Replace the current demo" : "https://www.youtube.com/watch?v=…"} onChange={(event) => set("video", event.target.value)} />
        </label>
      </div>
      <label className="row"><input type="checkbox" style={{ width: "auto" }} checked={form.unilateral} onChange={(event) => set("unilateral", event.target.checked)} /> Left and right are logged separately</label>
      <p className="faint">A YouTube link plays inside Hold. The file is streamed, not downloaded.</p>
      <button className="btn copper" type="submit">Save</button>
      {saved ? <p className="muted">{saved}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
