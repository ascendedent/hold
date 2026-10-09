import * as SQLite from "expo-sqlite";
import catalog from "../assets/catalog.json";
import revisions from "../assets/revisions.json";
import personal from "../assets/personal.json";
import { bestLoad, e1rm, interpretDose, setVolume, todayStamp, youtubeId } from "./pure";

const IMAGE_CREDIT = "Photos: Free Exercise DB, public domain.";

let db;

function all(sql, params = []) {
  return db.getAllSync(sql, params);
}

function one(sql, params = []) {
  return db.getFirstSync(sql, params) ?? null;
}

function run(sql, params = []) {
  return db.runSync(sql, params);
}

function idOf(result) {
  return Number(result.lastInsertRowId);
}

function numOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitLines(value) {
  if (Array.isArray(value)) return value.map((line) => String(line).trim()).filter(Boolean);
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "") ?? fallback;
  } catch {
    return fallback;
  }
}

export function initDb() {
  if (db) return;
  db = SQLite.openDatabaseSync("hold.db");
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      age INTEGER,
      unit TEXT NOT NULL DEFAULT 'lb'
    );
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      steps_json TEXT NOT NULL DEFAULT '[]',
      watch_out TEXT,
      for_you TEXT,
      photo_note TEXT,
      images_json TEXT NOT NULL DEFAULT '[]',
      video_id TEXT,
      equipment TEXT,
      level TEXT,
      force TEXT,
      mechanic TEXT,
      muscles_json TEXT NOT NULL DEFAULT '[]',
      secondary_json TEXT NOT NULL DEFAULT '[]',
      unilateral INTEGER NOT NULL DEFAULT 0,
      custom INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      summary TEXT,
      notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS template_items (
      id INTEGER PRIMARY KEY,
      template_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      block TEXT,
      dose TEXT,
      sort INTEGER NOT NULL,
      set_count INTEGER NOT NULL,
      effort_unit TEXT NOT NULL,
      rest_sec INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY,
      template_id TEXT,
      name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      energy TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS session_exercises (
      id INTEGER PRIMARY KEY,
      session_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      block TEXT,
      dose TEXT,
      sort INTEGER NOT NULL,
      set_count INTEGER NOT NULL,
      effort_unit TEXT NOT NULL,
      rest_sec INTEGER NOT NULL,
      skipped INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS session_sets (
      id INTEGER PRIMARY KEY,
      session_exercise_id INTEGER NOT NULL,
      set_index INTEGER NOT NULL,
      weight REAL,
      reps REAL,
      weight_r REAL,
      reps_r REAL,
      rir REAL,
      done INTEGER NOT NULL DEFAULT 0,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS body_logs (
      id INTEGER PRIMARY KEY,
      logged_on TEXT NOT NULL,
      weight REAL,
      waist REAL,
      chest REAL,
      hips REAL,
      thigh REAL,
      arm REAL,
      neck REAL,
      unit TEXT NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      direction TEXT,
      target REAL,
      unit TEXT,
      deadline TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS context_notes (
      id INTEGER PRIMARY KEY,
      area TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      logged_on TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  const profileColumns = all("PRAGMA table_info(profile)").map((column) => column.name);
  if (!profileColumns.includes("height_cm")) run("ALTER TABLE profile ADD COLUMN height_cm REAL");
  seed();
  seedPersonal();
  // A routine start that failed part way left an open session with no exercises.
  run(`
    DELETE FROM sessions
    WHERE template_id IS NOT NULL AND completed_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM session_exercises WHERE session_id = sessions.id)
  `);
}

export function getSetting(key, fallback = null) {
  initDb();
  const row = one("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  initDb();
  run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, String(value)]);
}

// Your own plan lives in personal/plan.json, which git ignores. The build copies
// it into assets/personal.json. A higher version replaces the plan's routines
// and exercises; routines you made yourself are never touched.
function seedPersonal() {
  const version = Number(personal?.version) || 0;
  if (!version || version <= Number(getSetting("personal_version", 0))) return;
  db.withTransactionSync(() => {
    for (const exercise of personal.exercises || []) {
      run(`
        INSERT OR REPLACE INTO exercises (
          id, name, category, steps_json, watch_out, for_you, photo_note, images_json, equipment,
          muscles_json, secondary_json, unilateral, custom
        ) VALUES (?, ?, ?, ?, ?, ?, '', '[]', ?, ?, ?, ?, 1)
      `, [
        exercise.id,
        exercise.name,
        exercise.category || "Plan",
        JSON.stringify(exercise.steps || []),
        exercise.watch_out || "",
        exercise.for_you || "",
        exercise.equipment || "",
        JSON.stringify(exercise.muscles || []),
        JSON.stringify(exercise.secondary || []),
        exercise.unilateral ? 1 : 0,
      ]);
    }
    const ids = new Set();
    for (const routine of personal.routines || []) {
      ids.add(routine.id);
      run(`
        INSERT INTO templates (id, name, summary, notes, archived, sort) VALUES (?, ?, ?, ?, 0, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, summary = excluded.summary,
          notes = excluded.notes, archived = 0, sort = excluded.sort
      `, [routine.id, routine.name, routine.summary || "", routine.notes || "", Number(routine.sort) || 0]);
      run("DELETE FROM template_items WHERE template_id = ?", [routine.id]);
      (routine.items || []).forEach((item, index) => {
        if (!one("SELECT id FROM exercises WHERE id = ?", [item.exercise])) return;
        const parsed = interpretDose(item.dose, item.block);
        run(`
          INSERT INTO template_items (template_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [routine.id, item.exercise, item.block || "Lift", item.dose || "3 x 8", index, parsed.setCount, parsed.effort, parsed.rest]);
      });
    }
    for (const row of all("SELECT id FROM templates WHERE id LIKE 'plan-%'")) {
      if (!ids.has(row.id)) run("UPDATE templates SET archived = 1 WHERE id = ?", [row.id]);
    }
    run("INSERT INTO settings (key, value) VALUES ('personal_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [String(version)]);
  });
  if (!getSetting("plan_phase")) setSetting("plan_phase", "1");
  if (!getSetting("plan_started")) setSetting("plan_started", todayStamp());
}

export function planInfo() {
  initDb();
  const phases = personal?.phases || [];
  if (!phases.length) return null;
  const phase = Number(getSetting("plan_phase", "1")) || 1;
  const current = phases.find((item) => item.phase === phase) || phases[0];
  const started = getSetting("plan_started", todayStamp());
  const week = Math.max(1, Math.floor((Date.now() - new Date(`${started}T00:00:00`).getTime()) / (7 * 86400000)) + 1);
  const names = Object.fromEntries(listTemplates().map((template) => [template.id, template.name]));
  const day = (weekday) => {
    const entry = current.days?.[String(weekday)] || { title: "Rest", body: "", routines: [] };
    return { ...entry, routines: (entry.routines || []).filter((id) => names[id]).map((id) => ({ id, name: names[id] })) };
  };
  return {
    name: personal.name || "Plan",
    phase: current.phase,
    label: current.label,
    advance: current.advance || "",
    phases: phases.map((item) => ({ value: String(item.phase), label: `Phase ${item.phase}` })),
    week,
    started,
    today: day(new Date().getDay()),
    days: [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({ weekday, ...day(weekday) })),
    reminderTime: getSetting("reminder_time", personal.reminderTime || "07:30"),
    reminders: getSetting("reminders", "on") === "on",
  };
}

function photoNote(exercise) {
  if (exercise.photo_note) return exercise.photo_note;
  if (exercise.images?.length) return IMAGE_CREDIT;
  return "";
}

// Steps written by an older build may differ only in JSON spacing.
function sameSteps(json) {
  try {
    return JSON.stringify(JSON.parse(json || "[]"));
  } catch {
    return json;
  }
}

function seed() {
  const existing = one("SELECT COUNT(*) AS n FROM profile");
  const insert = `
    INSERT OR IGNORE INTO exercises (
      id, name, category, steps_json, photo_note, images_json, equipment, level, force, mechanic,
      muscles_json, secondary_json, unilateral, custom
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `;
  db.withTransactionSync(() => {
    if (!existing || existing.n === 0) {
      run("INSERT INTO profile (id, name, age, unit) VALUES (1, 'You', NULL, 'lb')");
    }
    for (const exercise of catalog) {
      run(insert, [
        exercise.id,
        exercise.name,
        exercise.category || "",
        JSON.stringify(exercise.steps || []),
        photoNote(exercise),
        JSON.stringify(exercise.images || []),
        exercise.equipment || "",
        exercise.level || "",
        exercise.force || "",
        exercise.mechanic || "",
        JSON.stringify(exercise.muscles || []),
        JSON.stringify(exercise.secondary || []),
        exercise.unilateral ? 1 : 0,
      ]);
    }
    // Pictures and muscles cannot be edited in Hold, so they follow the catalog.
    for (const exercise of catalog) {
      const values = [
        JSON.stringify(exercise.images || []),
        photoNote(exercise),
        JSON.stringify(exercise.muscles || []),
        JSON.stringify(exercise.secondary || []),
      ];
      run(
        `UPDATE exercises
         SET images_json = ?, photo_note = ?, muscles_json = ?, secondary_json = ?
         WHERE id = ? AND custom = 0
           AND (images_json IS NOT ? OR photo_note IS NOT ? OR muscles_json IS NOT ? OR secondary_json IS NOT ?)`,
        [...values, exercise.id, ...values],
      );
    }
    // Name, steps, and equipment can be edited. A reviewed fix replaces them
    // only while the row still holds the text the fix replaced.
    const columns = { name: "name", steps: "steps_json", equipment: "equipment" };
    for (const exercise of catalog) {
      const past = revisions[exercise.id];
      const row = past && one("SELECT name, steps_json, equipment FROM exercises WHERE id = ? AND custom = 0", [exercise.id]);
      if (!row) continue;
      const stored = { name: row.name, steps: sameSteps(row.steps_json), equipment: row.equipment || "" };
      const next = {
        name: exercise.name,
        steps: JSON.stringify(exercise.steps || []),
        equipment: exercise.equipment || "",
      };
      for (const field of Object.keys(columns)) {
        if (!past[field] || stored[field] === next[field]) continue;
        const replaced = past[field].map((value) => (field === "steps" ? JSON.stringify(value || []) : value || ""));
        if (replaced.includes(stored[field])) {
          run(`UPDATE exercises SET ${columns[field]} = ? WHERE id = ?`, [next[field], exercise.id]);
        }
      }
    }
    // A movement listed twice keeps one row. The other goes unless a routine or
    // a logged session points at it.
    const ids = new Set(catalog.map((exercise) => exercise.id));
    for (const row of all("SELECT id FROM exercises WHERE custom = 0")) {
      if (ids.has(row.id)) continue;
      run(
        `DELETE FROM exercises
         WHERE id = ? AND custom = 0
           AND NOT EXISTS (SELECT 1 FROM template_items WHERE exercise_id = exercises.id)
           AND NOT EXISTS (SELECT 1 FROM session_exercises WHERE exercise_id = exercises.id)`,
        [row.id],
      );
    }
  });
}

export function profile() {
  initDb();
  return one("SELECT * FROM profile WHERE id = 1");
}

export function saveProfile(input) {
  const age = input.age === "" || input.age == null ? null : Number(input.age);
  const height = numOrNull(input.height_cm);
  run("UPDATE profile SET name = ?, age = ?, unit = ?, height_cm = ? WHERE id = 1", [
    String(input.name || "You").slice(0, 80),
    Number.isFinite(age) ? age : null,
    input.unit === "kg" ? "kg" : "lb",
    height && height > 50 && height < 260 ? height : null,
  ]);
  return profile();
}

let cardCache = null;

export function listExerciseCards() {
  initDb();
  if (cardCache) return cardCache;
  cardCache = all(`
    SELECT id, name, category, equipment, level, muscles_json, secondary_json, images_json, unilateral, custom
    FROM exercises ORDER BY name COLLATE NOCASE
  `).map((row) => ({
    ...row,
    muscles: parseJson(row.muscles_json, []),
    secondary: parseJson(row.secondary_json, []),
    image: parseJson(row.images_json, [])[0]?.src || "",
    unilateral: Boolean(row.unilateral),
    custom: Boolean(row.custom),
  }));
  return cardCache;
}

export function searchExercises(needle) {
  const query = String(needle || "").trim().toLowerCase();
  if (query.length < 2) return [];
  return listExerciseCards()
    .filter((exercise) => `${exercise.name} ${exercise.equipment} ${exercise.category} ${exercise.muscles.join(" ")}`.toLowerCase().includes(query))
    .slice(0, 12);
}

export function getExercise(id) {
  initDb();
  const row = one("SELECT * FROM exercises WHERE id = ?", [id]);
  if (!row) return null;
  return {
    ...row,
    steps: parseJson(row.steps_json, []),
    images: parseJson(row.images_json, []),
    muscles: parseJson(row.muscles_json, []),
    secondary: parseJson(row.secondary_json, []),
    unilateral: Boolean(row.unilateral),
    custom: Boolean(row.custom),
  };
}

export function saveExercise(input) {
  initDb();
  const video = input.video ? youtubeId(input.video) : null;
  if (input.video && !video) throw new Error("Paste a YouTube link. It streams inside Hold.");
  cardCache = null;
  if (input.id) {
    run(`
      UPDATE exercises
      SET name = ?, category = ?, watch_out = ?, for_you = ?, equipment = ?,
          steps_json = ?, unilateral = ?, video_id = COALESCE(?, video_id)
      WHERE id = ?
    `, [
      String(input.name || "Exercise").slice(0, 120),
      input.category || "",
      input.watch_out || "",
      input.for_you || "",
      input.equipment || "",
      JSON.stringify(splitLines(input.steps)),
      input.unilateral ? 1 : 0,
      video,
      input.id,
    ]);
    return getExercise(input.id);
  }
  const slug = `custom-${Date.now()}`;
  run(`
    INSERT INTO exercises (
      id, name, category, steps_json, watch_out, for_you, equipment, images_json,
      video_id, muscles_json, secondary_json, unilateral, custom, photo_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, '[]', '[]', ?, 1, ?)
  `, [
    slug,
    String(input.name || "New exercise").slice(0, 120),
    input.category || "Custom",
    JSON.stringify(splitLines(input.steps)),
    input.watch_out || "",
    input.for_you || "",
    input.equipment || "",
    video || "",
    input.unilateral ? 1 : 0,
    IMAGE_CREDIT,
  ]);
  return getExercise(slug);
}

export function listTemplates() {
  initDb();
  return all("SELECT * FROM templates WHERE archived = 0 ORDER BY sort, name");
}

export function getTemplate(id) {
  initDb();
  const template = one("SELECT * FROM templates WHERE id = ?", [id]);
  if (!template) return null;
  template.items = all(`
    SELECT ti.*, e.name AS exercise_name, e.unilateral, e.equipment
    FROM template_items ti
    JOIN exercises e ON e.id = ti.exercise_id
    WHERE ti.template_id = ?
    ORDER BY ti.sort, ti.id
  `, [id]).map((item) => ({ ...item, unilateral: Boolean(item.unilateral) }));
  return template;
}

function nextSort(templateId) {
  return one("SELECT COALESCE(MAX(sort), -1) AS n FROM template_items WHERE template_id = ?", [templateId]).n + 1;
}

export function createTemplate(input = {}) {
  const id = `custom-${Date.now()}`;
  run("INSERT INTO templates (id, name, summary, notes, archived, sort) VALUES (?, ?, ?, ?, 0, 100)", [
    id,
    input.name || "New workout",
    input.summary || "",
    input.notes || "",
  ]);
  return getTemplate(id);
}

export function saveTemplate(input) {
  run("UPDATE templates SET name = ?, summary = ?, notes = ?, archived = ? WHERE id = ?", [
    String(input.name || "Workout").slice(0, 120),
    input.summary || "",
    input.notes || "",
    input.archived ? 1 : 0,
    input.id,
  ]);
  return getTemplate(input.id);
}

export function addItem(input) {
  const parsed = interpretDose(input.dose || "3 x 8", input.block || "Lift");
  run(`
    INSERT INTO template_items (template_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [input.templateId, input.exerciseId, input.block || "Lift", input.dose || "3 x 8", nextSort(input.templateId), parsed.setCount, parsed.effort, parsed.rest]);
  return getTemplate(input.templateId);
}

export function updateItem(input) {
  const current = one("SELECT * FROM template_items WHERE id = ?", [input.id]);
  if (!current) return null;
  const dose = input.dose ?? current.dose;
  const parsed = interpretDose(dose, current.block || "Lift");
  run("UPDATE template_items SET dose = ?, set_count = ?, effort_unit = ?, rest_sec = ? WHERE id = ?", [
    dose, parsed.setCount, parsed.effort, parsed.rest, input.id,
  ]);
  return getTemplate(current.template_id);
}

export function deleteItem(id) {
  const current = one("SELECT template_id FROM template_items WHERE id = ?", [id]);
  if (!current) return null;
  run("DELETE FROM template_items WHERE id = ?", [id]);
  return getTemplate(current.template_id);
}

export function moveItem(id, direction) {
  const current = one("SELECT * FROM template_items WHERE id = ?", [id]);
  if (!current) return null;
  const neighbor = one(`
    SELECT * FROM template_items
    WHERE template_id = ? AND sort ${direction < 0 ? "<" : ">"} ?
    ORDER BY sort ${direction < 0 ? "DESC" : "ASC"}
    LIMIT 1
  `, [current.template_id, current.sort]);
  if (neighbor) {
    run("UPDATE template_items SET sort = ? WHERE id = ?", [neighbor.sort, current.id]);
    run("UPDATE template_items SET sort = ? WHERE id = ?", [current.sort, neighbor.id]);
  }
  return getTemplate(current.template_id);
}

export function startBlank(input = {}) {
  initDb();
  const result = run("INSERT INTO sessions (template_id, name, started_at, energy, notes) VALUES (NULL, ?, ?, ?, '')", [
    String(input.name || "Workout").slice(0, 80),
    new Date().toISOString(),
    input.energy || "good",
  ]);
  return { id: idOf(result) };
}

export function addSessionExercise(input) {
  const exercise = one("SELECT id FROM exercises WHERE id = ?", [input.exerciseId]);
  if (!exercise) throw new Error("Exercise not found");
  const sort = one("SELECT COALESCE(MAX(sort), -1) AS n FROM session_exercises WHERE session_id = ?", [input.sessionId]).n + 1;
  const sets = Math.min(Math.max(Number(input.sets) || 3, 1), 12);
  const row = run(`
    INSERT INTO session_exercises (session_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec, skipped)
    VALUES (?, ?, 'Lift', '3 x 8', ?, ?, 'reps', 90, 0)
  `, [input.sessionId, input.exerciseId, sort, sets]);
  const exerciseRow = idOf(row);
  for (let setIndex = 1; setIndex <= sets; setIndex += 1) {
    run("INSERT INTO session_sets (session_exercise_id, set_index, done) VALUES (?, ?, 0)", [exerciseRow, setIndex]);
  }
  return { id: exerciseRow };
}

export function startSession(templateId) {
  initDb();
  const template = one("SELECT * FROM templates WHERE id = ?", [templateId]);
  if (!template) throw new Error("Workout not found");
  const items = all("SELECT * FROM template_items WHERE template_id = ? ORDER BY sort, id", [templateId]);
  let sessionId;
  db.withTransactionSync(() => {
    const info = run("INSERT INTO sessions (template_id, name, started_at, energy, notes) VALUES (?, ?, ?, 'good', '')", [
      template.id, template.name, new Date().toISOString(),
    ]);
    sessionId = idOf(info);
    items.forEach((item, index) => {
      const row = run(`
        INSERT INTO session_exercises (session_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec, skipped)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [sessionId, item.exercise_id, item.block, item.dose, index, item.set_count, item.effort_unit, item.rest_sec]);
      const exerciseRow = idOf(row);
      for (let setIndex = 1; setIndex <= item.set_count; setIndex += 1) {
        run("INSERT INTO session_sets (session_exercise_id, set_index, done) VALUES (?, ?, 0)", [exerciseRow, setIndex]);
      }
    });
  });
  return { id: sessionId };
}

export function getSession(id) {
  initDb();
  const session = one("SELECT * FROM sessions WHERE id = ?", [id]);
  if (!session) return null;
  const exercises = all(`
    SELECT se.*, e.name, e.steps_json, e.watch_out, e.for_you, e.images_json, e.video_id,
           e.equipment, e.unilateral, e.photo_note
    FROM session_exercises se
    JOIN exercises e ON e.id = se.exercise_id
    WHERE se.session_id = ?
    ORDER BY se.sort, se.id
  `, [id]).map((row) => ({
    ...row,
    steps: parseJson(row.steps_json, []),
    images: parseJson(row.images_json, []),
    unilateral: Boolean(row.unilateral),
    skipped: Boolean(row.skipped),
  }));
  const sets = all(`
    SELECT ss.* FROM session_sets ss
    JOIN session_exercises se ON se.id = ss.session_exercise_id
    WHERE se.session_id = ?
    ORDER BY ss.set_index
  `, [id]);
  for (const exercise of exercises) {
    exercise.sets = sets.filter((set) => set.session_exercise_id === exercise.id);
  }
  session.exercises = exercises;
  return session;
}

export function updateSession(input) {
  run(`
    UPDATE sessions
    SET energy = ?, notes = ?,
        completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE completed_at END
    WHERE id = ?
  `, [input.energy || "good", input.notes || "", input.complete ? 1 : 0, new Date().toISOString(), input.id]);
  return getSession(input.id);
}

export function saveSet(input) {
  run(`
    UPDATE session_sets
    SET weight = ?, reps = ?, weight_r = ?, reps_r = ?, rir = ?, done = ?, note = ?
    WHERE id = ?
  `, [
    numOrNull(input.weight),
    numOrNull(input.reps),
    numOrNull(input.weight_r),
    numOrNull(input.reps_r),
    numOrNull(input.rir),
    input.done ? 1 : 0,
    input.note || "",
    input.id,
  ]);
}

export function addSet(sessionExerciseId) {
  const row = one("SELECT COALESCE(MAX(set_index), 0) AS n FROM session_sets WHERE session_exercise_id = ?", [sessionExerciseId]);
  run("INSERT INTO session_sets (session_exercise_id, set_index, done) VALUES (?, ?, 0)", [sessionExerciseId, row.n + 1]);
}

export function skipExercise(id, skipped) {
  run("UPDATE session_exercises SET skipped = ? WHERE id = ?", [skipped ? 1 : 0, id]);
}

export function listSessions() {
  initDb();
  const sessions = all(`
    SELECT s.*,
      (SELECT COUNT(*) FROM session_sets ss
        JOIN session_exercises se ON se.id = ss.session_exercise_id
        WHERE se.session_id = s.id AND ss.done = 1) AS done_sets
    FROM sessions s
    ORDER BY s.started_at DESC
  `);
  const volume = new Map();
  for (const row of all(`
    SELECT se.session_id, se.effort_unit, ss.weight, ss.reps, ss.weight_r, ss.reps_r
    FROM session_sets ss
    JOIN session_exercises se ON se.id = ss.session_exercise_id
    WHERE ss.done = 1
  `)) {
    volume.set(row.session_id, (volume.get(row.session_id) || 0) + (setVolume(row) || 0));
  }
  return sessions.map((session) => ({ ...session, load: volume.get(session.id) || 0 }));
}

export function deleteSession(id) {
  db.withTransactionSync(() => {
    run("DELETE FROM session_sets WHERE session_exercise_id IN (SELECT id FROM session_exercises WHERE session_id = ?)", [id]);
    run("DELETE FROM session_exercises WHERE session_id = ?", [id]);
    run("DELETE FROM sessions WHERE id = ?", [id]);
  });
}

export function listBody() {
  initDb();
  return all("SELECT * FROM body_logs ORDER BY logged_on DESC, id DESC");
}

export function saveBody(input) {
  const unit = input.unit === "kg" ? "kg" : profile().unit || "lb";
  const values = [
    input.logged_on || todayStamp(),
    numOrNull(input.weight),
    numOrNull(input.waist),
    numOrNull(input.chest),
    numOrNull(input.hips),
    numOrNull(input.thigh),
    numOrNull(input.arm),
    numOrNull(input.neck),
    unit,
    input.notes || "",
  ];
  if (input.id) {
    run(`
      UPDATE body_logs
      SET logged_on = ?, weight = ?, waist = ?, chest = ?, hips = ?, thigh = ?, arm = ?, neck = ?, unit = ?, notes = ?
      WHERE id = ?
    `, [...values, input.id]);
    return;
  }
  run(`
    INSERT INTO body_logs (logged_on, weight, waist, chest, hips, thigh, arm, neck, unit, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, values);
}

export function deleteBody(id) {
  run("DELETE FROM body_logs WHERE id = ?", [id]);
}

export function listGoals() {
  initDb();
  return all("SELECT * FROM goals ORDER BY status = 'active' DESC, id DESC");
}

export function saveGoal(input) {
  if (input.id) {
    run(`
      UPDATE goals SET title = ?, kind = ?, direction = ?, target = ?, unit = ?, deadline = ?, notes = ?, status = ?
      WHERE id = ?
    `, [
      input.title, input.kind || "custom", input.direction || null, numOrNull(input.target),
      input.unit || null, input.deadline || null, input.notes || "", input.status || "active", input.id,
    ]);
    return;
  }
  run(`
    INSERT INTO goals (title, kind, direction, target, unit, deadline, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `, [
    input.title, input.kind || "custom", input.direction || null, numOrNull(input.target),
    input.unit || null, input.deadline || null, input.notes || "", todayStamp(),
  ]);
}

export function deleteGoal(id) {
  run("DELETE FROM goals WHERE id = ?", [id]);
}

export function listNotes(area) {
  initDb();
  if (area) return all("SELECT * FROM context_notes WHERE area = ? ORDER BY pinned DESC, logged_on DESC, id DESC", [area]);
  return all("SELECT * FROM context_notes ORDER BY pinned DESC, logged_on DESC, id DESC");
}

export function saveNote(input) {
  const logged = input.logged_on || todayStamp();
  run(`
    INSERT INTO context_notes (area, title, body, pinned, logged_on, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [input.area, input.title, input.body, input.pinned ? 1 : 0, logged, logged]);
}

export function deleteNote(id) {
  run("DELETE FROM context_notes WHERE id = ?", [id]);
}

function loadPoint(row) {
  const load = bestLoad(row);
  return {
    exerciseId: row.exercise_id,
    name: row.name,
    sessionId: row.session_id,
    at: row.started_at,
    weight: load.weight,
    reps: load.reps,
    effort: row.effort_unit || "reps",
    volume: setVolume(row),
    e1rm: (row.effort_unit || "reps") === "reps" ? e1rm(load.weight, load.reps) : null,
  };
}

function loadRows(extraSql = "", params = []) {
  return all(`
    SELECT e.id AS exercise_id, e.name, s.id AS session_id, s.started_at,
           se.effort_unit, ss.weight, ss.reps, ss.weight_r, ss.reps_r
    FROM session_sets ss
    JOIN session_exercises se ON se.id = ss.session_exercise_id
    JOIN sessions s ON s.id = se.session_id
    JOIN exercises e ON e.id = se.exercise_id
    WHERE ss.done = 1 AND (ss.weight IS NOT NULL OR ss.weight_r IS NOT NULL)
    ${extraSql}
    ORDER BY s.started_at DESC
  `, params);
}

export function exerciseLoads(exerciseId) {
  initDb();
  return loadRows("AND e.id = ?", [exerciseId]).map(loadPoint);
}

export function latestLoads(exceptSessionId = null) {
  initDb();
  const latest = {};
  for (const row of loadRows()) {
    if (exceptSessionId != null && Number(row.session_id) === Number(exceptSessionId)) continue;
    if (latest[row.exercise_id]) continue;
    latest[row.exercise_id] = loadPoint(row);
  }
  return latest;
}

export function growth() {
  initDb();
  const byExercise = new Map();
  for (const row of loadRows().slice().reverse()) {
    const entry = byExercise.get(row.exercise_id) || { id: row.exercise_id, name: row.name, points: [] };
    entry.points.push(loadPoint(row));
    byExercise.set(row.exercise_id, entry);
  }
  return [...byExercise.values()].map((entry) => {
    const best = entry.points.reduce((top, point) => ((point.weight || 0) > (top?.weight || 0) ? point : top), null);
    const bestE1 = entry.points.reduce((top, point) => ((point.e1rm || 0) > (top?.e1rm || 0) ? point : top), null);
    const totalVolume = entry.points.reduce((sum, point) => sum + (point.volume || 0), 0);
    return { ...entry, best, bestE1, totalVolume, last: entry.points[entry.points.length - 1] };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function weekSessions() {
  initDb();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  return one("SELECT COUNT(*) AS n FROM sessions WHERE completed_at IS NOT NULL AND completed_at >= ?", [since]).n;
}

export function openSessionFor(templateId) {
  initDb();
  return one("SELECT id, name, started_at FROM sessions WHERE template_id = ? AND completed_at IS NULL ORDER BY id DESC LIMIT 1", [templateId]);
}

export function openSession() {
  initDb();
  return one("SELECT id, name, started_at FROM sessions WHERE completed_at IS NULL ORDER BY id DESC LIMIT 1");
}
