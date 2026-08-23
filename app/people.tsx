import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, IconButton, Pill } from "@/components/luma-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useLuma, usePalette } from "@/lib/luma/context";

export default function PeopleScreen() {
  const { members, currentUser } = useLuma();
  const palette = usePalette();
  const people = members.filter((member) => member.id !== currentUser.id);
  return <ScreenContainer className="flex-1"><View style={[styles.screen, { backgroundColor: palette.background }]}><FlatList data={people} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} ListHeaderComponent={<View style={styles.head}><IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} /><View style={styles.titleBox}><Text style={[styles.title, { color: palette.text }]}>People</Text><Text style={[styles.subtitle, { color: palette.secondary }]}>Friends, requests, and people you may know.</Text></View><IconButton icon="person-add-alt" label="Add a friend" onPress={() => router.push("/search")} tone="filled" /></View>} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/profile/[id]", params: { id: item.id } })} accessibilityRole="button" style={({ pressed }) => [styles.row, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}><Avatar initials={item.initials} accent={item.accent} presence={item.presence} size={46} /><View style={styles.rowBody}><View style={styles.rowTitle}><Text style={[styles.name, { color: palette.text }]}>{item.name}</Text>{item.presence === "online" ? <Pill label="Online" /> : null}</View><Text numberOfLines={1} style={[styles.bio, { color: palette.secondary }]}>{item.bio}</Text></View><MaterialIcons name="chevron-right" size={20} color={palette.tertiary} /></Pressable>} ListFooterComponent={<Pressable onPress={() => router.push("/relationships")} style={[styles.requests, { backgroundColor: palette.primarySoft }]}><MaterialIcons name="mark-email-unread" size={19} color={palette.primary} /><Text style={[styles.requestText, { color: palette.primary }]}>Manage friend requests and blocks</Text></Pressable>} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 20, paddingBottom: 100 }, head: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 20 }, titleBox: { flex: 1 }, title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 }, subtitle: { fontSize: 12, marginTop: 2 }, row: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 13, marginBottom: 9 }, rowBody: { flex: 1 }, rowTitle: { flexDirection: "row", alignItems: "center", gap: 8 }, name: { fontSize: 16, fontWeight: "700" }, bio: { fontSize: 13, marginTop: 4 }, requests: { marginTop: 14, borderRadius: 16, padding: 15, flexDirection: "row", gap: 9, alignItems: "center" }, requestText: { flex: 1, fontSize: 13, fontWeight: "700" }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
