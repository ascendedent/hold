import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { listBody, listGoals, listSessions, listTemplates, openSession, planInfo, profile, startBlank, weekSessions } from "../../src/db";
import { Button, Card, Kicker, Muted, Screen, Title, colors, useReload } from "../../src/ui";

export default function Today() {
  const router = useRouter();
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const me = profile();
  const open = openSession();
  const routines = listTemplates().slice(0, 4);
  const done = weekSessions();
  const latest = listBody().find((row) => row.weight != null);
  const goals = listGoals().filter((goal) => goal.status === "active");
  const recent = listSessions().slice(0, 4);
  const plan = planInfo();
  const greeting = me?.name && me.name !== "You" ? me.name : "there";
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <Screen>
      <Kicker>{date}</Kicker>
      <Title>Hey, {greeting}.</Title>
      <Muted>Start from nothing, or open a routine you already built.</Muted>
      <Card>
        {open ? (
          <>
            <Kicker>In progress</Kicker>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{open.name}</Text>
            <Muted>Started {new Date(open.started_at).toLocaleString()}</Muted>
            <Button label="Resume workout" onPress={() => router.push(`/session/${open.id}`)} />
          </>
        ) : (
          <>
            <Kicker>Train</Kicker>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>Ready when you are.</Text>
            <Muted>An empty workout lets you add exercises as you go.</Muted>
            <Button label="Start empty workout" onPress={() => router.push(`/session/${startBlank().id}`)} />
          </>
        )}
      </Card>
      {plan ? (
        <Card>
          <Kicker>Today's plan · Phase {plan.phase} · week {plan.week}</Kicker>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{plan.today.title}</Text>
          {plan.today.body ? <Muted>{plan.today.body}</Muted> : null}
          {plan.today.routines.map((routine) => (
            <Button key={routine.id} label={`Open ${routine.name}`} kind="ghost" onPress={() => router.push(`/routine/${routine.id}`)} />
          ))}
        </Card>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat label="Last 7 days" value={String(done)} detail={done === 1 ? "finished workout" : "finished workouts"} onPress={() => router.push("/history")} />
        <Stat label="Body weight" value={latest ? String(latest.weight) : "—"} detail={latest ? `${latest.unit} · ${latest.logged_on}` : "No weigh-in yet"} onPress={() => router.push("/body")} />
      </View>
      <Pressable onPress={() => router.push("/goals")}>
        <Card>
          <Text style={{ color: colors.faint, fontSize: 13 }}>Active goals</Text>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>{goals.length}</Text>
          <Muted>{goals[0]?.title || "Add one when you want a target."}</Muted>
        </Card>
      </Pressable>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>Routines</Text>
        <Pressable onPress={() => router.push("/routines")} hitSlop={12}><Text style={{ color: colors.accent, fontWeight: "700" }}>See all</Text></Pressable>
      </View>
      {routines.length ? routines.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/routine/${item.id}`)}>
          <Card>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{item.name}</Text>
            <Muted>{item.summary || "Open to edit or start."}</Muted>
          </Card>
        </Pressable>
      )) : (
        <Card>
          <Muted>No routines yet. Build one when a workout is worth repeating.</Muted>
          <Button label="New routine" kind="ghost" onPress={() => router.push("/routines")} />
        </Card>
      )}
      {recent.length ? (
        <>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>Recent</Text>
          {recent.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/session/${item.id}`)}>
              <Card>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{item.name}</Text>
                <Muted>{item.completed_at ? "Finished" : "Open"} · {item.done_sets} sets</Muted>
              </Card>
            </Pressable>
          ))}
        </>
      ) : null}
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}

function Stat({ label, value, detail, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Card>
        <Text style={{ color: colors.faint, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>{value}</Text>
        <Muted>{detail}</Muted>
      </Card>
    </Pressable>
  );
}
