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
        <p className="lede">{exercises.length} exercises from the public-domain Free Exercise DB, with photos and steps. Add your own, or paste a YouTube link when you want a streamed demo.</p>
      </header>
      <LibraryBrowser exercises={exercises} />
      <ExerciseEditor />
      <p className="faint">Photos stream from the Free Exercise DB on GitHub. They are public domain. Hold does not download them.</p>
    </div>
  );
}
