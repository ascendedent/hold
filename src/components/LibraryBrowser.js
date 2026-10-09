"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { choiceLabel, equipmentLabel, matchesExercise, muscleSummary, sortExercises } from "@/lib/catalog";
import { ExerciseFilters } from "./ExerciseFilters";

export function LibraryBrowser({ exercises }) {
  const [query, setQuery] = useState("");
  const [grouping, setGrouping] = useState("");
  const [muscles, setMuscles] = useState([]);
  const [gear, setGear] = useState([]);
  const [multiOnly, setMultiOnly] = useState(false);
  const [sort, setSort] = useState("name");
  const shown = useMemo(() => sortExercises(
    exercises.filter((exercise) => matchesExercise(exercise, {
      query, muscles, equipment: gear, grouping, multiOnly,
    })),
    sort,
  ), [exercises, query, muscles, gear, grouping, multiOnly, sort]);

  return (
    <div className="stack">
      <ExerciseFilters
        exercises={exercises}
        query={query}
        onQuery={setQuery}
        grouping={grouping}
        onGrouping={setGrouping}
        muscles={muscles}
        onMuscles={setMuscles}
        equipment={gear}
        onEquipment={setGear}
        multiOnly={multiOnly}
        onMultiOnly={setMultiOnly}
        sort={sort}
        onSort={setSort}
      />
      <p className="faint">{shown.length} exercise{shown.length === 1 ? "" : "s"}</p>
      <div className="library">
        {shown.map((exercise) => (
          <Link className="card lib-card" key={exercise.id} href={`/library/${exercise.id}`}>
            {exercise.images?.[0] ? <img src={exercise.images[0].src} alt="" loading="lazy" /> : <div className="ph">No photo</div>}
            <div>
              <p className="tag">{choiceLabel(exercise.muscles?.[0] || exercise.category || "Exercise")}</p>
              <h3>{exercise.name}</h3>
              <p className="faint">{[equipmentLabel(exercise.equipment), exercise.level, muscleSummary(exercise)].filter(Boolean).join(" · ")}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
