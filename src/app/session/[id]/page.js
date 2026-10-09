import Link from "next/link";
import { notFound } from "next/navigation";
import { Logger } from "@/components/Logger";
import { SessionActions } from "@/components/SessionActions";
import { getSession, latestLoads, listExerciseOptions, profile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();
  const me = profile();
  return (
    <div className="stack">
      <p className="kicker"><Link href="/">Today</Link> · {session.completed_at ? "Finished" : "In progress"}</p>
      <h1>{session.name}</h1>
      <Logger session={session} unit={me.unit || "lb"} catalog={listExerciseOptions()} priorLoads={latestLoads(session.id)} />
      <SessionActions id={session.id} completed={Boolean(session.completed_at)} />
    </div>
  );
}
