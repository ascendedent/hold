import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { exerciseLoads, getExercise, profile, saveExercise } from "../../src/db";
import { formatVolume, prettyEquipment, youtubeId } from "../../src/pure";
import { photoSource } from "../../src/photos";
import { Button, Card, Field, Kicker, Muted, Screen, colors, useReload } from "../../src/ui";

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams();
  return <Exercise key={String(id)} id={String(id)} />;
}

function Exercise({ id }) {
  const [tick, reload] = useReload();
  const exercise = getExercise(id);
  const loads = exercise ? exerciseLoads(exercise.id) : [];
  const unit = profile().unit || "lb";
  const [name, setName] = useState(exercise?.name || "");
  const [category, setCategory] = useState(exercise?.category || "");
  const [equipment, setEquipment] = useState(exercise?.equipment || "");
  const [steps, setSteps] = useState((exercise?.steps || []).join("\n"));
  const [coaching, setCoaching] = useState(exercise?.watch_out || "");
  const [note, setNote] = useState(exercise?.for_you || "");
  const [video, setVideo] = useState(exercise?.video_id ? `https://youtu.be/${exercise.video_id}` : "");
  const [error, setError] = useState("");
  if (!exercise) return <Screen><Muted>That exercise is gone.</Muted></Screen>;

  return (
    <Screen>
      <Kicker>{(exercise.category || "Exercise").toUpperCase()}</Kicker>
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.6 }}>{exercise.name}</Text>
      <Muted>{prettyEquipment(exercise.equipment)}{exercise.level ? ` · ${exercise.level}` : ""}{exercise.mechanic ? ` · ${exercise.mechanic}` : ""}</Muted>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {exercise.muscles.map((muscle) => <Text key={muscle} style={{ color: colors.ink, backgroundColor: colors.accent, overflow: "hidden", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: "700" }}>{muscle}</Text>)}
        {exercise.secondary.map((muscle) => <Text key={muscle} style={{ color: colors.muted, borderColor: colors.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>{muscle}</Text>)}
      </View>
      {exercise.images.map((image) => (
        <View key={image.src} style={{ borderRadius: 16, overflow: "hidden", backgroundColor: "#0c1118" }}>
          <Image source={photoSource(image.src)} style={{ width: "100%", aspectRatio: 1 }} contentFit="contain" />
          <Text style={{ color: colors.faint, padding: 10 }}>{image.caption}</Text>
        </View>
      ))}
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Your loads</Text>
        {loads.length ? loads.slice(0, 12).map((point, index) => (
          <Muted key={`${point.at}-${index}`}>{new Date(point.at).toLocaleDateString()} · {point.weight ?? "—"} {unit} × {point.reps ?? "—"} · {formatVolume(point.volume, unit) || "—"}{point.e1rm ? ` · e1RM ${point.e1rm}` : ""}</Muted>
        )) : <Muted>No weight logged for this exercise yet. Log a set with a load and it stays here.</Muted>}
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>How to do it</Text>
        {exercise.steps.map((step, index) => (
          <Muted key={`${index}-${step}`}>{index + 1}. {step}</Muted>
        ))}
        <Muted>{exercise.photo_note ? `${exercise.photo_note} ` : ""}A YouTube link, if you add one, streams inside Hold.</Muted>
      </Card>
      {exercise.video_id ? (
        <Button label="Watch the demo" kind="ghost" onPress={() => WebBrowser.openBrowserAsync(`https://www.youtube-nocookie.com/embed/${exercise.video_id}`)} />
      ) : null}
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Edit this exercise</Text>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Category" value={category} onChangeText={setCategory} />
        <Field label="Equipment" value={equipment} onChangeText={setEquipment} />
        <Field label="Steps, one per line" value={steps} onChangeText={setSteps} multiline />
        <Field label="Coaching note" value={coaching} onChangeText={setCoaching} multiline />
        <Field label="Your note" value={note} onChangeText={setNote} multiline />
        <Field label="YouTube link" value={video} onChangeText={setVideo} placeholder="Streams inside Hold. Not downloaded." autoCapitalize="none" />
        {error ? <Text style={{ color: colors.rose }}>{error}</Text> : null}
        <Button label="Save" onPress={() => {
          if (video && !youtubeId(video)) { setError("Paste a YouTube link."); return; }
          setError("");
          saveExercise({ id: exercise.id, name, category, equipment, steps, watch_out: coaching, for_you: note, video });
          reload();
        }} />
      </Card>
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}
