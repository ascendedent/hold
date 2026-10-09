import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { growth, profile } from "../../src/db";
import { formatVolume } from "../../src/pure";
import { Card, Kicker, Muted, Screen, Title, colors, useReload } from "../../src/ui";

export default function Progress() {
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const rows = growth();
  const unit = profile().unit;

  return (
    <Screen>
      <Kicker>Progress</Kicker>
      <Title>Loads you have logged.</Title>
      <Muted>Each logged set keeps the weight, the reps, and the volume (weight × reps). Estimated one-rep max is weight × (1 + reps / 30). On one-sided lifts, the lighter side counts.</Muted>
      {rows.length ? rows.map((row) => (
        <Card key={row.id}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{row.name}</Text>
          <Muted>Best {row.best?.weight ? `${row.best.weight} ${unit}` : "—"}{row.bestE1?.e1rm ? ` · e1RM ${row.bestE1.e1rm}` : ""}</Muted>
          <Muted>Last {row.last?.weight || "—"} {unit} × {row.last?.reps || "—"} · Volume {formatVolume(row.totalVolume, unit) || "—"}</Muted>
          {row.points.slice(-6).reverse().map((point, index) => (
            <View key={`${point.at}-${index}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ color: colors.faint }}>{new Date(point.at).toLocaleDateString()}</Text>
              <Text style={{ color: colors.text, fontVariant: ["tabular-nums"] }}>{point.weight ?? "—"} × {point.reps ?? "—"}</Text>
              <Text style={{ color: colors.muted }}>{formatVolume(point.volume, unit) || "—"}</Text>
            </View>
          ))}
        </Card>
      )) : (
        <Card><Muted>Log a set with a weight and it shows up here, on the exercise, and on the workout.</Muted></Card>
      )}
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}
