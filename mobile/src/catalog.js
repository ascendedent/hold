const EQUIPMENT = {
  "body only": "Bodyweight",
  "body weight": "Bodyweight",
  bodyweight: "Bodyweight",
  dumbbell: "Dumbbell",
  dumbbells: "Dumbbell",
  barbell: "Barbell",
  "olympic barbell": "Barbell",
  "ez barbell": "EZ bar",
  "e-z curl bar": "EZ bar",
  "trap bar": "Trap bar",
  cable: "Cable",
  machine: "Machine",
  "leverage machine": "Leverage machine",
  "smith machine": "Smith machine",
  "sled machine": "Sled",
  kettlebell: "Kettlebell",
  kettlebells: "Kettlebell",
  band: "Band",
  bands: "Band",
  "resistance band": "Band",
  "medicine ball": "Medicine ball",
  "exercise ball": "Stability ball",
  "stability ball": "Stability ball",
  "bosu ball": "BOSU",
  "foam roll": "Foam roller",
  roller: "Foam roller",
  "wheel roller": "Ab wheel",
  weighted: "Weighted",
  assisted: "Assisted",
  rope: "Rope",
  other: "Other",
  hammer: "Hammer",
  tire: "Tire",
  "stationary bike": "Bike",
  "elliptical machine": "Elliptical",
  "stepmill machine": "Stair machine",
  "skierg machine": "Ski erg",
  "upper body ergometer": "Upper-body erg",
};

const MUSCLE = {
  abs: "abdominals",
  obliques: "abdominals",
  "hip flexors": "abdominals",
  core: "abdominals",
  "lower abs": "abdominals",
  pectorals: "chest",
  "upper chest": "chest",
  delts: "shoulders",
  deltoids: "shoulders",
  "rear deltoids": "shoulders",
  "rotator cuff": "shoulders",
  "serratus anterior": "shoulders",
  quads: "quadriceps",
  brachialis: "biceps",
  "cardiovascular system": "cardio",
  spine: "lower back",
  "upper back": "middle back",
  rhomboids: "middle back",
  back: "middle back",
  trapezius: "traps",
  "latissimus dorsi": "lats",
  "inner thighs": "adductors",
  groin: "adductors",
  soleus: "calves",
  "ankle stabilizers": "calves",
  ankles: "calves",
  shins: "calves",
  feet: "calves",
  "grip muscles": "forearms",
  hands: "forearms",
  wrists: "forearms",
  "wrist flexors": "forearms",
  "wrist extensors": "forearms",
  "levator scapulae": "neck",
  sternocleidomastoid: "neck",
};

const MUSCLE_ORDER = [
  "abdominals", "abductors", "adductors", "biceps", "calves", "cardio", "chest",
  "forearms", "glutes", "hamstrings", "lats", "lower back", "middle back", "neck",
  "quadriceps", "shoulders", "traps", "triceps",
];

const EQUIPMENT_ORDER = [
  "Bodyweight", "Dumbbell", "Barbell", "EZ bar", "Trap bar", "Kettlebell", "Cable",
  "Machine", "Smith machine", "Leverage machine", "Band", "Medicine ball",
  "Stability ball", "BOSU", "Sled", "Weighted", "Assisted", "Foam roller", "Ab wheel",
];

export function equipmentKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return EQUIPMENT[raw] || raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function equipmentLabel(value) {
  return equipmentKey(value) || "Any equipment";
}

export function muscleKey(value) {
  const raw = String(value || "").trim().toLowerCase();
  return MUSCLE[raw] || raw;
}

export function choiceLabel(value) {
  return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function byRank(order) {
  return (left, right) => {
    const leftRank = order.indexOf(left);
    const rightRank = order.indexOf(right);
    if (leftRank === -1 && rightRank === -1) return left.localeCompare(right);
    if (leftRank === -1) return 1;
    if (rightRank === -1) return -1;
    return leftRank - rightRank;
  };
}

export function muscleOptions(exercises) {
  const present = new Set();
  for (const exercise of exercises) {
    for (const muscle of exercise.muscles || []) {
      const key = muscleKey(muscle);
      if (key) present.add(key);
    }
  }
  return [...present].sort(byRank(MUSCLE_ORDER));
}

export function equipmentOptions(exercises) {
  const present = new Set();
  for (const exercise of exercises) {
    const key = equipmentKey(exercise.equipment);
    if (key) present.add(key);
  }
  return [...present].sort(byRank(EQUIPMENT_ORDER));
}

export const GROUPS = {
  back: ["lats", "middle back", "lower back", "traps"],
  chest: ["chest"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  shoulders: ["shoulders"],
  quads: ["quadriceps"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  core: ["abdominals"],
  calves: ["calves"],
};

export const GROUPINGS = [
  { id: "chest-triceps", label: "Chest + Triceps", groups: ["chest", "triceps"] },
  { id: "back-biceps", label: "Back + Biceps", groups: ["back", "biceps"] },
  { id: "shoulders-triceps", label: "Shoulders + Triceps", groups: ["shoulders", "triceps"] },
  { id: "chest-shoulders", label: "Chest + Shoulders", groups: ["chest", "shoulders"] },
  { id: "quads-hamstrings", label: "Quads + Hamstrings", groups: ["quads", "hamstrings"] },
  { id: "glutes-hamstrings", label: "Glutes + Hamstrings", groups: ["glutes", "hamstrings"] },
  { id: "quads-glutes", label: "Quads + Glutes", groups: ["quads", "glutes"] },
  { id: "back-shoulders", label: "Back + Shoulders", groups: ["back", "shoulders"] },
];

export function trainedMuscles(exercise) {
  const seen = [];
  for (const muscle of [...(exercise.muscles || []), ...(exercise.secondary || [])]) {
    const key = muscleKey(muscle);
    if (key && !seen.includes(key)) seen.push(key);
  }
  return seen;
}

export function muscleSummary(exercise) {
  const list = trainedMuscles(exercise).map(choiceLabel);
  if (list.length <= 6) return list.join(", ");
  return `${list.slice(0, 6).join(", ")} +${list.length - 6}`;
}

function hitsGroup(have, groupId) {
  const members = GROUPS[groupId];
  if (!members) return have.has(groupId);
  return members.some((muscle) => have.has(muscle));
}

export function matchesExercise(exercise, {
  query = "",
  muscles = [],
  equipment = [],
  grouping = "",
  multiOnly = false,
} = {}) {
  const have = new Set(trainedMuscles(exercise));
  const required = [];
  const preset = GROUPINGS.find((item) => item.id === grouping);
  if (preset) required.push(...preset.groups);
  required.push(...muscles);
  if (required.some((group) => !hitsGroup(have, group))) return false;
  if (multiOnly && have.size < 2) return false;
  if (equipment.length && !equipment.includes(equipmentKey(exercise.equipment))) return false;
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const text = [
    exercise.name,
    exercise.equipment,
    equipmentKey(exercise.equipment),
    exercise.category,
    ...have,
  ].join(" ").toLowerCase();
  return text.includes(needle);
}

export function sortExercises(exercises, sort) {
  if (sort !== "muscles") return exercises;
  return [...exercises].sort((left, right) => (
    trainedMuscles(right).length - trainedMuscles(left).length
    || left.name.localeCompare(right.name)
  ));
}
