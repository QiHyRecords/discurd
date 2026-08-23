import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar, IconButton } from "@/components/luma-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useLuma, usePalette } from "@/lib/luma/context";

export default function NewConversationScreen() {
  const { members, currentUser, createGroupConversation } = useLuma();
  const palette = usePalette();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const candidates = members.filter((member) => member.id !== currentUser.id);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const create = async () => {
    if (!selected.length || creating) return;
    try {
      setCreating(true);
      const id = await createGroupConversation(title, selected);
      router.replace({ pathname: "/conversation/[id]", params: { id } });
    } catch (error) {
      Alert.alert("Could not create group", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setCreating(false);
    }
  };
  return <ScreenContainer className="flex-1"><View style={[styles.screen, { backgroundColor: palette.background }]}><FlatList data={candidates} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} ListHeaderComponent={<><View style={styles.head}><IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} /><Text style={[styles.title, { color: palette.text }]}>New group</Text></View><Text style={[styles.copy, { color: palette.secondary }]}>Choose two or more people for a real group conversation.</Text><TextInput value={title} onChangeText={setTitle} placeholder="Group name (optional)" placeholderTextColor={palette.tertiary} style={[styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]} /><Text style={[styles.label, { color: palette.secondary }]}>ADD PEOPLE</Text></>} renderItem={({ item }) => <Pressable onPress={() => toggle(item.id)} style={({ pressed }) => [styles.row, { backgroundColor: palette.surface, borderColor: selected.includes(item.id) ? palette.primary : palette.border }, pressed && styles.pressed]} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(item.id) }}><Avatar initials={item.initials} accent={item.accent} presence={item.presence} size={43} /><View style={styles.rowText}><Text style={[styles.name, { color: palette.text }]}>{item.name}</Text><Text style={[styles.handle, { color: palette.secondary }]}>@{item.username}</Text></View><View style={[styles.check, { backgroundColor: selected.includes(item.id) ? palette.primary : palette.primarySoft }]}>{selected.includes(item.id) ? <MaterialIcons name="check" size={17} color="#FFFFFF" /> : null}</View></Pressable>} ListFooterComponent={<Pressable onPress={() => void create()} disabled={!selected.length || creating} style={[styles.create, { backgroundColor: selected.length && !creating ? palette.primary : palette.border }]}><Text style={styles.createText}>{creating ? "Creating…" : `Create group${selected.length ? ` · ${selected.length}` : ""}`}</Text><MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable>} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 20, paddingBottom: 100 }, head: { flexDirection: "row", alignItems: "center", gap: 13 }, title: { fontSize: 24, fontWeight: "800" }, copy: { fontSize: 14, lineHeight: 20, marginTop: 19 }, input: { minHeight: 50, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, marginTop: 17, paddingHorizontal: 14, fontSize: 15 }, label: { letterSpacing: 0.8, fontSize: 11, fontWeight: "800", marginTop: 23, marginBottom: 9 }, row: { minHeight: 68, borderWidth: StyleSheet.hairlineWidth, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 9 }, rowText: { flex: 1 }, name: { fontSize: 15, fontWeight: "800" }, handle: { fontSize: 12, marginTop: 2 }, check: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center" }, create: { minHeight: 51, borderRadius: 16, marginTop: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, createText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
