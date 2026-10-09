import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { deleteNote, listBody, listNotes, planInfo, profile, saveBody, saveNote, saveProfile, setSetting } from "../../src/db";
import { parseTime, syncReminders } from "../../src/reminders";
import { heartZones, todayStamp } from "../../src/pure";
import { Button, Card, Chips, Field, Kicker, Muted, Screen, Title, colors, useReload } from "../../src/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function note(setStatus) {
  return (result) => setStatus(result.allowed
    ? (result.scheduled ? `${result.scheduled} weekly reminders set.` : "Reminders are off.")
    : "Notifications are off for Hold. Turn them on in iOS Settings → Hold → Notifications.");
}

const AREAS = [
  { value: "training", label: "Training" },
  { value: "recovery", label: "Recovery" },
  { value: "life", label: "Life" },
  { value: "focus", label: "Focus" },
];

const CM_PER_IN = 2.54;

function heightParts(cm, unit) {
  if (!cm) return { feet: "", inches: "", cm: "" };
  if (unit === "kg") return { feet: "", inches: "", cm: String(Math.round(cm)) };
  const total = Math.round(cm / CM_PER_IN);
  return { feet: String(Math.floor(total / 12)), inches: String(total % 12), cm: "" };
}

function heightCm(parts, unit) {
  if (unit === "kg") return Number(parts.cm) || null;
  const total = (Number(parts.feet) || 0) * 12 + (Number(parts.inches) || 0);
  return total ? Math.round(total * CM_PER_IN * 10) / 10 : null;
}

export default function You() {
  const router = useRouter();
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const me = profile();
  const [name, setName] = useState(me.name);
  const [age, setAge] = useState(me.age == null ? "" : String(me.age));
  const [unit, setUnit] = useState(me.unit);
  const [height, setHeight] = useState(heightParts(me.height_cm, me.unit));
  const [weight, setWeight] = useState("");
  const latest = listBody().find((row) => row.weight != null);
  const plan = planInfo();
  const [time, setTime] = useState(plan?.reminderTime || "07:30");
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("training");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const notes = listNotes(area);
  const zones = heartZones(age);

  return (
    <Screen>
      <Kicker>You</Kicker>
      <Title>Your log.</Title>
      <Muted>Name, units, and notes you write yourself. They stay on this phone.</Muted>
      <Card>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Age" value={age} onChangeText={setAge} keyboard="number-pad" placeholder="Optional, for heart-rate zones" />
        {unit === "kg" ? (
          <Field label="Height (cm)" value={height.cm} onChangeText={(value) => setHeight({ ...height, cm: value })} keyboard="number-pad" />
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Height (ft)" value={height.feet} onChangeText={(value) => setHeight({ ...height, feet: value })} keyboard="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="(in)" value={height.inches} onChangeText={(value) => setHeight({ ...height, inches: value })} keyboard="number-pad" /></View>
          </View>
        )}
        <Field
          label={`Current weight (${unit})`}
          value={weight}
          onChangeText={setWeight}
          keyboard="decimal-pad"
          placeholder={latest ? `Last: ${latest.weight} ${latest.unit} on ${latest.logged_on}` : "Logs a weigh-in for today"}
        />
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>Unit</Text>
        <Chips
          options={[{ value: "lb", label: "Pounds" }, { value: "kg", label: "Kilograms" }]}
          value={unit}
          onChange={(value) => { setHeight(heightParts(heightCm(height, unit) ?? me.height_cm, value)); setUnit(value); }}
        />
        <Button label="Save profile" onPress={() => {
          saveProfile({ name, age, unit, height_cm: heightCm(height, unit) ?? me.height_cm });
          if (weight.trim()) saveBody({ logged_on: todayStamp(), weight, unit });
          setWeight("");
          reload();
        }} />
        <Button label="Weight and measurements log" kind="ghost" onPress={() => router.push("/body")} />
      </Card>
      {plan ? (
        <Card>
          <Kicker>Your plan · week {plan.week}</Kicker>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{plan.label}</Text>
          {plan.advance ? <Muted>{plan.advance}</Muted> : null}
          <Chips
            options={plan.phases}
            value={String(plan.phase)}
            onChange={(value) => { setSetting("plan_phase", value); syncReminders().catch(() => {}); reload(); }}
          />
          {plan.days.map((day) => (
            <Text key={day.weekday} style={{ color: colors.muted, fontSize: 14 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{DAYS[day.weekday]} </Text>{day.title}
            </Text>
          ))}
          <Field label="Reminder time (24-hour)" value={time} onChangeText={setTime} placeholder="07:30" />
          <Chips
            options={[{ value: "on", label: "Reminders on" }, { value: "off", label: "Off" }]}
            value={plan.reminders ? "on" : "off"}
            onChange={(value) => { setSetting("reminders", value); syncReminders().then(note(setStatus)).catch(() => {}); reload(); }}
          />
          <Button label="Save reminder time" kind="ghost" onPress={() => {
            const [hour, minute] = parseTime(time);
            const clean = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
            setTime(clean);
            setSetting("reminder_time", clean);
            syncReminders().then(note(setStatus)).catch(() => setStatus("Could not schedule reminders."));
          }} />
          {status ? <Muted>{status}</Muted> : null}
        </Card>
      ) : null}
      {zones ? <Muted>Estimated max heart rate {zones.max}. Warmup {zones.warmup}. Lifting {zones.lifting}. Finisher {zones.finisher}.</Muted> : null}
      <Chips options={AREAS} value={area} onChange={setArea} />
      {notes.map((note) => (
        <Card key={note.id}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{note.title}</Text>
          <Muted>{note.body}</Muted>
          <Pressable onPress={() => Alert.alert("Delete note", note.title, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => { deleteNote(note.id); reload(); } },
          ])}><Text style={{ color: colors.rose, fontWeight: "700" }}>Delete</Text></Pressable>
        </Card>
      ))}
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Add a {AREAS.find((item) => item.value === area).label.toLowerCase()} note</Text>
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Note" value={body} onChangeText={setBody} multiline />
        <Button label="Add note" onPress={() => {
          if (!title.trim() || !body.trim()) return;
          saveNote({ area, title, body });
          setTitle("");
          setBody("");
          reload();
        }} />
      </Card>
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}
