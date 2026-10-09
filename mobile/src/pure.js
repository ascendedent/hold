export function youtubeId(input) {
  const value = String(input || "").trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  const match = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return match ? match[1] : "";
}

export function interpretDose(dose, block) {
  const text = String(dose || "");
  const low = text.toLowerCase();
  const setCount = Number((text.match(/(\d+)/) || [0, 1])[1]) || 1;
  let effort = "reps";
  if (low.includes("hold")) effort = "sec";
  else if (/\d+\s*m\b/.test(low)) effort = "m";
  else if (/x\s*\d+\s*sec/.test(low) && !/x\s*\d+\s*,/.test(low) && !low.includes("rep")) effort = "sec";
  const mins = [...text.matchAll(/(\d+)\s*min/g)].map((match) => Number(match[1]));
  let rest = 75;
  if (mins.length) rest = Math.round((mins.reduce((sum, value) => sum + value, 0) / mins.length) * 60);
  else if (["warmup", "shoulder", "foot"].includes(String(block || "").toLowerCase())) rest = 30;
  else if (String(block || "").toLowerCase().startsWith("primary")) rest = 150;
  else if (String(block || "").toLowerCase().includes("finisher")) rest = 60;
  return { setCount: Math.min(Math.max(setCount, 1), 12), effort, rest };
}

export function heartZones(age) {
  const years = Number(age);
  if (!years || years < 10 || years > 100) return null;
  const max = Math.round(208 - 0.7 * years);
  const band = (lo, hi) => `${Math.round(max * lo)}–${Math.round(max * hi)}`;
  return { max, warmup: band(0.5, 0.7), lifting: band(0.7, 0.85), finisher: band(0.8, 0.9) };
}

export function e1rm(weight, reps) {
  if (!weight || !reps) return null;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function bestLoad(row) {
  const left = row.weight;
  const right = row.weight_r;
  let weight = left;
  let reps = row.reps;
  if (right != null && (left == null || right < left)) {
    weight = right;
    reps = row.reps_r ?? row.reps;
  }
  return { weight, reps };
}

// Weight × reps. Timed holds and carries store seconds or meters in reps,
// which is not load, so they count as none.
export function setVolume(set) {
  if (set.effort_unit && set.effort_unit !== "reps") return null;
  const num = (value) => {
    if (value == null || value === "") return 0;
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  let total = num(set.weight) * num(set.reps);
  if (num(set.weight_r) > 0) total += num(set.weight_r) * (num(set.reps_r) || num(set.reps));
  if (total <= 0) return null;
  return Math.round(total * 10) / 10;
}

export function formatVolume(volume, unit = "lb") {
  if (volume == null || Number(volume) <= 0) return "";
  const text = String(Math.round(Number(volume))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${text} ${unit}`;
}

export function prettyEquipment(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "Any equipment";
  if (raw === "body only" || raw === "body weight" || raw === "bodyweight") return "Bodyweight";
  if (raw === "dumbbell" || raw === "dumbbells") return "Dumbbell";
  if (raw === "kettlebell" || raw === "kettlebells") return "Kettlebell";
  if (raw === "band" || raw === "bands" || raw === "resistance band") return "Band";
  return value;
}

export function todayStamp() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Consecutive items in the same block form one group. Two or more in a
// "Superset" block are done back to back and tagged A1, A2, then B1, B2.
export function groupBlocks(items) {
  const groups = [];
  for (const item of items) {
    const block = item.block || "";
    const last = groups[groups.length - 1];
    if (last && last.block === block) last.items.push({ ...item });
    else groups.push({ block, items: [{ ...item }] });
  }
  let letter = 0;
  for (const group of groups) {
    group.superset = /^superset/i.test(group.block) && group.items.length > 1;
    if (!group.superset) continue;
    group.code = String.fromCharCode(65 + letter);
    letter += 1;
    group.items.forEach((item, index) => { item.tag = `${group.code}${index + 1}`; });
  }
  return groups;
}

export const EFFORT = {
  reps: { label: "Reps", short: "reps", keyboard: "number-pad" },
  sec: { label: "Seconds", short: "sec", keyboard: "number-pad" },
  m: { label: "Meters", short: "m", keyboard: "number-pad" },
};
