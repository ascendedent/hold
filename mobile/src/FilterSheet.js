import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GROUPINGS, choiceLabel, equipmentOptions, muscleOptions } from "./catalog";
import { colors } from "./ui";

export function FilterSheet({
  visible,
  onClose,
  exercises,
  grouping,
  onGrouping,
  muscles,
  onMuscles,
  equipment,
  onEquipment,
  multiOnly,
  onMultiOnly,
  sort,
  onSort,
}) {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState("split");
  const muscleChoices = muscleOptions(exercises);
  const gearChoices = equipmentOptions(exercises);

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 12) }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>Filters</Text>
          <Pressable onPress={onClose} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 8 }}>
            <Text style={{ color: colors.accent, fontSize: 17, fontWeight: "700" }}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
          <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 22 }}>A split has to train every side. Back means lats, mid-back, lower back, or traps. Checked muscles are required too.</Text>
          <Section title="Split" open={section === "split"} onPress={() => setSection(section === "split" ? "" : "split")} value={GROUPINGS.find((item) => item.id === grouping)?.label || "Any split"}>
            <Choice label="Any split" active={!grouping} onPress={() => onGrouping("")} />
            {GROUPINGS.map((item) => (
              <Choice key={item.id} label={item.label} active={grouping === item.id} onPress={() => onGrouping(item.id)} />
            ))}
          </Section>
          <Section title="Muscles" open={section === "muscles"} onPress={() => setSection(section === "muscles" ? "" : "muscles")} value={muscles.length ? `${muscles.length} required` : "Any muscle"}>
            {muscleChoices.map((item) => (
              <Choice key={item} label={choiceLabel(item)} active={muscles.includes(item)} onPress={() => toggle(muscles, onMuscles, item)} />
            ))}
          </Section>
          <Section title="Equipment" open={section === "equipment"} onPress={() => setSection(section === "equipment" ? "" : "equipment")} value={equipment.length ? `${equipment.length} selected` : "Any equipment"}>
            {gearChoices.map((item) => (
              <Choice key={item} label={item} active={equipment.includes(item)} onPress={() => toggle(equipment, onEquipment, item)} />
            ))}
          </Section>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
            <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>Only movements that train more than one muscle group</Text>
            <Switch value={multiOnly} onValueChange={onMultiOnly} trackColor={{ true: colors.accent, false: "#2a3344" }} />
          </View>
          <Text style={{ color: colors.faint, fontWeight: "700" }}>Sort</Text>
          <Choice label="Name" active={sort === "name"} onPress={() => onSort("name")} />
          <Choice label="Most muscle groups" active={sort === "muscles"} onPress={() => onSort("muscles")} />
          <Pressable
            onPress={() => { onGrouping(""); onMuscles([]); onEquipment([]); onMultiOnly(false); onSort("name"); }}
            style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: colors.rose, fontWeight: "700" }}>Clear filters</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({ title, value, open, onPress, children }) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
      <Pressable onPress={onPress} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: colors.muted, flexShrink: 1 }}>{open ? "Hide" : value}</Text>
      </Pressable>
      {open ? <View style={{ gap: 4 }}>{children}</View> : null}
    </View>
  );
}

function Choice({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
      <Text style={{ color: active ? colors.accent : colors.text, fontSize: 16, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: active ? colors.accent : colors.faint }}>{active ? "On" : ""}</Text>
    </Pressable>
  );
}
