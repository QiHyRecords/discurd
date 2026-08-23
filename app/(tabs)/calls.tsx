import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, MaterialCard, Pill, screenStyles } from "@/components/luma-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useLuma, usePalette } from "@/lib/luma/context";

export default function CallsScreen() {
  const { members, currentUser } = useLuma();
  const palette = usePalette();
  const s = screenStyles(palette);
  const available = members.filter((member) => member.id !== currentUser.id && member.presence !== "offline");
  return <ScreenContainer className="flex-1"><View style={s.screen}><FlatList data={available} keyExtractor={(item) => item.id} contentContainerStyle={s.content} ListHeaderComponent={<><View style={s.topRow}><View><Text style={s.title}>Calls</Text><Text style={s.subtitle}>See who is currently available.</Text></View></View><MaterialCard style={[styles.callCard, { backgroundColor: palette.primarySoft, borderColor: "transparent" }]}><View style={[styles.callIcon, { backgroundColor: palette.primary }]}><MaterialIcons name="graphic-eq" size={25} color="#FFFFFF" /></View><View style={styles.callCopy}><View style={styles.callTop}><Text style={[styles.callTitle, { color: palette.text }]}>Provider required</Text><Pill label="NOT CONFIGURED" /></View><Text style={[styles.callDetail, { color: palette.secondary }]}>Presence is live from Supabase. Audio and video stay disabled until a WebRTC provider and secure token service are deployed.</Text></View></MaterialCard><Text style={[styles.label, { color: palette.secondary }]}>AVAILABLE PEOPLE</Text></>} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/call", params: { name: item.name, initials: item.initials, accent: item.accent } })} accessibilityRole="button" style={({ pressed }) => [styles.person, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}><Avatar initials={item.initials} accent={item.accent} presence={item.presence} /><View style={styles.personText}><Text style={[styles.personName, { color: palette.text }]}>{item.name}</Text><Text style={[styles.personStatus, { color: palette.success }]}>{item.presence === "idle" ? "Idle" : "Online"}</Text></View><View style={[styles.callAction, { backgroundColor: palette.primarySoft }]}><MaterialIcons name="call" color={palette.primary} size={18} /></View></Pressable>} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  callCard: { padding: 16, flexDirection: "row", gap: 12, marginBottom: 26 }, callIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, callCopy: { flex: 1 }, callTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" }, callTitle: { fontSize: 16, fontWeight: "800" }, callDetail: { fontSize: 13, lineHeight: 18, marginTop: 5 }, label: { letterSpacing: 0.8, fontSize: 12, fontWeight: "800", marginBottom: 9 }, person: { minHeight: 76, borderWidth: StyleSheet.hairlineWidth, padding: 13, borderRadius: 18, flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 10 }, personText: { flex: 1 }, personName: { fontSize: 16, fontWeight: "700" }, personStatus: { fontSize: 13, marginTop: 3, fontWeight: "600" }, callAction: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
