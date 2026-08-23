import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLuma, usePalette } from "@/lib/luma/context";

export default function WelcomeScreen() {
  const { ready, session } = useLuma();
  const palette = usePalette();
  if (!ready) return <ScreenContainer edges={["top", "bottom", "left", "right"]} style={[styles.loading, { backgroundColor: palette.background }]}><ActivityIndicator color={palette.primary} /></ScreenContainer>;
  if (session) {
    router.replace("/(tabs)");
    return null;
  }
  const start = () => router.push("/auth");
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} style={[styles.screen, { backgroundColor: palette.background }]}>
    <View style={styles.hero}><View style={[styles.mark, { backgroundColor: palette.primary }]}><MaterialIcons name="hub" size={45} color="#FFFFFF" /></View><Text style={[styles.kicker, { color: palette.primary }]}>DISCURD</Text><Text style={[styles.title, { color: palette.text }]}>Make space for a better conversation.</Text><Text style={[styles.detail, { color: palette.secondary }]}>A calm home for your people, communities, and the moments that matter.</Text></View>
    <View style={styles.footer}><Pressable onPress={start} accessibilityRole="button" style={({ pressed }) => [styles.continue, { backgroundColor: palette.primary }, pressed && styles.pressed]}><Text style={styles.continueText}>Create your account</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable><Pressable onPress={() => router.push("/auth")} accessibilityRole="button" style={styles.signIn}><Text style={[styles.signInText, { color: palette.primary }]}>I already have an account</Text></Pressable><Pressable onPress={() => router.push("/legal")} accessibilityRole="link" style={styles.legal}><Text style={[styles.legalText, { color: palette.secondary }]}>By continuing, you agree to our Terms and Privacy Policy.</Text></Pressable></View>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" }, loading: { flex: 1, alignItems: "center", justifyContent: "center" }, hero: { marginTop: "24%" }, mark: { width: 94, height: 94, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 31 }, kicker: { fontSize: 12, letterSpacing: 2, fontWeight: "800", marginBottom: 13 }, title: { fontSize: 38, lineHeight: 45, letterSpacing: -1.2, fontWeight: "800", maxWidth: 320 }, detail: { fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 310 }, footer: { paddingBottom: 18 }, continue: { minHeight: 54, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, continueText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" }, signIn: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 5 }, signInText: { fontSize: 14, fontWeight: "800" }, legal: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 }, legalText: { fontSize: 12, lineHeight: 18, textAlign: "center" }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
