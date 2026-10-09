import { useMemo, useState } from "react";
import { FlatList, Linking, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { GROUPINGS, choiceLabel, equipmentLabel, matchesExercise, muscleSummary, sortExercises } from "../../src/catalog";
import { listExerciseCards, saveExercise } from "../../src/db";
import { FilterSheet } from "../../src/FilterSheet";
import { photoSource } from "../../src/photos";
import { Button, Card, Field, Kicker, Muted, colors } from "../../src/ui";

export default function Library() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [grouping, setGrouping] = useState("");
  const [muscles, setMuscles] = useState([]);
  const [gear, setGear] = useState([]);
  const [multiOnly, setMultiOnly] = useState(false);
  const [sort, setSort] = useState("name");
  const [name, setName] = useState("");
  const [steps, setSteps] = useState("");
  const [error, setError] = useState("");
  const cards = listExerciseCards();
  const shown = useMemo(() => sortExercises(
    cards.filter((exercise) => matchesExercise(exercise, {
      query, muscles, equipment: gear, grouping, multiOnly,
    })),
    sort,
  ), [cards, query, muscles, gear, grouping, multiOnly, sort]);
  const groupingLabel = GROUPINGS.find((item) => item.id === grouping)?.label;
  const filterCount = (grouping ? 1 : 0) + muscles.length + gear.length + (multiOnly ? 1 : 0) + (sort === "muscles" ? 1 : 0);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      data={shown}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={(
        <View style={{ gap: 12 }}>
          <Kicker>Exercises</Kicker>
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.8 }}>Find a movement.</Text>
          <Muted>{cards.length} exercises. Photos load for the public-domain ones. The rest have the steps.</Muted>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises, equipment, muscles"
            placeholderTextColor={colors.faint}
            style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: "#0c1118", color: colors.text, fontSize: 17, paddingHorizontal: 12 }}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          <Button label={filterCount ? `Filters · ${filterCount}` : "Filters"} kind="ghost" onPress={() => setOpen(true)} />
          {filterCount ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {groupingLabel ? <Pill label={groupingLabel} onPress={() => setGrouping("")} /> : null}
              {muscles.map((item) => <Pill key={item} label={choiceLabel(item)} onPress={() => setMuscles(muscles.filter((muscle) => muscle !== item))} />)}
              {gear.map((item) => <Pill key={item} label={item} onPress={() => setGear(gear.filter((piece) => piece !== item))} />)}
              {multiOnly ? <Pill label="Multi-muscle" onPress={() => setMultiOnly(false)} /> : null}
              {sort === "muscles" ? <Pill label="Most muscles" onPress={() => setSort("name")} /> : null}
            </View>
          ) : null}
          <Muted>{shown.length} {shown.length === 1 ? "exercise" : "exercises"}</Muted>
          <FilterSheet
            visible={open}
            onClose={() => setOpen(false)}
            exercises={cards}
            grouping={grouping}
            onGrouping={setGrouping}
            muscles={muscles}
            onMuscles={setMuscles}
            equipment={gear}
            onEquipment={setGear}
            multiOnly={multiOnly}
            onMultiOnly={setMultiOnly}
            sort={sort}
            onSort={setSort}
          />
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/exercise/${item.id}`)} style={{ marginTop: 12 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.line }}>
            {photoSource(item.image) ? (
              <Image source={photoSource(item.image)} style={{ width: "100%", height: 180 }} contentFit="contain" />
            ) : (
              <View style={{ height: 72, backgroundColor: "#0c1118", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.faint, fontWeight: "700" }}>No photo</Text>
              </View>
            )}
            <View style={{ padding: 14, gap: 4 }}>
              <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "700", letterSpacing: 0.8 }}>{choiceLabel(item.muscles?.[0] || item.category || "Move").toUpperCase()}</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{item.name}</Text>
              <Muted>{[equipmentLabel(item.equipment), item.level, muscleSummary(item)].filter(Boolean).join(" · ")}</Muted>
            </View>
          </View>
        </Pressable>
      )}
      ListFooterComponent={(
        <View style={{ gap: 12 }}>
          <Card style={{ marginTop: 16 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Add an exercise</Text>
            <Field label="Name" value={name} onChangeText={setName} />
            <Field label="Steps, one per line" value={steps} onChangeText={setSteps} multiline />
            {error ? <Text style={{ color: colors.rose }}>{error}</Text> : null}
            <Button label="Save exercise" onPress={() => {
              if (!name.trim()) { setError("Name it first."); return; }
              const created = saveExercise({ name, steps });
              setName("");
              setSteps("");
              router.push(`/exercise/${created.id}`);
            }} />
          </Card>
          <Muted>
            Photos: Free Exercise DB, public domain. Some illustrations:{" "}
            <Text style={{ textDecorationLine: "underline" }} onPress={() => Linking.openURL("https://repdb.co")}>
              Exercise data by RepDB (repdb.co)
            </Text>
            . Open drawings:{" "}
            <Text style={{ textDecorationLine: "underline" }} onPress={() => Linking.openURL("https://github.com/bryllim/workout-guide")}>
              Bryl Lim
            </Text>
            {" "}and{" "}
            <Text style={{ textDecorationLine: "underline" }} onPress={() => Linking.openURL("https://github.com/everkinetic/data")}>
              Everkinetic
            </Text>
            ,{" "}
            <Text style={{ textDecorationLine: "underline" }} onPress={() => Linking.openURL("https://creativecommons.org/licenses/by-sa/4.0/")}>
              CC BY-SA 4.0
            </Text>
            . Added exercise text: exercises-dataset, MIT, © 2026 Hasan Emir Yıldırım, with some steps corrected for Hold. Animations from that set are not included.
          </Muted>
        </View>
      )}
    />
  );
}

function Pill({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 36, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.ink, fontWeight: "700" }}>{label} ×</Text>
    </Pressable>
  );
}
