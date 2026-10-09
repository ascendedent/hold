import { useState } from "react";
import { Alert, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { deleteGoal, listGoals, saveGoal } from "../src/db";
import { Button, Card, Chips, Field, Kicker, Muted, Screen, Title, colors, useReload } from "../src/ui";

export default function Goals() {
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const goals = listGoals();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("custom");
  const [direction, setDirection] = useState("up");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Screen>
      <Kicker>Goals</Kicker>
      <Title>Targets you care about.</Title>
      <Muted>A lift, a body weight, or a weekly streak. Pause one when it stops mattering.</Muted>
      {goals.map((goal) => (
        <Card key={goal.id}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{goal.title}</Text>
          <Muted>{goal.status} · {goal.kind}{goal.target ? ` · target ${goal.target} ${goal.unit || ""}` : ""}</Muted>
          {goal.notes ? <Muted>{goal.notes}</Muted> : null}
          <Button label={goal.status === "paused" ? "Resume" : "Pause"} kind="ghost" onPress={() => { saveGoal({ ...goal, status: goal.status === "paused" ? "active" : "paused" }); reload(); }} />
          <Button label="Mark done" kind="ghost" onPress={() => { saveGoal({ ...goal, status: "done" }); reload(); }} />
          <Button label="Delete" kind="danger" onPress={() => Alert.alert("Delete goal", goal.title, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => { deleteGoal(goal.id); reload(); } },
          ])} />
        </Card>
      ))}
      <Card>
        <Field label="Goal" value={title} onChangeText={setTitle} />
        <Chips options={["custom", "weight", "lift", "consistency"]} value={kind} onChange={setKind} />
        <Chips options={[{ value: "up", label: "Up" }, { value: "down", label: "Down" }, { value: "hold", label: "Hold" }]} value={direction} onChange={setDirection} />
        <Field label="Target" value={target} onChangeText={setTarget} keyboard="decimal-pad" />
        <Field label="Unit" value={unit} onChangeText={setUnit} />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        <Button label="Add goal" onPress={() => {
          if (!title.trim()) return;
          saveGoal({ title, kind, direction, target, unit, notes });
          setTitle("");
          setTarget("");
          setUnit("");
          setNotes("");
          reload();
        }} />
      </Card>
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}
