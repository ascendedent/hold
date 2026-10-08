import Link from "next/link";
import { QuickStart } from "@/components/QuickStart";
import { listBody, listGoals, listSessions, listTemplates, openSession, profile, weekSessions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Today() {
  const me = profile();
  const open = openSession();
  const routines = listTemplates().slice(0, 4);
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const doneThisWeek = weekSessions(since);
  const latest = listBody().find((row) => row.weight != null);
  const goals = listGoals().filter((goal) => goal.status === "active").slice(0, 3);
  const recent = listSessions().slice(0, 4);
  const greeting = me.name && me.name !== "You" ? me.name : "there";

  return (
    <div className="stack">
      <header>
        <p className="kicker">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1>Hey, {greeting}.</h1>
        <p className="lede">Start from nothing, or open a routine you already built. The exercise library is there when you need a movement.</p>
      </header>
      <section className="card hero-card stack">
        {open ? (
          <>
            <p className="tag">In progress</p>
            <h2>{open.name}</h2>
            <p className="muted">Started {new Date(open.started_at).toLocaleString()}</p>
            <Link className="btn accent" href={`/session/${open.id}`}>Resume workout</Link>
          </>
        ) : (
          <>
            <p className="tag">Train</p>
            <h2>Ready when you are.</h2>
            <p className="muted">An empty workout lets you add exercises as you go. A routine is the same list, saved for next time.</p>
            <QuickStart />
          </>
        )}
      </section>
      <div className="grid-3">
        <Link className="card" href="/history">
          <p className="faint">Last 7 days</p>
          <p className="stat">{doneThisWeek}</p>
          <p className="muted">finished workout{doneThisWeek === 1 ? "" : "s"}</p>
        </Link>
        <Link className="card" href="/body">
          <p className="faint">Body weight</p>
          <p className="stat">{latest ? latest.weight : "—"}</p>
          <p className="muted">{latest ? `${latest.unit} · ${latest.logged_on}` : "No weigh-in yet"}</p>
        </Link>
        <Link className="card" href="/goals">
          <p className="faint">Active goals</p>
          <p className="stat">{goals.length}</p>
          <p className="muted">{goals[0]?.title || "Add one when you want a target."}</p>
        </Link>
      </div>
      <section className="stack">
        <div className="spread">
          <h2>Routines</h2>
          <Link href="/workouts">See all</Link>
        </div>
        {routines.length ? (
          <div className="library">
            {routines.map((item) => (
              <Link key={item.id} href={`/workouts/${item.id}`} className="card">
                <h3>{item.name}</h3>
                <p className="muted">{item.summary || "Open to edit or start."}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card">
            <p className="muted">No routines yet. Build one when a workout is worth repeating.</p>
            <Link className="btn" href="/workouts" style={{ marginTop: 10 }}>New routine</Link>
          </div>
        )}
      </section>
      {recent.length ? (
        <section className="card stack">
          <h2>Recent</h2>
          {recent.map((session) => (
            <div className="spread" key={session.id}>
              <Link href={`/session/${session.id}`}><strong>{session.name}</strong></Link>
              <span className="faint">{session.completed_at ? "Done" : "Open"} · {session.done_sets} sets</span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
