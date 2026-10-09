import { Chart } from "@/components/BodyBoard";
import { growth, profile } from "@/lib/db";
import { formatVolume } from "@/lib/load";

export const dynamic = "force-dynamic";

export default function GrowthPage() {
  const me = profile();
  const lifts = growth();
  return (
    <div className="stack">
      <header>
        <p className="kicker">Progress</p>
        <h1>Loads you have logged.</h1>
        <p className="lede">Each logged set keeps the weight, the reps, and the volume (weight × reps). Estimated one-rep max is weight × (1 + reps / 30). On one-sided lifts, the lighter side counts. Body measurements live on the Body page.</p>
      </header>
      {lifts.length ? lifts.map((lift) => (
        <section className="card stack" key={lift.id}>
          <div className="spread">
            <h2>{lift.name}</h2>
            <p className="muted">
              {lift.best ? `Best ${lift.best.weight} ${me.unit}` : "No load yet"}
              {lift.bestE1?.e1rm ? ` · e1RM ${lift.bestE1.e1rm}` : ""}
              {lift.totalVolume ? ` · Volume ${formatVolume(lift.totalVolume, me.unit)}` : ""}
            </p>
          </div>
          <Chart values={lift.points.map((point) => point.weight).filter((value) => value != null)} />
          <table className="table">
            <thead><tr><th>When</th><th>Load</th><th>Reps</th><th>Volume</th><th>e1RM</th></tr></thead>
            <tbody>
              {[...lift.points].reverse().slice(0, 12).map((point, index) => (
                <tr key={`${point.at}-${index}`}>
                  <td>{new Date(point.at).toLocaleDateString()}</td>
                  <td>{point.weight ?? "—"} {me.unit}</td>
                  <td>{point.reps ?? "—"}</td>
                  <td>{formatVolume(point.volume, me.unit) || "—"}</td>
                  <td>{point.e1rm ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )) : <p className="muted">Log a few sets with a weight and the lifts show up here.</p>}
    </div>
  );
}
