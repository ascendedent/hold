import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { listSessions, profile } from "../src/db";
import { formatVolume } from "../src/pure";
import { Card, Kicker, Muted, Screen, Title, colors, useReload } from "../src/ui";

export default function History() {
  const router = useRouter();
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const sessions = listSessions();
  const unit = profile().unit || "lb";

  return (
    <Screen>
      <Kicker>History</Kicker>
      <Title>What you trained.</Title>
      {sessions.length ? sessions.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/session/${item.id}`)}>
          <Card>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{item.name}</Text>
            <Muted>{new Date(item.started_at).toLocaleString()}</Muted>
            <Muted>{item.completed_at ? "Finished" : "Open"} · {item.energy || "good"} · {item.done_sets} sets · {formatVolume(item.load, unit) || `0 ${unit}`}</Muted>
          </Card>
        </Pressable>
      )) : <Card><Muted>Finished and open workouts show up here. Start one from Today.</Muted></Card>}
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}
