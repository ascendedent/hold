import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addSessionExercise,
  addSet,
  deleteSession,
  getSession,
  latestLoads,
  profile,
  saveSet,
  searchExercises,
  skipExercise,
  updateSession,
} from "../../src/db";
import { EFFORT, formatVolume, groupBlocks, prettyEquipment, setVolume } from "../../src/pure";
import { BlockGroup, Button, Card, Chips, Field, Kicker, Muted, Screen, Tag, colors, useReload } from "../../src/ui";

const DIFFICULTY = [
  { value: "4", label: "Easy" },
  { value: "3", label: "3 left" },
  { value: "2", label: "2 left" },
  { value: "1", label: "1 left" },
  { value: "0", label: "Max" },
];

export default function SessionScreen() {
  const { id } = useLocalSearchParams();
  return <Session key={String(id)} id={String(id)} />;
}

function remaining(exercise) {
  return !exercise.skipped && exercise.sets.some((set) => !set.done);
}

function Session({ id }) {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tick, reload] = useReload();
  const session = getSession(Number(id));
  const unit = profile().unit;
  const prior = latestLoads(session?.id);
  const [focus, setFocus] = useState(null);
  const [open, setOpen] = useState({});
  const [query, setQuery] = useState("");
  const [note, setNote] = useState(session?.notes || "");
  const [rest, setRest] = useState({ left: 0, next: "" });

  useEffect(() => {
    if (rest.left <= 0) return undefined;
    const timer = setInterval(() => setRest((value) => ({ ...value, left: Math.max(0, value.left - 1) })), 1000);
    return () => clearInterval(timer);
  }, [rest.left > 0]);

  if (!session) return <Screen><Muted>That workout is gone.</Muted></Screen>;
  const groups = groupBlocks(session.exercises);
  const flat = groups.flatMap((group) => group.items.map((item) => ({ ...item, group })));
  const current = focus != null && flat.some((item) => item.id === focus) ? focus : flat.find(remaining)?.id;
  const finished = session.exercises.filter((item) => !item.skipped && item.sets.length && item.sets.every((set) => set.done)).length;
  const counted = session.exercises.filter((item) => !item.skipped).length;
  const load = session.exercises.reduce((sum, item) => (
    sum + item.sets.reduce((inner, set) => inner + (set.done ? (setVolume({ ...set, effort_unit: item.effort_unit }) || 0) : 0), 0)
  ), 0);
  const minutes = Math.max(0, Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000));

  function isOpen(item) {
    return open[item.id] ?? item.id === current;
  }

  function afterLog(item) {
    const fresh = getSession(session.id);
    const freshFlat = groupBlocks(fresh.exercises).flatMap((group) => group.items.map((entry) => ({ ...entry, group })));
    const here = freshFlat.find((entry) => entry.id === item.id);
    const group = here.group;
    let next = null;
    let restNow = true;
    if (group.superset) {
      const position = group.items.findIndex((entry) => entry.id === item.id);
      const later = group.items.slice(position + 1).find(remaining);
      if (later) {
        next = later;
        restNow = false;
      } else {
        next = group.items.find(remaining) || null;
      }
    } else if (remaining(here)) {
      next = here;
    }
    if (!next) next = freshFlat.find(remaining) || null;
    setFocus(next?.id ?? null);
    setOpen({});
    if (restNow) {
      const seconds = (group.superset ? group.items[group.items.length - 1].rest_sec : item.rest_sec) || 90;
      setRest({ left: seconds, next: next ? `${next.tag ? `${next.tag} ` : ""}${next.name}` : "Last set done" });
    } else {
      setRest({ left: 0, next: "" });
    }
  }

  function logSet(item, set, values) {
    saveSet({ ...values, id: set.id, done: true });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    afterLog(item);
    reload();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen padBottom={rest.left > 0 ? 120 : 24}>
        <Kicker>In progress · {minutes} min · {finished} of {counted} done</Kicker>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }}>{session.name}</Text>
        <Muted style={{ fontSize: 14 }}>Load so far {formatVolume(load, unit) || `0 ${unit}`}. Tap a name for photos and steps.</Muted>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Button label="Good day" kind={session.energy === "low" ? "ghost" : "accent"} onPress={() => { updateSession({ id: session.id, energy: "good", notes: note }); reload(); }} /></View>
          <View style={{ flex: 1 }}><Button label="Low day" kind={session.energy === "low" ? "accent" : "ghost"} onPress={() => { updateSession({ id: session.id, energy: "low", notes: note }); reload(); }} /></View>
        </View>
        {groups.map((group, groupIndex) => (
          <BlockGroup key={`${group.block}-${groupIndex}`} group={group}>
            {group.items.map((item) => (
              <ExerciseCard
                key={item.id}
                item={item}
                unit={unit}
                previous={prior[item.exercise_id]}
                expanded={isOpen(item)}
                current={item.id === current}
                onToggle={() => setOpen({ ...open, [item.id]: !isOpen(item) })}
                onOpenCard={() => router.push(`/exercise/${item.exercise_id}`)}
                onLog={(set, values) => logSet(item, set, values)}
                onAddSet={() => { addSet(item.id); reload(); }}
                onSkip={() => { skipExercise(item.id, !item.skipped); setFocus(null); reload(); }}
              />
            ))}
          </BlockGroup>
        ))}
        <Card>
          <Field label="Add an exercise" value={query} onChangeText={setQuery} placeholder="Search, at least 2 letters" />
          {searchExercises(query).slice(0, 6).map((exercise) => (
            <Pressable key={exercise.id} onPress={() => {
              const added = addSessionExercise({ sessionId: session.id, exerciseId: exercise.id });
              setQuery("");
              setFocus(added.id);
              reload();
            }} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{exercise.name}</Text>
              <Muted>{prettyEquipment(exercise.equipment)}</Muted>
            </Pressable>
          ))}
        </Card>
        <Field label="Session note" value={note} onChangeText={setNote} onBlur={() => updateSession({ id: session.id, energy: session.energy, notes: note })} multiline />
        <Button label="Finish workout" onPress={() => {
          updateSession({ id: session.id, energy: session.energy, notes: note, complete: true });
          router.replace("/history");
        }} />
        <Button label="Delete workout" kind="danger" onPress={() => Alert.alert("Delete this workout?", "The sets in it go with it.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => { deleteSession(session.id); router.back(); } },
        ])} />
        <Text style={{ display: "none" }}>{tick}</Text>
      </Screen>
      {rest.left > 0 ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 8 }}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1b2330", borderColor: colors.accent }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800" }}>Rest {formatClock(rest.left)}</Text>
              <Muted style={{ fontSize: 14 }}>Next: {rest.next}</Muted>
            </View>
            <View style={{ gap: 6 }}>
              <Pressable onPress={() => setRest({ ...rest, left: rest.left + 30 })} hitSlop={8}><Text style={{ color: colors.accent, fontWeight: "700" }}>+30s</Text></Pressable>
              <Pressable onPress={() => setRest({ left: 0, next: "" })} hitSlop={8}><Text style={{ color: colors.muted, fontWeight: "700" }}>Skip</Text></Pressable>
            </View>
          </Card>
        </View>
      ) : null}
    </View>
  );
}

function formatClock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function ExerciseCard({ item, unit, previous, expanded, current, onToggle, onOpenCard, onLog, onAddSet, onSkip }) {
  const done = item.sets.filter((set) => set.done).length;
  const complete = item.sets.length > 0 && done === item.sets.length;
  const effort = EFFORT[item.effort_unit] || EFFORT.reps;
  const last = [...item.sets].reverse().find((set) => set.done);
  return (
    <Card style={[current && { borderColor: colors.accent }, item.skipped && { opacity: 0.5 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {item.tag ? <Tag>{item.tag}</Tag> : null}
        <Pressable onPress={onOpenCard} style={{ flex: 1 }} hitSlop={4}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{item.name} <Text style={{ color: colors.faint }}>›</Text></Text>
          <Muted style={{ fontSize: 14 }}>{item.dose}</Muted>
        </Pressable>
        <Pressable onPress={onToggle} hitSlop={12} style={{ alignItems: "flex-end", minWidth: 56 }}>
          <Text style={{ color: complete ? colors.accent : colors.text, fontWeight: "800" }}>{item.skipped ? "Skipped" : complete ? "✓ Done" : `${done}/${item.sets.length}`}</Text>
          <Text style={{ color: colors.faint, fontSize: 18 }}>{expanded ? "▾" : "▸"}</Text>
        </Pressable>
      </View>
      {!expanded && last ? <Muted style={{ fontSize: 14 }}>Last set {describe(last, effort, unit)}</Muted> : null}
      {expanded ? (
        <>
          <Muted style={{ fontSize: 14 }}>
            {previous?.weight ? `Last time ${previous.weight} ${unit} × ${previous.reps ?? "—"}` : "No load logged for this one yet."}
          </Muted>
          {item.sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              unit={unit}
              effort={effort}
              unilateral={item.unilateral}
              suggested={previous?.weight}
              onLog={(values) => onLog(set, values)}
            />
          ))}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Button label="Add a set" kind="ghost" onPress={onAddSet} /></View>
            <View style={{ flex: 1 }}><Button label={item.skipped ? "Unskip" : "Skip"} kind="ghost" onPress={onSkip} /></View>
          </View>
        </>
      ) : null}
    </Card>
  );
}

function describe(set, effort, unit) {
  const amount = set.reps == null ? "—" : `${set.reps} ${effort.short}`;
  const load = set.weight == null ? "" : `${set.weight} ${unit} × `;
  const left = set.rir == null ? "" : ` · ${DIFFICULTY.find((option) => Number(option.value) === set.rir)?.label || `${set.rir} left`}`;
  return `${load}${amount}${left}`;
}

function SetRow({ set, unit, effort, unilateral, suggested, onLog }) {
  const [weight, setWeight] = useState(set.weight == null ? "" : String(set.weight));
  const [reps, setReps] = useState(set.reps == null ? "" : String(set.reps));
  const [weightR, setWeightR] = useState(set.weight_r == null ? "" : String(set.weight_r));
  const [repsR, setRepsR] = useState(set.reps_r == null ? "" : String(set.reps_r));
  const [rir, setRir] = useState(set.rir == null ? "" : String(set.rir));
  const [edit, setEdit] = useState(false);
  const left = unilateral ? "L " : "";

  if (set.done && !edit) {
    return (
      <Pressable onPress={() => setEdit(true)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Text style={{ color: colors.accent, fontWeight: "900", width: 24 }}>✓</Text>
        <Text style={{ color: colors.text, flex: 1, fontWeight: "600" }}>
          Set {set.set_index} · {describe({ ...set, weight: numberOrNull(weight), reps: numberOrNull(reps), rir: numberOrNull(rir) }, effort, unit)}
          {unilateral && (weightR || repsR) ? ` · R ${weightR || "—"} × ${repsR || "—"}` : ""}
        </Text>
        <Text style={{ color: colors.faint, fontSize: 13 }}>Edit</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Text style={{ color: colors.faint, fontWeight: "800" }}>Set {set.set_index}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label={`${left}Weight, ${unit}`} value={weight} onChangeText={setWeight} keyboard="decimal-pad" placeholder={suggested ? String(suggested) : effort === EFFORT.reps ? "" : "optional"} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={`${left}${effort.label}`} value={reps} onChangeText={setReps} keyboard={effort.keyboard} />
        </View>
      </View>
      {unilateral ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Field label={`R Weight, ${unit}`} value={weightR} onChangeText={setWeightR} keyboard="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Field label={`R ${effort.label}`} value={repsR} onChangeText={setRepsR} keyboard={effort.keyboard} /></View>
        </View>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>How hard? Reps left in the tank</Text>
      <Chips options={DIFFICULTY} value={rir} onChange={(value) => setRir(rir === value ? "" : value)} />
      <Button label={set.done ? "Update set" : "Log set"} onPress={() => { setEdit(false); onLog({ weight, reps, weight_r: weightR, reps_r: repsR, rir }); }} />
    </View>
  );
}

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
