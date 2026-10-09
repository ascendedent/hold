import Link from "next/link";
import { listSessions, profile } from "@/lib/db";
import { formatVolume } from "@/lib/load";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const sessions = listSessions();
  const unit = profile().unit || "lb";
  return (
    <div className="stack">
      <header>
        <p className="kicker">History</p>
        <h1>What you trained.</h1>
      </header>
      {sessions.length ? (
        <table className="table">
          <thead><tr><th>When</th><th>Workout</th><th>Energy</th><th>Sets</th><th>Load</th><th>Note</th></tr></thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{new Date(session.started_at).toLocaleString()}</td>
                <td><Link href={`/session/${session.id}`}>{session.name}</Link> {session.completed_at ? "" : <span className="tag">open</span>}</td>
                <td>{session.energy || "—"}</td>
                <td>{session.done_sets}</td>
                <td>{formatVolume(session.load, unit) || "—"}</td>
                <td className="faint">{session.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted">No workouts yet. Start an empty one from Today.</p>}
    </div>
  );
}
