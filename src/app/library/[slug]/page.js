import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseEditor } from "@/components/ExerciseEditor";
import { VideoButton } from "@/components/VideoButton";
import { getExercise } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ExercisePage({ params }) {
  const { slug } = await params;
  const exercise = getExercise(slug);
  if (!exercise) notFound();
  const equipment = !exercise.equipment || exercise.equipment === "body only" ? "Bodyweight" : exercise.equipment;
  return (
    <div className="stack">
      <p className="kicker"><Link href="/library">Exercises</Link> · {exercise.category}</p>
      <div className="spread">
        <div>
          <h1>{exercise.name}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {equipment}
            {exercise.level ? ` · ${exercise.level}` : ""}
            {exercise.mechanic ? ` · ${exercise.mechanic}` : ""}
          </p>
        </div>
        {exercise.video_id ? <VideoButton videoId={exercise.video_id} title={exercise.video_title || exercise.name} /> : null}
      </div>
      <div className="row">
        {exercise.muscles.map((muscle) => <span className="tag" key={muscle}>{muscle}</span>)}
        {exercise.secondary.map((muscle) => <span className="chip" key={muscle}>{muscle}</span>)}
      </div>
      {exercise.images.length ? (
        <div className="shot-row">
          {exercise.images.map((image) => (
            <figure className="shot" key={image.src}>
              <img src={image.src} alt={image.caption ? `${exercise.name}, ${image.caption}` : exercise.name} />
              {image.caption ? <figcaption>{image.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : <p className="muted">No photo for this one. The steps are the guide.</p>}
      <div className="card">
        <h3>How to do it</h3>
        <ol className="steps">{exercise.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      </div>
      {(exercise.watch_out || exercise.for_you) ? (
        <div className="split-note">
          {exercise.watch_out ? <div className="callout warn"><strong>Coaching note</strong>{exercise.watch_out}</div> : null}
          {exercise.for_you ? <div className="callout good"><strong>Your note</strong>{exercise.for_you}</div> : null}
        </div>
      ) : null}
      <p className="faint">{exercise.photo_note || "Photos: Free Exercise DB, public domain."} A YouTube link, if you add one, streams inside Hold.</p>
      <ExerciseEditor exercise={exercise} />
    </div>
  );
}
