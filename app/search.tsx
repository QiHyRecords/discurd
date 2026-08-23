import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar, IconButton } from "@/components/luma-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useLuma, usePalette } from "@/lib/luma/context";
import { supabase } from "@/lib/luma/supabase";

type Result = { key: string; kind: "person" | "message" | "space"; title: string; detail: string; target?: string; initials?: string; accent?: string };
const initials = (value: string) => value.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export default function SearchScreen() {
  const { spaces } = useLuma();
  const palette = usePalette();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      void (async () => {
        setSearching(true);
        const escaped = term.replace(/[,%]/g, "");
        const [{ data: profiles }, { data: messages }] = await Promise.all([
          supabase.from("profiles").select("id, display_name, username").or(`display_name.ilike.%${escaped}%,username.ilike.%${escaped}%`).limit(20),
          supabase.from("messages").select("id, body, channel_id, conversation_id").ilike("body", `%${escaped}%`).is("deleted_at", null).limit(30),
        ]);
        const spaceResults = spaces.filter((space) => `${space.name} ${space.description}`.toLowerCase().includes(term.toLowerCase())).map((space) => ({ key: `space-${space.id}`, kind: "space" as const, title: space.name, detail: space.description, target: space.id, initials: space.initials, accent: space.accent }));
        setResults([...(profiles ?? []).map((profile) => ({ key: `person-${profile.id}`, kind: "person" as const, title: profile.display_name, detail: `@${profile.username}`, target: profile.id, initials: initials(profile.display_name), accent: palette.primary })), ...spaceResults, ...(messages ?? []).map((message) => ({ key: `message-${message.id}`, kind: "message" as const, title: "Message result", detail: message.body, target: message.channel_id ?? message.conversation_id ?? undefined }))]);
        setSearching(false);
      })();
    }, 280);
    return () => clearTimeout(timer);
  }, [palette.primary, query, spaces]);
  const open = (result: Result) => result.kind === "person" ? router.push({ pathname: "/profile/[id]", params: { id: result.target ?? "" } }) : result.kind === "space" ? router.push({ pathname: "/space/[id]", params: { id: result.target ?? "" } }) : router.push({ pathname: "/conversation/[id]", params: { id: result.target ?? "" } });
  return <ScreenContainer className="flex-1"><View style={[styles.screen, { backgroundColor: palette.background }]}><FlatList data={results} keyExtractor={(item) => item.key} contentContainerStyle={styles.content} ListHeaderComponent={<><View style={styles.head}><IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} /><Text style={[styles.title, { color: palette.text }]}>Search</Text></View><View style={[styles.field, { backgroundColor: palette.surface, borderColor: palette.border }]}><MaterialIcons name="search" size={20} color={palette.tertiary} /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="People, spaces, or messages" placeholderTextColor={palette.tertiary} style={[styles.input, { color: palette.text }]} accessibilityLabel="Search" /></View>{!query ? <View style={styles.hint}><Text style={[styles.hintTitle, { color: palette.text }]}>Find what matters.</Text><Text style={[styles.hintCopy, { color: palette.secondary }]}>Search queries only profiles and messages visible to your signed-in Supabase account.</Text></View> : <Text style={[styles.label, { color: palette.secondary }]}>{searching ? "SEARCHING…" : "RESULTS"}</Text>}</>} renderItem={({ item }) => <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.result, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]} accessibilityRole="button">{item.kind === "message" ? <View style={[styles.messageGlyph, { backgroundColor: palette.primarySoft }]}><MaterialIcons name="chat-bubble-outline" size={19} color={palette.primary} /></View> : <Avatar initials={item.initials ?? "LL"} accent={item.accent ?? palette.primary} size={42} />}<View style={styles.resultText}><Text style={[styles.resultTitle, { color: palette.text }]}>{item.title}</Text><Text numberOfLines={2} style={[styles.resultDetail, { color: palette.secondary }]}>{item.detail}</Text></View><MaterialIcons name="chevron-right" size={20} color={palette.tertiary} /></Pressable>} ListEmptyComponent={query.length >= 2 && !searching ? <View style={styles.none}><MaterialIcons name="search-off" size={27} color={palette.tertiary} /><Text style={[styles.noneTitle, { color: palette.text }]}>No live results</Text><Text style={[styles.noneCopy, { color: palette.secondary }]}>Try a different name or phrase.</Text></View> : null} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, paddingBottom: 100 }, head: { minHeight: 43, alignItems: "center", flexDirection: "row", gap: 13 }, title: { fontSize: 24, fontWeight: "800" }, field: { marginTop: 17, height: 48, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 }, input: { flex: 1, fontSize: 15 }, hint: { paddingTop: 43, paddingHorizontal: 14, alignItems: "center" }, hintTitle: { fontSize: 20, fontWeight: "800" }, hintCopy: { textAlign: "center", fontSize: 14, lineHeight: 20, marginTop: 7 }, label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginTop: 22, marginBottom: 9 }, result: { minHeight: 71, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: StyleSheet.hairlineWidth, marginBottom: 9 }, resultText: { flex: 1 }, resultTitle: { fontSize: 15, fontWeight: "800" }, resultDetail: { fontSize: 13, marginTop: 3, lineHeight: 18 }, messageGlyph: { height: 42, width: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, none: { alignItems: "center", paddingTop: 52 }, noneTitle: { fontSize: 18, fontWeight: "800", marginTop: 12 }, noneCopy: { fontSize: 14, marginTop: 6 }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] } });
