import { ExerciseEditor } from "@/components/ExerciseEditor";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { listExerciseCards } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  const exercises = listExerciseCards();
  return (
    <div className="stack">
      <header>
        <p className="kicker">Exercises</p>
        <h1>Find a movement.</h1>
        <p className="lede">{exercises.length} exercises. A split such as Chest + Triceps keeps movements that train every side of it. Photos load from Free Exercise DB when that movement has one. The same movement, under a different spelling, reuses that photo. Others use a RepDB illustration or an open CC BY-SA drawing of that same movement. Movements with no licensed photo keep the steps and stay blank.</p>
      </header>
      <LibraryBrowser exercises={exercises} />
      <ExerciseEditor />
      <p className="faint">Photos: Free Exercise DB, public domain. Some illustrations: <a href="https://repdb.co" style={{ textDecoration: "underline" }}>Exercise data by RepDB (repdb.co)</a>. Open drawings: <a href="https://github.com/bryllim/workout-guide" style={{ textDecoration: "underline" }}>Bryl Lim</a> and <a href="https://github.com/everkinetic/data" style={{ textDecoration: "underline" }}>Everkinetic</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" style={{ textDecoration: "underline" }}>CC BY-SA 4.0</a>. Exercise text added from exercises-dataset, MIT, © 2026 Hasan Emir Yıldırım, with some steps corrected for Hold. Animations from that set are not included.</p>
    </div>
  );
}
