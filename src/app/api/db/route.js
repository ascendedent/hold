import { NextResponse } from "next/server";
import * as db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ops = {
  "profile.save": (body) => db.saveProfile(body),
  "exercise.save": (body) => db.saveExercise(body),
  "template.create": (body) => db.createTemplate(body),
  "template.clone": (body) => db.cloneTemplate(body.id),
  "template.save": (body) => db.saveTemplate(body),
  "item.add": (body) => db.addItem(body),
  "item.update": (body) => db.updateItem(body),
  "item.delete": (body) => db.deleteItem(body.id),
  "item.move": (body) => db.moveItem(body.id, Number(body.direction) || 1),
  "session.start": (body) => db.startSession(body),
  "session.blank": (body) => db.startBlank(body),
  "session.addExercise": (body) => db.addSessionExercise(body),
  "session.update": (body) => db.updateSession(body),
  "session.reopen": (body) => db.reopenSession(body.id),
  "session.delete": (body) => db.deleteSession(body.id),
  "set.save": (body) => db.saveSet(body),
  "set.add": (body) => db.addSet(body.sessionExerciseId),
  "exercise.skip": (body) => db.skipExercise(body.id, body.skipped),
  "body.save": (body) => db.saveBody(body),
  "body.delete": (body) => db.deleteBody(body.id),
  "goal.save": (body) => db.saveGoal(body),
  "goal.delete": (body) => db.deleteGoal(body.id),
  "note.save": (body) => db.saveNote(body),
  "note.delete": (body) => db.deleteNote(body.id),
};

export async function POST(request) {
  const body = await request.json();
  const run = ops[body.op];
  if (!run) return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  try {
    const result = run(body);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Could not save" }, { status: 400 });
  }
}
