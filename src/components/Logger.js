"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoButton } from "./VideoButton";
import { api } from "./api";
import { equipmentLabel } from "@/lib/catalog";
import { formatVolume, setVolume } from "@/lib/load";

function unitLabel(unit) {
  if (unit === "sec") return "Seconds";
  if (unit === "m") return "Meters";
  return "Reps";
}

export function Logger({ session, unit, catalog, priorLoads = {} }) {
  const router = useRouter();
  const [exercises, setExercises] = useState(session.exercises);
  const exercisesRef = useRef(exercises);
  const known = useRef(session.exercises.length);
  const [meta, setMeta] = useState({ energy: session.energy || "good", notes: session.notes || "" });
  const [index, setIndex] = useState(0);
  const [rest, setRest] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const active = exercises.filter((exercise) => !exercise.skipped);
  const current = active[Math.min(index, Math.max(active.length - 1, 0))];
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return catalog.filter((exercise) => exercise.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [catalog, query]);

  useEffect(() => {
    setExercises(session.exercises);
    exercisesRef.current = session.exercises;
    if (session.exercises.length > known.current) {
      const nextActive = session.exercises.filter((exercise) => !exercise.skipped);
      setIndex(Math.max(nextActive.length - 1, 0));
    }
    known.current = session.exercises.length;
  }, [session]);

  useEffect(() => {
    if (!rest) return undefined;
    const timer = setInterval(() => setRest((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [rest > 0]);

  function patchExercise(id, recipe) {
    setExercises((list) => list.map((exercise) => (exercise.id === id ? recipe(exercise) : exercise)));
  }

  async function persistSet(set) {
    setError("");
    try {
      await api("set.save", set);
    } catch (err) {
      setError(err.message);
    }
  }

  function updateSet(exerciseId, setId, field, value) {
    setExercises((list) => {
      const next = list.map((exercise) => (exercise.id === exerciseId
        ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)) }
        : exercise));
      exercisesRef.current = next;
      return next;
    });
  }

  async function toggleDone(exercise, set) {
    const next = { ...set, done: set.done ? 0 : 1 };
    updateSet(exercise.id, set.id, "done", next.done);
    await persistSet({ ...set, done: next.done });
    if (next.done && exercise.rest_sec) setRest(exercise.rest_sec);
  }

  async function addSet() {
    const created = await api("set.add", { sessionExerciseId: current.id });
    patchExercise(current.id, (exercise) => ({ ...exercise, sets: [...exercise.sets, created] }));
  }

  async function skip(exercise) {
    await api("exercise.skip", { id: exercise.id, skipped: true });
    patchExercise(exercise.id, (item) => ({ ...item, skipped: true }));
  }

  async function addExercise(exerciseId) {
    setError("");
    try {
      await api("session.addExercise", { sessionId: session.id, exerciseId });
      setQuery("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveMeta(extra = {}) {
    const next = { ...meta, ...extra };
    setMeta(next);
    await api("session.update", { id: session.id, ...next });
  }

  async function finish() {
    await api("session.update", { id: session.id, ...meta, complete: true });
    router.push("/history");
    router.refresh();
  }

  const doneCount = active.filter((exercise) => exercise.sets.length && exercise.sets.every((set) => set.done)).length;
  const workoutLoad = exercises.reduce((sum, exercise) => (
    sum + exercise.sets.reduce((inner, set) => inner + (set.done ? (setVolume(set) || 0) : 0), 0)
  ), 0);
  const previous = current ? priorLoads[current.exercise_id] : null;

  return (
    <div className="stack">
      <div className="spread">
        <p className="muted" style={{ margin: 0 }}>{doneCount} of {active.length} exercises logged · Load {formatVolume(workoutLoad, unit) || `0 ${unit}`}</p>
        <div className="row">
          <button type="button" className={`chip ${meta.energy === "good" ? "active" : ""}`} onClick={() => saveMeta({ energy: "good" })}>Good day</button>
          <button type="button" className={`chip ${meta.energy === "low" ? "active" : ""}`} onClick={() => saveMeta({ energy: "low" })}>Low day</button>
        </div>
      </div>
      {active.length ? (
        <div className="dots">
          {active.map((exercise, dot) => (
            <button key={exercise.id} type="button" title={exercise.name} className={dot === index ? "on" : exercise.sets.every((set) => set.done) ? "done" : ""} onClick={() => setIndex(dot)} />
          ))}
        </div>
      ) : null}
      {current ? (
        <article className="card stack">
          <div className="spread">
            <div>
              <h2>{current.name}</h2>
              <p className="muted">{current.dose}{current.equipment ? ` · ${pretty(current.equipment)}` : ""}</p>
              <p className="faint">{previous?.weight ? `Previous load ${previous.weight} ${unit} × ${previous.reps ?? "—"}` : "No load logged for this movement yet."}</p>
            </div>
            {current.video_id ? <VideoButton videoId={current.video_id} title={current.video_title || current.name} /> : null}
          </div>
          {current.images?.length ? (
            <div className="shot-row">
              {current.images.slice(0, 2).map((image) => (
                <figure className="shot" key={image.src}>
                  <img src={image.src} alt={image.caption || current.name} />
                </figure>
              ))}
            </div>
          ) : null}
          {current.steps?.length ? (
            <details>
              <summary>Steps</summary>
              <ol className="steps">{current.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </details>
          ) : null}
          <div className="stack">
            {current.sets.map((set) => (
              <div key={set.id} className="stack" style={{ gap: 4 }}>
              <div className={current.unilateral ? "set uni" : "set"}>
                <span className="idx">{set.set_index}</span>
                {current.unilateral ? (
                  <>
                    <label>L load, {unit}<input inputMode="decimal" value={set.weight ?? ""} onChange={(event) => updateSet(current.id, set.id, "weight", event.target.value)} onBlur={() => persistSet(setFrom(exercisesRef.current, current.id, set.id))} /></label>
                    <label>L {unitLabel(current.effort_unit)}<input value={set.reps ?? ""} onChange={(event) => updateSet(current.id, set.id, "reps", event.target.value)} onBlur={() => persistSet(setFrom(exercisesRef.current, current.id, set.id))} /></label>
                    <label>R load, {unit}<input inputMode="decimal" value={set.weight_r ?? ""} onChange={(event) => updateSet(current.id, set.id, "weight_r", event.target.value)} onBlur={() => persistSet(setFrom(exercisesRef.current, current.id, set.id))} /></label>
                    <label>R {unitLabel(current.effort_unit)}<input value={set.reps_r ?? ""} onChange={(event) => updateSet(current.id, set.id, "reps_r", event.target.value)} onBlur={() => persistSet(setFrom(exercisesRef.current, current.id, set.id))} /></label>
                  </>
                ) : (
                  <>
                    <label>Load, {unit}<input inputMode="decimal" value={set.weight ?? ""} onChange={(event) => updateSet(current.id, set.id, "weight", event.target.value)} onBlur={() => persistSet(setFrom(exercisesRef.current, current.id, set.id))} /></label>
                    <label>{unitLabel(current.effort_unit)}<input value={set.reps ?? ""} onChange={(event) => updateSet(current.id, set.id, "reps", event.target.value)} onBlur={() => persistSet(setFrom(exercisesRef.current, current.id, set.id))} /></label>
                  </>
                )}
                <label>Reps left<input value={set.rir ?? ""} onChange={(event) => updateSet(current.id, set.id, "rir", event.target.value)} onBlur={() => persistSet(setFrom(exercisesRef.current, current.id, set.id))} /></label>
                <button className={set.done ? "btn good" : "btn accent"} type="button" onClick={() => toggleDone(current, setFrom(exercises, current.id, set.id))}>{set.done ? "Logged" : "Log"}</button>
              </div>
              <p className="faint" style={{ margin: 0 }}>{setVolume(set) ? `Set load ${formatVolume(setVolume(set), unit)}` : "Enter the load and the reps. Log keeps both."}</p>
              </div>
            ))}
          </div>
          <div className="row">
            <button className="btn ghost" type="button" onClick={addSet}>Add a set</button>
            <button className="btn ghost" type="button" onClick={() => skip(current)}>Skip</button>
            <button className="btn ghost" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</button>
            <button className="btn" type="button" disabled={index >= active.length - 1} onClick={() => setIndex((value) => value + 1)}>Next</button>
          </div>
        </article>
      ) : (
        <div className="card">
          <h2>Add the first exercise.</h2>
          <p className="muted">Search the library. Each one starts with three sets.</p>
        </div>
      )}
      <div className="card stack">
        <label>Add exercise
          <input value={query} placeholder="Search, then tap a result" onChange={(event) => setQuery(event.target.value)} />
        </label>
        {matches.length ? (
          <div className="picker">
            {matches.map((exercise) => (
              <button key={exercise.id} type="button" onClick={() => addExercise(exercise.id)}>
                <strong>{exercise.name}</strong>
                <div className="faint">{pretty(exercise.equipment)}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <label className="card">Session note
        <textarea value={meta.notes} onChange={(event) => setMeta({ ...meta, notes: event.target.value })} onBlur={() => saveMeta()} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn accent" type="button" onClick={finish}>Finish workout</button>
      {rest > 0 ? (
        <div className="timer">
          <div>
            <strong>Rest {rest}s</strong>
            <div className="faint">Then the next set.</div>
          </div>
          <button className="btn ghost" type="button" onClick={() => setRest(0)}>Skip rest</button>
        </div>
      ) : null}
    </div>
  );
}

function pretty(value) {
  return equipmentLabel(value);
}

function setFrom(exercises, exerciseId, setId) {
  const exercise = exercises.find((item) => item.id === exerciseId);
  return exercise.sets.find((set) => set.id === setId);
}
