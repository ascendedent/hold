import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const dbPath = path.join(process.cwd(), "data", "hold.db");
const catalogPath = path.join(process.cwd(), "seed", "catalog.json");
const IMAGE_CREDIT = "Photos: Free Exercise DB, public domain.";

let db;

function plain(row) {
  if (!row) return null;
  return JSON.parse(JSON.stringify(row));
}

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
  const mins = [...text.matchAll(/(\d+)\s*min/g)].map((m) => Number(m[1]));
  let rest = 75;
  if (mins.length) rest = Math.round((mins.reduce((a, b) => a + b, 0) / mins.length) * 60);
  else if (["warmup", "shoulder", "foot"].includes(String(block || "").toLowerCase())) rest = 30;
  else if (String(block || "").toLowerCase().startsWith("primary")) rest = 150;
  else if (String(block || "").toLowerCase().includes("finisher")) rest = 60;
  return { setCount, effort, rest };
}

function exerciseView(row) {
  const item = plain(row);
  item.steps = JSON.parse(item.steps_json || "[]");
  item.images = JSON.parse(item.images_json || "[]");
  item.tags = JSON.parse(item.tags_json || "[]");
  item.muscles = JSON.parse(item.muscles_json || "[]");
  item.secondary = JSON.parse(item.secondary_json || "[]");
  item.unilateral = Boolean(item.unilateral);
  item.custom = Boolean(item.custom);
  delete item.steps_json;
  delete item.images_json;
  delete item.tags_json;
  delete item.muscles_json;
  delete item.secondary_json;
  return item;
}

function migrate(database) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
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
      used_on TEXT,
      steps_json TEXT NOT NULL DEFAULT '[]',
      watch_out TEXT,
      for_you TEXT,
      photo_note TEXT,
      start_caption TEXT,
      finish_caption TEXT,
      images_json TEXT NOT NULL DEFAULT '[]',
      video_id TEXT,
      video_title TEXT,
      video_channel TEXT,
      search_url TEXT,
      equipment TEXT,
      level TEXT,
      force TEXT,
      mechanic TEXT,
      muscles_json TEXT NOT NULL DEFAULT '[]',
      secondary_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      unilateral INTEGER NOT NULL DEFAULT 0,
      custom INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phase INTEGER,
      weekday INTEGER,
      kind TEXT,
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
      dizzy INTEGER NOT NULL DEFAULT 0,
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
      pain INTEGER,
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
  `);
}

function seed(database) {
  const existing = database.prepare("SELECT COUNT(*) AS n FROM profile").get();
  if (existing.n > 0) return;
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const insertEx = database.prepare(`
    INSERT INTO exercises (
      id, name, category, steps_json, photo_note, images_json, equipment, level, force, mechanic,
      muscles_json, secondary_json, tags_json, unilateral, custom
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  database.exec("BEGIN");
  database.prepare(`
    INSERT INTO profile (id, name, age, unit)
    VALUES (1, 'You', NULL, 'lb')
  `).run();
  for (const exercise of catalog) {
    insertEx.run(
      exercise.id,
      exercise.name,
      exercise.category || "",
      JSON.stringify(exercise.steps || []),
      IMAGE_CREDIT,
      JSON.stringify(exercise.images || []),
      exercise.equipment || "",
      exercise.level || "",
      exercise.force || "",
      exercise.mechanic || "",
      JSON.stringify(exercise.muscles || []),
      JSON.stringify(exercise.secondary || []),
      JSON.stringify(exercise.muscles || []),
      exercise.unilateral ? 1 : 0,
    );
  }
  database.exec("COMMIT");
}

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    migrate(db);
    seed(db);
  }
  return db;
}

export function profile() {
  return plain(getDb().prepare("SELECT * FROM profile WHERE id = 1").get());
}

export function saveProfile(input) {
  const age = input.age === "" || input.age == null ? null : Number(input.age);
  getDb().prepare(`
    UPDATE profile
    SET name = ?, age = ?, unit = ?
    WHERE id = 1
  `).run(
    String(input.name || "You").slice(0, 80),
    Number.isFinite(age) ? age : null,
    input.unit === "kg" ? "kg" : "lb",
  );
  return profile();
}

export function listExercises() {
  return getDb().prepare("SELECT * FROM exercises ORDER BY custom, name").all().map(exerciseView);
}

export function listExerciseCards() {
  return getDb().prepare(`
    SELECT id, name, category, equipment, level, muscles_json, images_json, unilateral, custom, video_id
    FROM exercises ORDER BY name COLLATE NOCASE
  `).all().map((row) => {
    const item = plain(row);
    item.muscles = JSON.parse(item.muscles_json || "[]");
    item.images = JSON.parse(item.images_json || "[]");
    item.unilateral = Boolean(item.unilateral);
    item.custom = Boolean(item.custom);
    delete item.muscles_json;
    delete item.images_json;
    return item;
  });
}

export function listExerciseOptions() {
  return getDb().prepare("SELECT id, name, equipment FROM exercises ORDER BY name COLLATE NOCASE").all().map(plain);
}

export function getExercise(id) {
  const row = getDb().prepare("SELECT * FROM exercises WHERE id = ?").get(id);
  return row ? exerciseView(row) : null;
}

export function saveExercise(input) {
  const database = getDb();
  const id = input.id;
  if (id) {
    const video = input.video ? youtubeId(input.video) : null;
    if (input.video && !video) throw new Error("Paste a YouTube link. The video streams inside Hold and is not saved to this computer.");
    database.prepare(`
      UPDATE exercises
      SET name = ?, category = ?, watch_out = ?, for_you = ?, equipment = ?,
          steps_json = ?, unilateral = ?,
          video_id = COALESCE(?, video_id),
          video_title = CASE WHEN ? IS NULL THEN video_title ELSE ? END
      WHERE id = ?
    `).run(
      String(input.name || "Exercise").slice(0, 120),
      input.category || "",
      input.watch_out || "",
      input.for_you || "",
      input.equipment || "",
      JSON.stringify(splitLines(input.steps)),
      input.unilateral ? 1 : 0,
      video,
      video,
      input.videoTitle || "",
      id,
    );
    return getExercise(id);
  }
  const slug = `custom-${Date.now()}`;
  const video = input.video ? youtubeId(input.video) : "";
  if (input.video && !video) throw new Error("Paste a YouTube link. The video streams inside Hold and is not saved to this computer.");
  database.prepare(`
    INSERT INTO exercises (
      id, name, category, steps_json, watch_out, for_you, equipment, images_json,
      video_id, video_title, tags_json, unilateral, custom, search_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, '["custom"]', ?, 1, '')
  `).run(
    slug,
    String(input.name || "New exercise").slice(0, 120),
    input.category || "Custom",
    JSON.stringify(splitLines(input.steps)),
    input.watch_out || "",
    input.for_you || "",
    input.equipment || "",
    video,
    "",
    input.unilateral ? 1 : 0,
  );
  return getExercise(slug);
}

function splitLines(value) {
  if (Array.isArray(value)) return value.map((line) => String(line).trim()).filter(Boolean);
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

export function listTemplates() {
  return getDb().prepare("SELECT * FROM templates WHERE archived = 0 ORDER BY sort, name").all().map(plain);
}

export function getTemplate(id) {
  const database = getDb();
  const template = plain(database.prepare("SELECT * FROM templates WHERE id = ?").get(id));
  if (!template) return null;
  template.items = database.prepare(`
    SELECT ti.*, e.name AS exercise_name, e.unilateral, e.equipment
    FROM template_items ti
    JOIN exercises e ON e.id = ti.exercise_id
    WHERE ti.template_id = ?
    ORDER BY ti.sort, ti.id
  `).all(id).map(plain);
  return template;
}

function nextSort(templateId) {
  const row = getDb().prepare("SELECT COALESCE(MAX(sort), -1) AS n FROM template_items WHERE template_id = ?").get(templateId);
  return row.n + 1;
}

export function createTemplate(input = {}) {
  const id = `custom-${Date.now()}`;
  getDb().prepare(`
    INSERT INTO templates (id, name, phase, weekday, kind, summary, notes, archived, sort)
    VALUES (?, ?, ?, NULL, 'custom', ?, ?, 0, 100)
  `).run(id, input.name || "New workout", input.phase || null, input.summary || "", input.notes || "");
  return getTemplate(id);
}

export function cloneTemplate(id) {
  const source = getTemplate(id);
  if (!source) throw new Error("Workout not found");
  const copy = createTemplate({ name: `${source.name} copy`, phase: source.phase, summary: source.summary, notes: source.notes });
  const insert = getDb().prepare(`
    INSERT INTO template_items (template_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of source.items) {
    insert.run(copy.id, item.exercise_id, item.block, item.dose, item.sort, item.set_count, item.effort_unit, item.rest_sec);
  }
  return getTemplate(copy.id);
}

export function saveTemplate(input) {
  getDb().prepare(`
    UPDATE templates SET name = ?, phase = ?, kind = ?, summary = ?, notes = ?, archived = ?
    WHERE id = ?
  `).run(
    String(input.name || "Workout").slice(0, 120),
    input.phase === "" || input.phase == null ? null : Number(input.phase),
    input.kind || "custom",
    input.summary || "",
    input.notes || "",
    input.archived ? 1 : 0,
    input.id,
  );
  return getTemplate(input.id);
}

export function addItem(input) {
  const parsed = interpretDose(input.dose || "3 x 8", input.block || "Accessory");
  getDb().prepare(`
    INSERT INTO template_items (template_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.templateId, input.exerciseId, input.block || "Accessory", input.dose || "3 x 8", nextSort(input.templateId), parsed.setCount, parsed.effort, parsed.rest);
  return getTemplate(input.templateId);
}

export function updateItem(input) {
  const current = getDb().prepare("SELECT * FROM template_items WHERE id = ?").get(input.id);
  if (!current) throw new Error("Exercise row not found");
  const dose = input.dose ?? current.dose;
  const block = input.block ?? current.block;
  const parsed = interpretDose(dose, block);
  getDb().prepare(`
    UPDATE template_items SET block = ?, dose = ?, set_count = ?, effort_unit = ?, rest_sec = ? WHERE id = ?
  `).run(block, dose, parsed.setCount, parsed.effort, parsed.rest, input.id);
  return getTemplate(current.template_id);
}

export function deleteItem(id) {
  const current = getDb().prepare("SELECT template_id FROM template_items WHERE id = ?").get(id);
  if (!current) return null;
  getDb().prepare("DELETE FROM template_items WHERE id = ?").run(id);
  return getTemplate(current.template_id);
}

export function moveItem(id, direction) {
  const database = getDb();
  const current = database.prepare("SELECT * FROM template_items WHERE id = ?").get(id);
  if (!current) return null;
  const neighbor = database.prepare(`
    SELECT * FROM template_items
    WHERE template_id = ? AND sort ${direction < 0 ? "<" : ">"} ?
    ORDER BY sort ${direction < 0 ? "DESC" : "ASC"}
    LIMIT 1
  `).get(current.template_id, current.sort);
  if (neighbor) {
    database.prepare("UPDATE template_items SET sort = ? WHERE id = ?").run(neighbor.sort, current.id);
    database.prepare("UPDATE template_items SET sort = ? WHERE id = ?").run(current.sort, neighbor.id);
  }
  return getTemplate(current.template_id);
}

function nowIso() {
  return new Date().toISOString();
}

function numOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function startBlank(input = {}) {
  const info = getDb().prepare(`
    INSERT INTO sessions (template_id, name, started_at, energy, dizzy, notes)
    VALUES (NULL, ?, ?, ?, 0, '')
  `).run(String(input.name || "Workout").slice(0, 80), nowIso(), input.energy || "good");
  return { id: Number(info.lastInsertRowid) };
}

export function addSessionExercise(input) {
  const database = getDb();
  const exercise = database.prepare("SELECT id FROM exercises WHERE id = ?").get(input.exerciseId);
  if (!exercise) throw new Error("Exercise not found");
  const sortRow = database.prepare("SELECT COALESCE(MAX(sort), -1) AS n FROM session_exercises WHERE session_id = ?").get(input.sessionId);
  const sets = Math.min(Math.max(Number(input.sets) || 3, 1), 12);
  const row = database.prepare(`
    INSERT INTO session_exercises (session_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec, skipped)
    VALUES (?, ?, 'Lift', '3 x 8', ?, ?, 'reps', 90, 0)
  `).run(input.sessionId, input.exerciseId, sortRow.n + 1, sets);
  const exerciseId = Number(row.lastInsertRowid);
  const insertSet = database.prepare("INSERT INTO session_sets (session_exercise_id, set_index, done) VALUES (?, ?, 0)");
  for (let setIndex = 1; setIndex <= sets; setIndex += 1) insertSet.run(exerciseId, setIndex);
  return { id: exerciseId };
}

export function startSession(input) {
  const database = getDb();
  const template = database.prepare("SELECT * FROM templates WHERE id = ?").get(input.templateId);
  if (!template) throw new Error("Workout not found");
  const items = database.prepare("SELECT * FROM template_items WHERE template_id = ? ORDER BY sort, id").all(input.templateId);
  const info = database.prepare(`
    INSERT INTO sessions (template_id, name, started_at, energy, dizzy, notes)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(template.id, template.name, nowIso(), input.energy || "good", input.notes || "");
  const sessionId = Number(info.lastInsertRowid);
  const insertEx = database.prepare(`
    INSERT INTO session_exercises (session_id, exercise_id, block, dose, sort, set_count, effort_unit, rest_sec, skipped)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const insertSet = database.prepare(`
    INSERT INTO session_sets (session_exercise_id, set_index, done) VALUES (?, ?, 0)
  `);
  items.forEach((item, index) => {
    const row = insertEx.run(sessionId, item.exercise_id, item.block, item.dose, index, item.set_count, item.effort_unit, item.rest_sec);
    for (let setIndex = 1; setIndex <= item.set_count; setIndex += 1) insertSet.run(Number(row.lastInsertRowid), setIndex);
  });
  return { id: sessionId };
}

export function getSession(id) {
  const database = getDb();
  const session = plain(database.prepare("SELECT * FROM sessions WHERE id = ?").get(id));
  if (!session) return null;
  const exercises = database.prepare(`
    SELECT se.*, e.name, e.steps_json, e.watch_out, e.for_you, e.images_json, e.video_id,
           e.video_title, e.equipment, e.unilateral, e.photo_note, e.start_caption, e.finish_caption
    FROM session_exercises se
    JOIN exercises e ON e.id = se.exercise_id
    WHERE se.session_id = ?
    ORDER BY se.sort, se.id
  `).all(id).map((row) => {
    const item = plain(row);
    item.steps = JSON.parse(item.steps_json || "[]");
    item.images = JSON.parse(item.images_json || "[]");
    item.unilateral = Boolean(item.unilateral);
    item.skipped = Boolean(item.skipped);
    delete item.steps_json;
    delete item.images_json;
    return item;
  });
  const sets = database.prepare(`
    SELECT ss.* FROM session_sets ss
    JOIN session_exercises se ON se.id = ss.session_exercise_id
    WHERE se.session_id = ?
    ORDER BY ss.set_index
  `).all(id).map(plain);
  for (const exercise of exercises) {
    exercise.sets = sets.filter((set) => set.session_exercise_id === exercise.id);
  }
  session.exercises = exercises;
  return session;
}

export function updateSession(input) {
  getDb().prepare(`
    UPDATE sessions
    SET energy = ?, dizzy = ?, notes = ?,
        completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE completed_at END
    WHERE id = ?
  `).run(
    input.energy || "good",
    input.dizzy ? 1 : 0,
    input.notes || "",
    input.complete ? 1 : 0,
    nowIso(),
    input.id,
  );
  return getSession(input.id);
}

export function reopenSession(id) {
  getDb().prepare("UPDATE sessions SET completed_at = NULL WHERE id = ?").run(id);
  return getSession(id);
}

export function saveSet(input) {
  getDb().prepare(`
    UPDATE session_sets
    SET weight = ?, reps = ?, weight_r = ?, reps_r = ?, rir = ?, pain = ?, done = ?, note = ?
    WHERE id = ?
  `).run(
    numOrNull(input.weight),
    numOrNull(input.reps),
    numOrNull(input.weight_r),
    numOrNull(input.reps_r),
    numOrNull(input.rir),
    numOrNull(input.pain),
    input.done ? 1 : 0,
    input.note || "",
    input.id,
  );
  return { id: input.id };
}

export function addSet(sessionExerciseId) {
  const database = getDb();
  const row = database.prepare("SELECT COALESCE(MAX(set_index), 0) AS n FROM session_sets WHERE session_exercise_id = ?").get(sessionExerciseId);
  const info = database.prepare("INSERT INTO session_sets (session_exercise_id, set_index, done) VALUES (?, ?, 0)").run(sessionExerciseId, row.n + 1);
  return plain(database.prepare("SELECT * FROM session_sets WHERE id = ?").get(Number(info.lastInsertRowid)));
}

export function skipExercise(id, skipped) {
  getDb().prepare("UPDATE session_exercises SET skipped = ? WHERE id = ?").run(skipped ? 1 : 0, id);
  return { id, skipped: Boolean(skipped) };
}

export function listSessions() {
  return getDb().prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM session_sets ss
        JOIN session_exercises se ON se.id = ss.session_exercise_id
        WHERE se.session_id = s.id AND ss.done = 1) AS done_sets
    FROM sessions s
    ORDER BY s.started_at DESC
  `).all().map(plain);
}

export function deleteSession(id) {
  const database = getDb();
  database.exec("BEGIN");
  database.prepare("DELETE FROM session_sets WHERE session_exercise_id IN (SELECT id FROM session_exercises WHERE session_id = ?)").run(id);
  database.prepare("DELETE FROM session_exercises WHERE session_id = ?").run(id);
  database.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  database.exec("COMMIT");
  return { id };
}

export function listBody() {
  return getDb().prepare("SELECT * FROM body_logs ORDER BY logged_on DESC, id DESC").all().map(plain);
}

export function saveBody(input) {
  const database = getDb();
  const unit = input.unit === "kg" ? "kg" : profile().unit || "lb";
  if (input.id) {
    database.prepare(`
      UPDATE body_logs
      SET logged_on = ?, weight = ?, waist = ?, chest = ?, hips = ?, thigh = ?, arm = ?, neck = ?, unit = ?, notes = ?
      WHERE id = ?
    `).run(input.logged_on, numOrNull(input.weight), numOrNull(input.waist), numOrNull(input.chest), numOrNull(input.hips), numOrNull(input.thigh), numOrNull(input.arm), numOrNull(input.neck), unit, input.notes || "", input.id);
    return { id: input.id };
  }
  const info = database.prepare(`
    INSERT INTO body_logs (logged_on, weight, waist, chest, hips, thigh, arm, neck, unit, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.logged_on, numOrNull(input.weight), numOrNull(input.waist), numOrNull(input.chest), numOrNull(input.hips), numOrNull(input.thigh), numOrNull(input.arm), numOrNull(input.neck), unit, input.notes || "");
  return { id: Number(info.lastInsertRowid) };
}

export function deleteBody(id) {
  getDb().prepare("DELETE FROM body_logs WHERE id = ?").run(id);
  return { id };
}

export function listGoals() {
  return getDb().prepare("SELECT * FROM goals ORDER BY status = 'active' DESC, id DESC").all().map(plain);
}

export function saveGoal(input) {
  const database = getDb();
  if (input.id) {
    database.prepare(`
      UPDATE goals SET title = ?, kind = ?, direction = ?, target = ?, unit = ?, deadline = ?, notes = ?, status = ?
      WHERE id = ?
    `).run(input.title, input.kind || "custom", input.direction || null, numOrNull(input.target), input.unit || null, input.deadline || null, input.notes || "", input.status || "active", input.id);
    return { id: input.id };
  }
  const info = database.prepare(`
    INSERT INTO goals (title, kind, direction, target, unit, deadline, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(input.title, input.kind || "custom", input.direction || null, numOrNull(input.target), input.unit || null, input.deadline || null, input.notes || "", new Date().toISOString().slice(0, 10));
  return { id: Number(info.lastInsertRowid) };
}

export function deleteGoal(id) {
  getDb().prepare("DELETE FROM goals WHERE id = ?").run(id);
  return { id };
}

export function listNotes(area) {
  const database = getDb();
  if (area) return database.prepare("SELECT * FROM context_notes WHERE area = ? ORDER BY pinned DESC, logged_on DESC, id DESC").all(area).map(plain);
  return database.prepare("SELECT * FROM context_notes ORDER BY pinned DESC, logged_on DESC, id DESC").all().map(plain);
}

export function saveNote(input) {
  const database = getDb();
  const logged = input.logged_on || new Date().toISOString().slice(0, 10);
  if (input.id) {
    database.prepare(`
      UPDATE context_notes SET area = ?, title = ?, body = ?, pinned = ?, logged_on = ? WHERE id = ?
    `).run(input.area, input.title, input.body, input.pinned ? 1 : 0, logged, input.id);
    return { id: input.id };
  }
  const info = database.prepare(`
    INSERT INTO context_notes (area, title, body, pinned, logged_on, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.area, input.title, input.body, input.pinned ? 1 : 0, logged, logged);
  return { id: Number(info.lastInsertRowid) };
}

export function deleteNote(id) {
  getDb().prepare("DELETE FROM context_notes WHERE id = ?").run(id);
  return { id };
}

export function growth() {
  const rows = getDb().prepare(`
    SELECT e.id AS exercise_id, e.name, s.started_at, ss.weight, ss.reps, ss.weight_r, ss.reps_r, ss.done
    FROM session_sets ss
    JOIN session_exercises se ON se.id = ss.session_exercise_id
    JOIN sessions s ON s.id = se.session_id
    JOIN exercises e ON e.id = se.exercise_id
    WHERE ss.done = 1 AND (ss.weight IS NOT NULL OR ss.weight_r IS NOT NULL OR ss.reps IS NOT NULL)
    ORDER BY s.started_at
  `).all().map(plain);
  const byExercise = new Map();
  for (const row of rows) {
    const entry = byExercise.get(row.exercise_id) || { id: row.exercise_id, name: row.name, points: [] };
    const load = bestLoad(row);
    entry.points.push({
      at: row.started_at,
      weight: load.weight,
      reps: load.reps,
      e1rm: load.weight && load.reps ? Math.round(load.weight * (1 + load.reps / 30) * 10) / 10 : null,
    });
    byExercise.set(row.exercise_id, entry);
  }
  return [...byExercise.values()].map((entry) => {
    const weighted = entry.points.filter((point) => point.weight);
    const best = weighted.reduce((top, point) => (point.weight > (top?.weight || 0) ? point : top), null);
    const bestE1 = entry.points.reduce((top, point) => ((point.e1rm || 0) > (top?.e1rm || 0) ? point : top), null);
    return { ...entry, best, bestE1, last: entry.points[entry.points.length - 1] };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function bestLoad(row) {
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

export function weekSessions(sinceIso) {
  return getDb().prepare("SELECT COUNT(*) AS n FROM sessions WHERE completed_at IS NOT NULL AND completed_at >= ?").get(sinceIso).n;
}

export function openSession() {
  return plain(getDb().prepare("SELECT id, name, started_at FROM sessions WHERE completed_at IS NULL ORDER BY id DESC LIMIT 1").get());
}
