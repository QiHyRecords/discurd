import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { IconButton } from "@/components/luma-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useLuma, usePalette } from "@/lib/luma/context";
import { supabase } from "@/lib/luma/supabase";

export default function CreateSpaceScreen() {
  const palette = usePalette();
  const { refresh } = useLuma();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const create = async () => {
    if (!name.trim() || saving) return;
    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke("manage-community", { body: { action: "create_server", name: name.trim(), description: description.trim() } });
      if (error) throw error;
      await refresh();
      router.replace({ pathname: "/space/[id]", params: { id: data.id } });
    } catch (error) { Alert.alert("Could not create space", error instanceof Error ? error.message : "Please try again."); }
    finally { setSaving(false); }
  };
  return <ScreenContainer className="flex-1"><View style={[styles.screen, { backgroundColor: palette.background }]}><View style={styles.nav}><IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} /><Text style={[styles.navTitle, { color: palette.text }]}>Create space</Text></View><Text style={[styles.title, { color: palette.text }]}>Give your people a place.</Text><Text style={[styles.copy, { color: palette.secondary }]}>Creating a space makes you its owner, adds an Owner role, and creates a live General category with #general.</Text><TextInput value={name} onChangeText={setName} placeholder="Space name" placeholderTextColor={palette.tertiary} style={[styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]} /><TextInput value={description} onChangeText={setDescription} placeholder="What is this space for?" placeholderTextColor={palette.tertiary} multiline style={[styles.textarea, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]} /><Pressable onPress={() => void create()} disabled={!name.trim() || saving} style={({ pressed }) => [styles.button, { backgroundColor: name.trim() && !saving ? palette.primary : palette.border }, pressed && styles.pressed]}><Text style={styles.buttonText}>{saving ? "Creating…" : "Create live space"}</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ screen: { flex: 1, padding: 20 }, nav: { flexDirection: "row", alignItems: "center", gap: 12 }, navTitle: { fontSize: 17, fontWeight: "800" }, title: { fontSize: 31, lineHeight: 38, fontWeight: "800", letterSpacing: -0.6, marginTop: 33 }, copy: { fontSize: 15, lineHeight: 22, marginTop: 10 }, input: { minHeight: 52, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 15, fontSize: 15, marginTop: 27 }, textarea: { minHeight: 114, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 15, fontSize: 15, marginTop: 11, textAlignVertical: "top" }, button: { minHeight: 53, borderRadius: 17, marginTop: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] } });
