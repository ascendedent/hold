import Link from "next/link";
import { notFound } from "next/navigation";
import { Builder } from "@/components/Builder";
import { getTemplate, listExerciseOptions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) notFound();
  return (
    <div className="stack">
      <p className="kicker"><Link href="/workouts">Routines</Link></p>
      <h1>{template.name}</h1>
      {template.summary ? <p className="lede">{template.summary}</p> : null}
      <Builder template={template} exercises={listExerciseOptions()} />
    </div>
  );
}
