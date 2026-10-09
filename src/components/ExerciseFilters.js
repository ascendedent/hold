"use client";

import { useEffect, useRef, useState } from "react";
import { GROUPINGS, choiceLabel, equipmentOptions, muscleOptions } from "@/lib/catalog";

export function ExerciseFilters({
  exercises,
  query,
  onQuery,
  grouping,
  onGrouping,
  muscles,
  onMuscles,
  equipment,
  onEquipment,
  multiOnly,
  onMultiOnly,
  sort,
  onSort,
}) {
  const muscleChoices = muscleOptions(exercises);
  const gearChoices = equipmentOptions(exercises);
  const groupingLabel = GROUPINGS.find((item) => item.id === grouping)?.label;
  const active = Boolean(grouping || muscles.length || equipment.length || multiOnly || query || sort === "muscles");

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <div className="stack">
      <input placeholder="Search exercises" value={query} onChange={(event) => onQuery(event.target.value)} />
      <div className="filters">
        <label className="filter-field">Split
          <select value={grouping} onChange={(event) => onGrouping(event.target.value)}>
            <option value="">Any split</option>
            {GROUPINGS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <FilterMenu
          label="Muscles"
          count={muscles.length}
          hint="The movement has to train every muscle you check."
          options={muscleChoices.map((item) => ({ value: item, label: choiceLabel(item) }))}
          selected={muscles}
          onToggle={(value) => toggle(muscles, onMuscles, value)}
        />
        <FilterMenu
          label="Equipment"
          count={equipment.length}
          hint="Any checked equipment matches."
          options={gearChoices.map((item) => ({ value: item, label: item }))}
          selected={equipment}
          onToggle={(value) => toggle(equipment, onEquipment, value)}
        />
        <label className="filter-field">Sort
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option value="name">Name</option>
            <option value="muscles">Most muscle groups</option>
          </select>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={multiOnly} onChange={(event) => onMultiOnly(event.target.checked)} />
        Only movements that train more than one muscle group
      </label>
      {active ? (
        <div className="row">
          {groupingLabel ? <button type="button" className="chip active" onClick={() => onGrouping("")}>{groupingLabel} ×</button> : null}
          {muscles.map((item) => (
            <button key={item} type="button" className="chip active" onClick={() => toggle(muscles, onMuscles, item)}>{choiceLabel(item)} ×</button>
          ))}
          {equipment.map((item) => (
            <button key={item} type="button" className="chip active" onClick={() => toggle(equipment, onEquipment, item)}>{item} ×</button>
          ))}
          {multiOnly ? <button type="button" className="chip active" onClick={() => onMultiOnly(false)}>Multi-muscle ×</button> : null}
          {sort === "muscles" ? <button type="button" className="chip active" onClick={() => onSort("name")}>Most muscles ×</button> : null}
          <button type="button" className="btn ghost" onClick={() => { onQuery(""); onGrouping(""); onMuscles([]); onEquipment([]); onMultiOnly(false); onSort("name"); }}>Clear</button>
        </div>
      ) : null}
    </div>
  );
}

function FilterMenu({ label, count, hint, options, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (!box.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="menu" ref={box}>
      <button type="button" className="menu-btn" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {label}{count ? ` · ${count}` : ""}
      </button>
      {open ? (
        <div className="menu-pop">
          <p className="faint">{hint}</p>
          {options.map((option) => (
            <label className="check" key={option.value}>
              <input type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
