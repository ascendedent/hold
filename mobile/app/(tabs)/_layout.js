import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { colors } from "../../src/ui";

const ITEMS = [
  ["index", "Today", "house.fill"],
  ["routines", "Routines", "list.bullet"],
  ["library", "Exercises", "dumbbell.fill"],
  ["progress", "Progress", "chart.line.uptrend.xyaxis"],
  ["you", "You", "person.fill"],
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: "#0c1017",
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {ITEMS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => <SymbolView name={icon} tintColor={color} size={22} />,
          }}
        />
      ))}
    </Tabs>
  );
}
