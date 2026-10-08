"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const MUSCLES = ["abdominals", "abductors", "adductors", "biceps", "calves", "chest", "forearms", "glutes", "hamstrings", "lats", "lower back", "middle back", "neck", "quadriceps", "shoulders", "traps", "triceps"];

export function LibraryBrowser({ exercises }) {
  const [muscle, setMuscle] = useState("all");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = useMemo(() => exercises.filter((exercise) => {
    const muscleOk = muscle === "all" || exercise.muscles?.includes(muscle);
    const text = `${exercise.name} ${exercise.equipment} ${exercise.category} ${(exercise.muscles || []).join(" ")}`.toLowerCase();
    return muscleOk && (!needle || text.includes(needle));
  }), [exercises, muscle, needle]);

  return (
    <div className="stack">
      <input placeholder="Search exercises, equipment, muscles" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="row">
        <button type="button" className={`chip ${muscle === "all" ? "active" : ""}`} onClick={() => setMuscle("all")}>All</button>
        {MUSCLES.map((item) => (
          <button key={item} type="button" className={`chip ${muscle === item ? "active" : ""}`} onClick={() => setMuscle(item)}>{item}</button>
        ))}
      </div>
      <p className="faint">{shown.length} exercise{shown.length === 1 ? "" : "s"}</p>
      <div className="library">
        {shown.slice(0, 60).map((exercise) => (
          <Link className="card lib-card" key={exercise.id} href={`/library/${exercise.id}`}>
            {exercise.images?.[0] ? <img src={exercise.images[0].src} alt="" /> : <div className="ph">No photo</div>}
            <div>
              <p className="tag">{exercise.muscles?.[0] || exercise.category || "Exercise"}</p>
              <h3>{exercise.name}</h3>
              <p className="faint">{prettyEquipment(exercise.equipment)}{exercise.level ? ` · ${exercise.level}` : ""}</p>
            </div>
          </Link>
        ))}
      </div>
      {shown.length > 60 ? <p className="muted">Showing the first 60. Search or pick a muscle to narrow it.</p> : null}
    </div>
  );
}

function prettyEquipment(value) {
  if (!value || value === "body only") return "Bodyweight";
  return value;
}
