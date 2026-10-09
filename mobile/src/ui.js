import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const colors = {
  bg: "#090b10",
  card: "#141a24",
  line: "rgba(255,255,255,0.08)",
  text: "#f4f7fb",
  muted: "#a3adbf",
  faint: "#738096",
  accent: "#d6ff4a",
  ink: "#152000",
  rose: "#ff6b81",
};

export function Screen({ children, scroll = true, padBottom = 24 }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12) + padBottom;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1, paddingBottom: bottom }]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}

export function Kicker({ children }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function Title({ children }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, style }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ label, onPress, kind = "accent", disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === "accent" && styles.accent,
        kind === "ghost" && styles.ghost,
        kind === "danger" && styles.danger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, kind !== "accent" && { color: kind === "danger" ? colors.rose : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, onBlur, placeholder, keyboard, multiline, autoCapitalize }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboard || "default"}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={keyboard === "decimal-pad" || keyboard === "number-pad" ? false : undefined}
        style={[styles.input, multiline && styles.inputMulti]}
      />
    </View>
  );
}

export function Chips({ options, value, onChange, multi = false, wrap = false }) {
  const selected = multi ? new Set(value || []) : null;
  const chips = options.map((option) => {
    const key = option.value ?? option;
    const label = option.label ?? option;
    const active = multi ? selected.has(key) : value === key;
    return (
      <Pressable
        key={key}
        onPress={() => {
          if (!multi) onChange(key);
          else onChange(active ? (value || []).filter((item) => item !== key) : [...(value || []), key]);
        }}
        style={[styles.chip, active && styles.chipOn]}
      >
        <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
      </Pressable>
    );
  });
  if (wrap) return <View style={styles.chipsWrap}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {chips}
    </ScrollView>
  );
}

// Section header for a block. A superset gets a lime rail down its left side
// and a line saying the pair is done back to back.
export function BlockGroup({ group, children }) {
  if (!group.superset) {
    return (
      <View style={{ gap: 8 }}>
        {group.block ? <Text style={styles.blockLabel}>{group.block}</Text> : null}
        {children}
      </View>
    );
  }
  const tags = group.items.map((item) => item.tag).join(" + ");
  return (
    <View style={styles.superset}>
      <View style={styles.supersetHead}>
        <Text style={styles.supersetBadge}>SUPERSET {group.code}</Text>
        <Text style={styles.supersetHint}>{tags} back to back, rest after {group.items[group.items.length - 1].tag}</Text>
      </View>
      {children}
    </View>
  );
}

export function Tag({ children }) {
  return <Text style={styles.tag}>{children}</Text>;
}

export function useReload() {
  const [tick, setTick] = useState(0);
  return [tick, () => setTick((value) => value + 1)];
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  kicker: { color: colors.faint, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.8, lineHeight: 38 },
  muted: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
  button: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  accent: { backgroundColor: colors.accent },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: "transparent" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.4 },
  buttonText: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    backgroundColor: "#0c1118", color: colors.text, fontSize: 17, paddingHorizontal: 12, paddingVertical: 10,
  },
  inputMulti: { minHeight: 96, textAlignVertical: "top" },
  chips: { gap: 8, paddingVertical: 2 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  chipTextOn: { color: colors.ink },
  blockLabel: { color: colors.faint, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 4 },
  superset: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 10, gap: 8, marginTop: 4 },
  supersetHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  supersetBadge: {
    color: colors.ink, backgroundColor: colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden",
  },
  supersetHint: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  tag: {
    color: colors.accent, borderColor: colors.accent, borderWidth: 1, fontSize: 12, fontWeight: "900",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden",
  },
});
