import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/luma-ui";
import { ScreenContainer } from "@/components/screen-container";
import { usePalette } from "@/lib/luma/context";

export default function CallScreen() {
  const params = useLocalSearchParams<{ name?: string; initials?: string; accent?: string }>();
  const palette = usePalette();
  const name = params.name ?? "Selected contact";
  const initials = params.initials ?? "LL";
  const accent = params.accent ?? palette.primary;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><View style={[styles.screen, { backgroundColor: palette.background }]}><Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.dismiss, { backgroundColor: palette.surface }]}><MaterialIcons name="keyboard-arrow-down" size={25} color={palette.text} /></Pressable><View style={styles.center}><Avatar initials={initials} accent={accent} size={112} /><Text style={[styles.name, { color: palette.text }]}>{name}</Text><Text style={[styles.status, { color: palette.secondary }]}>Calling is not configured</Text><Text style={[styles.detail, { color: palette.secondary }]}>This build does not simulate a connection. Add a WebRTC provider token service and room-access policy before enabling audio or video controls.</Text></View><View style={styles.controls}><View style={styles.controlRow}><Control icon="mic-off" label="Mute" /><Control icon="volume-up" label="Speaker" /><Control icon="videocam-off" label="Video" /></View><Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.end, { backgroundColor: palette.danger }]}><MaterialIcons name="close" size={25} color="#FFFFFF" /></Pressable></View></View></ScreenContainer>;
}

function Control({ icon, label }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string }) {
  const palette = usePalette();
  return <View accessibilityLabel={`${label} unavailable until a calling provider is configured`} style={[styles.control, { backgroundColor: palette.surface, borderColor: palette.border, opacity: 0.55 }]}><MaterialIcons name={icon} size={22} color={palette.text} /><Text style={[styles.controlLabel, { color: palette.text }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, padding: 22, justifyContent: "space-between" }, dismiss: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, center: { alignItems: "center", marginTop: "12%" }, name: { fontSize: 29, letterSpacing: -0.5, fontWeight: "800", marginTop: 21 }, status: { fontSize: 15, marginTop: 5 }, detail: { maxWidth: 285, textAlign: "center", fontSize: 14, lineHeight: 20, marginTop: 18 }, controls: { alignItems: "center", gap: 23, paddingBottom: 12 }, controlRow: { flexDirection: "row", gap: 13 }, control: { width: 80, height: 74, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center", gap: 5 }, controlLabel: { fontSize: 12, fontWeight: "700" }, end: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center" } });
