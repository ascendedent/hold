import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  addItem,
  deleteItem,
  getTemplate,
  moveItem,
  openSessionFor,
  saveTemplate,
  searchExercises,
  startSession,
  updateItem,
} from "../../src/db";
import { groupBlocks, prettyEquipment } from "../../src/pure";
import { BlockGroup, Button, Card, Field, Kicker, Muted, Screen, Tag, colors, useReload } from "../../src/ui";

export default function RoutineScreen() {
  const { id } = useLocalSearchParams();
  return <Routine key={String(id)} id={String(id)} />;
}

function Routine({ id }) {
  const router = useRouter();
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, []));
  const template = getTemplate(id);
  const [editing, setEditing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [name, setName] = useState(template?.name || "");
  const [summary, setSummary] = useState(template?.summary || "");
  const [notes, setNotes] = useState(template?.notes || "");
  const [query, setQuery] = useState("");
  const [dose, setDose] = useState("3 x 8");
  if (!template) return <Screen><Muted>That routine is gone.</Muted></Screen>;
  const open = openSessionFor(template.id);
  const groups = groupBlocks(template.items);

  function start() {
    if (open) {
      router.push(`/session/${open.id}`);
      return;
    }
    if (!template.items.length) {
      Alert.alert("Add an exercise", "This routine is empty.");
      return;
    }
    try {
      router.push(`/session/${startSession(template.id).id}`);
    } catch (error) {
      Alert.alert("Could not start", error.message || "Try again.");
    }
  }

  return (
    <Screen>
      <Kicker>Routine · {template.items.length} exercises</Kicker>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }}>{template.name}</Text>
      {template.summary ? <Muted>{template.summary}</Muted> : null}
      <Button label={open ? "Resume workout" : "Log this workout"} onPress={start} />
      {template.notes ? (
        <Pressable onPress={() => setShowNotes(!showNotes)}>
          <Card>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{showNotes ? "Notes ▾" : "Notes ▸"}</Text>
            {showNotes ? <Muted>{template.notes}</Muted> : <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>{template.notes}</Text>}
          </Card>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>Exercises</Text>
        <Pressable onPress={() => setEditing(!editing)} hitSlop={12}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{editing ? "Done" : "Edit"}</Text>
        </Pressable>
      </View>
      {template.items.length ? groups.map((group, groupIndex) => (
        <BlockGroup key={`${group.block}-${groupIndex}`} group={group}>
          {group.items.map((item) => (
            <Card key={item.id}>
              <Pressable onPress={() => router.push(`/exercise/${item.exercise_id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {item.tag ? <Tag>{item.tag}</Tag> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{item.exercise_name}</Text>
                  <Muted style={{ fontSize: 14 }}>{item.dose}</Muted>
                </View>
                <Text style={{ color: colors.faint, fontSize: 22 }}>›</Text>
              </Pressable>
              {editing ? (
                <>
                  <Muted style={{ fontSize: 13 }}>{[item.block, prettyEquipment(item.equipment)].filter(Boolean).join(" · ")}</Muted>
                  <DoseField value={item.dose} onEnd={(next) => { updateItem({ id: item.id, dose: next }); reload(); }} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}><Button label="Up" kind="ghost" onPress={() => { moveItem(item.id, -1); reload(); }} /></View>
                    <View style={{ flex: 1 }}><Button label="Down" kind="ghost" onPress={() => { moveItem(item.id, 1); reload(); }} /></View>
                    <View style={{ flex: 1 }}><Button label="Remove" kind="danger" onPress={() => { deleteItem(item.id); reload(); }} /></View>
                  </View>
                </>
              ) : null}
            </Card>
          ))}
        </BlockGroup>
      )) : <Card><Muted>No exercises yet. Tap Edit to add the first one.</Muted></Card>}
      {editing ? (
        <>
          <Card>
            <Field label="Add an exercise" value={query} onChangeText={setQuery} placeholder="Search the library" />
            <Field label="Dose" value={dose} onChangeText={setDose} />
            {searchExercises(query).map((exercise) => (
              <Pressable key={exercise.id} onPress={() => {
                addItem({ templateId: template.id, exerciseId: exercise.id, dose, block: "Lift" });
                setQuery("");
                reload();
              }} style={{ minHeight: 48, justifyContent: "center" }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{exercise.name}</Text>
                <Muted>{prettyEquipment(exercise.equipment)}</Muted>
              </Pressable>
            ))}
          </Card>
          <Card>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Summary" value={summary} onChangeText={setSummary} placeholder="Push, short, about 45 minutes" />
            <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
            <Button label="Save details" onPress={() => { saveTemplate({ id: template.id, name, summary, notes }); reload(); }} />
            <Button label="Archive routine" kind="danger" onPress={() => {
              saveTemplate({ id: template.id, name, summary, notes, archived: 1 });
              router.back();
            }} />
          </Card>
        </>
      ) : null}
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}

function DoseField({ value, onEnd }) {
  const [text, setText] = useState(value);
  return <Field label="Dose" value={text} onChangeText={setText} onBlur={() => onEnd(text)} placeholder="3 x 8" />;
}
