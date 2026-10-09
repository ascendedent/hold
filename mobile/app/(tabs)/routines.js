import { Pressable, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { createTemplate, listTemplates } from "../../src/db";
import { Button, Card, Kicker, Muted, Screen, Title, colors, useReload } from "../../src/ui";

export default function Routines() {
  const router = useRouter();
  const [tick, reload] = useReload();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const routines = listTemplates();

  return (
    <Screen>
      <Kicker>Routines</Kicker>
      <Title>Workouts you repeat.</Title>
      <Muted>A routine is a saved list. Nothing is preloaded.</Muted>
      <Button label="New workout" onPress={() => {
        const created = createTemplate({ name: "New workout" });
        router.push(`/routine/${created.id}`);
      }} />
      {routines.length ? routines.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/routine/${item.id}`)}>
          <Card>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{item.name}</Text>
            <Muted>{item.summary || "Open to edit or start."}</Muted>
          </Card>
        </Pressable>
      )) : (
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Start with a blank routine.</Text>
          <Muted>Name it, add exercises from the library, then start it whenever you train.</Muted>
        </Card>
      )}
      <Text style={{ display: "none" }}>{tick}</Text>
    </Screen>
  );
}
