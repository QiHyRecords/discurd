import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLuma, usePalette } from "@/lib/luma/context";

export default function AuthScreen() {
  const palette = usePalette();
  const { signIn, signUp, resetPassword } = useLuma();
  const [mode, setMode] = useState<"create" | "sign-in">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.includes("@") || password.length < 8) { Alert.alert("Check your details", "Enter a valid email and a password with at least eight characters."); return; }
    if (mode === "create" && (!name.trim() || !accepted || !ageConfirmed)) { Alert.alert("Review your account choices", "Enter a display name, accept the policies, and confirm the age requirement."); return; }
    try {
      setSubmitting(true);
      if (mode === "create") {
        const { needsEmailConfirmation } = await signUp({ email: email.trim(), password, displayName: name.trim(), acceptedPolicies: accepted, ageConfirmed });
        if (needsEmailConfirmation) Alert.alert("Confirm your email", "Check your inbox, confirm your email address, then return here to sign in."); else router.replace("/(tabs)");
      } else {
        await signIn(email.trim(), password);
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("Account action failed", error instanceof Error ? error.message : "Please try again.");
    } finally { setSubmitting(false); }
  };
  const recover = async () => {
    if (!email.includes("@")) { Alert.alert("Enter your email", "Enter the account email first, then try password recovery."); return; }
    try { await resetPassword(email.trim()); Alert.alert("Recovery email sent", "If this account exists, Supabase has sent a password reset email."); }
    catch (error) { Alert.alert("Could not send recovery email", error instanceof Error ? error.message : "Please try again."); }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><View style={[styles.screen, { backgroundColor: palette.background }]}><Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button"><MaterialIcons name="arrow-back" size={22} color={palette.text} /></Pressable><View style={styles.hero}><Text style={[styles.kicker, { color: palette.primary }]}>DISCURD ACCOUNT</Text><Text style={[styles.title, { color: palette.text }]}>{mode === "create" ? "Begin with a clear welcome." : "Welcome back."}</Text><Text style={[styles.copy, { color: palette.secondary }]}>{mode === "create" ? "Create a real Supabase account to join your communities on every device." : "Sign in to load your messages, spaces, and account settings."}</Text></View><View style={styles.form}>{mode === "create" ? <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={palette.tertiary} style={[styles.field, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]} /> : null}<TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={palette.tertiary} autoCapitalize="none" keyboardType="email-address" style={[styles.field, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]} /><TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={palette.tertiary} secureTextEntry style={[styles.field, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]} />{mode === "create" ? <><View style={styles.consent}><Switch value={accepted} onValueChange={setAccepted} trackColor={{ false: palette.border, true: palette.primary }} /><Text style={[styles.consentText, { color: palette.secondary }]}>I accept the Terms of Service, Privacy Policy, and Community Policy.</Text></View><View style={styles.consent}><Switch value={ageConfirmed} onValueChange={setAgeConfirmed} trackColor={{ false: palette.border, true: palette.primary }} /><Text style={[styles.consentText, { color: palette.secondary }]}>I meet the minimum age requirement in my region.</Text></View></> : <Pressable onPress={() => void recover()}><Text style={[styles.recover, { color: palette.primary }]}>Forgot password?</Text></Pressable>}<Pressable onPress={() => void submit()} disabled={submitting} style={({ pressed }) => [styles.primary, { backgroundColor: submitting ? palette.tertiary : palette.primary }, pressed && styles.pressed]}><Text style={styles.primaryText}>{submitting ? "Please wait…" : mode === "create" ? "Create account" : "Sign in"}</Text><MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" /></Pressable><Pressable onPress={() => setMode((current) => current === "create" ? "sign-in" : "create")} disabled={submitting}><Text style={[styles.switchText, { color: palette.primary }]}>{mode === "create" ? "Already a member? Sign in" : "New here? Create an account"}</Text></Pressable></View></View></ScreenContainer>;
}

const styles = StyleSheet.create({ screen: { flex: 1, paddingHorizontal: 24 }, back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 }, hero: { marginTop: 28 }, kicker: { fontSize: 11, letterSpacing: 1.5, fontWeight: "800" }, title: { fontSize: 32, lineHeight: 39, letterSpacing: -0.7, fontWeight: "800", marginTop: 10 }, copy: { fontSize: 15, lineHeight: 22, marginTop: 10 }, form: { marginTop: 30, gap: 11 }, field: { minHeight: 50, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 15, fontSize: 15 }, consent: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 3 }, consentText: { flex: 1, fontSize: 13, lineHeight: 18 }, recover: { textAlign: "right", marginBottom: 2, fontWeight: "700", fontSize: 13 }, primary: { minHeight: 52, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 7 }, primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 }, switchText: { textAlign: "center", fontWeight: "700", fontSize: 14, paddingVertical: 13 }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] } });
