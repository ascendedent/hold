import Link from "next/link";
import { NewWorkout } from "@/components/NewWorkout";
import { listTemplates } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function WorkoutsPage() {
  const templates = listTemplates();
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Routines</p>
          <h1>Workouts you repeat.</h1>
          <p className="lede">A routine is a saved list of exercises and doses. Nothing is preloaded. Build the ones you actually do.</p>
        </div>
        <NewWorkout />
      </header>
      {templates.length ? (
        <div className="library">
          {templates.map((item) => (
            <Link key={item.id} href={`/workouts/${item.id}`} className="card stack">
              <h3>{item.name}</h3>
              <p className="muted">{item.summary || "No summary yet."}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <h2>Start with a blank routine.</h2>
          <p className="muted">Name it, add exercises from the library, then start it whenever you train.</p>
        </div>
      )}
    </div>
  );
}
