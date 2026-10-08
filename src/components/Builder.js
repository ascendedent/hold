"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StartPanel } from "./StartPanel";
import { api } from "./api";

export function Builder({ template, exercises }) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [notes, setNotes] = useState(template.notes || "");
  const [summary, setSummary] = useState(template.summary || "");
  const [query, setQuery] = useState("");
  const [dose, setDose] = useState("3 x 8");
  const [error, setError] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [exercises, query]);

  async function run(op, payload) {
    setError("");
    try {
      await api(op, payload);
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <div className="card stack">
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Summary<input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Push, short, about 45 minutes" /></label>
        <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <div className="row">
          <button className="btn accent" type="button" onClick={() => run("template.save", { ...template, name, notes, summary })}>Save details</button>
          <button className="btn ghost" type="button" onClick={async () => { const copy = await api("template.clone", { id: template.id }); router.push(`/workouts/${copy.id}`); }}>Duplicate</button>
          <button className="btn danger" type="button" onClick={async () => { await api("template.save", { ...template, name, notes, summary, archived: true }); router.push("/workouts"); }}>Archive</button>
        </div>
      </div>
      <div className="card">
        {template.items.length ? (
          <table className="table">
            <thead><tr><th></th><th>Exercise</th><th>Dose</th><th></th></tr></thead>
            <tbody>
              {template.items.map((item) => (
                <tr key={item.id}>
                  <td className="row">
                    <button className="btn ghost" type="button" onClick={() => run("item.move", { id: item.id, direction: -1 })}>Up</button>
                    <button className="btn ghost" type="button" onClick={() => run("item.move", { id: item.id, direction: 1 })}>Down</button>
                  </td>
                  <td>
                    <strong>{item.exercise_name}</strong>
                    <div className="faint">{item.equipment || ""}</div>
                  </td>
                  <td><input defaultValue={item.dose} onBlur={(event) => run("item.update", { id: item.id, dose: event.target.value, block: item.block })} /></td>
                  <td><button className="btn danger" type="button" onClick={() => run("item.delete", { id: item.id })}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No exercises yet. Search below and add the first one.</p>}
      </div>
      <div className="card stack">
        <label>Add an exercise
          <input value={query} placeholder="Search the library" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>Dose<input value={dose} onChange={(event) => setDose(event.target.value)} /></label>
        {matches.length ? (
          <div className="picker">
            {matches.map((exercise) => (
              <button key={exercise.id} type="button" onClick={() => { run("item.add", { templateId: template.id, exerciseId: exercise.id, block: "Lift", dose }); setQuery(""); }}>
                <strong>{exercise.name}</strong>
                <div className="faint">{exercise.equipment || "Any equipment"}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      <StartPanel templateId={template.id} />
    </div>
  );
}
