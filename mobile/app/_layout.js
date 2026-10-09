import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDb } from "../src/db";
import { addTapListener, syncReminders } from "../src/reminders";
import { colors } from "../src/ui";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Root() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      initDb();
      setReady(true);
    } catch (err) {
      setError(err.message || "Could not open the training log.");
    } finally {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    syncReminders().catch(() => {});
    return addTapListener((id) => router.push(`/routine/${id}`));
  }, [ready]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Hold could not start</Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>{error}</Text>
      </View>
    );
  }

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="routine/[id]" options={{ title: "Routine" }} />
        <Stack.Screen name="exercise/[id]" options={{ title: "Exercise" }} />
        <Stack.Screen name="session/[id]" options={{ title: "Workout", gestureEnabled: false }} />
        <Stack.Screen name="body" options={{ title: "Body" }} />
        <Stack.Screen name="goals" options={{ title: "Goals" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
