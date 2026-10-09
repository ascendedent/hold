import { useState } from "react";
import { Alert, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { deleteBody, listBody, profile, saveBody } from "../src/db";
import { todayStamp } from "../src/pure";
import { Button, Card, Field, Kicker, Muted, Screen, Title, colors, useReload } from "../src/ui";

const TAPES = ["waist", "chest", "hips", "thigh", "arm", "neck"];

export default function Body() {
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const unit = profile().unit;
  const tape = unit === "kg" ? "cm" : "in";
  const logs = listBody();
  const latest = logs.find((row) => row.weight != null);
  const [date, setDate] = useState(todayStamp());
  const [weight, setWeight] = useState("");
  const [measures, setMeasures] = useState({ waist: "", chest: "", hips: "", thigh: "", arm: "", neck: "" });
  const [notes, setNotes] = useState("");

  return (
    <Screen>
      <Kicker>Body</Kicker>
      <Title>Weight and measurements.</Title>
      <Muted>{latest ? `Latest ${latest.weight} ${latest.unit} on ${latest.logged_on}` : "Log a weigh-in and the line starts."}</Muted>
      <Card>
        <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label={`Weight (${unit})`} value={weight} onChangeText={setWeight} keyboard="decimal-pad" />
        {TAPES.map((key) => (
          <Field key={key} label={`${key[0].toUpperCase()}${key.slice(1)} (${tape})`} value={measures[key]} onChangeText={(value) => setMeasures({ ...measures, [key]: value })} keyboard="decimal-pad" />
        ))}
        <Field label="Note" value={notes} onChangeText={setNotes} multiline />
        <Button label="Save entry" onPress={() => {
          saveBody({ logged_on: date, weight, ...measures, notes, unit });
          setWeight("");
          setMeasures({ waist: "", chest: "", hips: "", thigh: "", arm: "", neck: "" });
          setNotes("");
          reload();
        }} />
      </Card>
      {logs.map((row) => (
        <Card key={row.id}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>{row.logged_on}</Text>
          <Muted>{row.weight == null ? "No weight" : `${row.weight} ${row.unit}`}</Muted>
          <Muted>Waist {row.waist ?? "—"} · Chest {row.chest ?? "—"} · Hips {row.hips ?? "—"}</Muted>
          <Button label="Delete" kind="danger" onPress={() => Alert.alert("Delete this entry?", "", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => { deleteBody(row.id); reload(); } },
          ])} />
        </Card>
      ))}
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}
