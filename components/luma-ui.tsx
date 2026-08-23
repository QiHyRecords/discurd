import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { usePalette, type Palette } from "@/lib/luma/context";
import type { ProfileBadge } from "@/lib/luma/types";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function Avatar({ initials, accent, size = 42, presence }: { initials: string; accent: string; size?: number; presence?: "online" | "idle" | "dnd" | "offline" }) {
  const palette = usePalette();
  const dotColor = presence === "online" ? palette.success : presence === "idle" ? "#D6A43A" : presence === "dnd" ? palette.danger : palette.tertiary;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: accent }]} accessibilityLabel={`${initials} avatar`}>
      <Text style={[styles.avatarText, { fontSize: size * 0.31 }]}>{initials}</Text>
      {presence ? <View style={[styles.presence, { backgroundColor: dotColor, borderColor: palette.surface, width: size * 0.28, height: size * 0.28, borderRadius: size / 2 }]} /> : null}
    </View>
  );
}

export function IconButton({ icon, label, onPress, tone = "plain" }: { icon: IconName; label: string; onPress: () => void; tone?: "plain" | "filled" }) {
  const palette = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: tone === "filled" ? palette.primary : palette.primarySoft }, pressed && styles.pressed]}>
    <MaterialIcons name={icon} color={tone === "filled" ? "#FFFFFF" : palette.primary} size={20} />
  </Pressable>;
}

export function Pill({ label, color }: { label: string; color?: string }) {
  const palette = usePalette();
  return <View style={[styles.pill, { backgroundColor: color ?? palette.primarySoft }]}><Text style={[styles.pillText, { color: palette.primary }]}>{label}</Text></View>;
}

const badgeDefinitions: Record<ProfileBadge, { icon: IconName; label: string }> = {
  owner: { icon: "workspace-premium", label: "Owner" },
  admin: { icon: "shield", label: "Admin" },
  developer: { icon: "code", label: "Developer" },
  verified: { icon: "verified", label: "Verified" },
};

export function ProfileBadges({ badges, size = 16 }: { badges: ProfileBadge[]; size?: number }) {
  const palette = usePalette();
  if (!badges.length) return null;
  return <View style={styles.badges} accessibilityLabel={badges.map((badge) => badgeDefinitions[badge].label).join(", ")}>
    {badges.map((badge) => <MaterialIcons key={badge} name={badgeDefinitions[badge].icon} size={size} color={palette.primary} />)}
  </View>;
}

export function SectionLabel({ children, action, onPress }: { children: string; action?: string; onPress?: () => void }) {
  const palette = usePalette();
  return <View style={styles.sectionHeader}><Text style={[styles.sectionLabel, { color: palette.secondary }]}>{children.toUpperCase()}</Text>{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress}><Text style={[styles.sectionAction, { color: palette.primary }]}>{action}</Text></Pressable> : null}</View>;
}

export function MaterialCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, style]}>{children}</View>;
}

export function EmptyState({ icon, title, detail, actionLabel, onAction }: { icon: IconName; title: string; detail: string; actionLabel?: string; onAction?: () => void }) {
  const palette = usePalette();
  return <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}><MaterialIcons name={icon} size={28} color={palette.primary} /></View><Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.emptyDetail, { color: palette.secondary }]}>{detail}</Text>{actionLabel && onAction ? <Pressable onPress={onAction} accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.primary }, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>{actionLabel}</Text></Pressable> : null}</View>;
}

export function nameForInitials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function screenStyles(palette: Palette): {
  screen: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  topRow: ViewStyle;
} {
  return {
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 20, paddingBottom: 112 },
    title: { fontSize: 32, lineHeight: 39, fontWeight: "700", letterSpacing: -0.7, color: palette.text },
    subtitle: { marginTop: 4, fontSize: 15, lineHeight: 21, color: palette.secondary },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  };
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", position: "relative" },
  avatarText: { color: "#FFFFFF", fontWeight: "700" },
  presence: { position: "absolute", right: -1, bottom: -1, borderWidth: 2 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  pill: { minHeight: 24, paddingHorizontal: 9, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pillText: { fontWeight: "700", fontSize: 12 },
  badges: { flexDirection: "row", alignItems: "center", gap: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 },
  sectionLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.85, fontWeight: "700" },
  sectionAction: { fontSize: 14, fontWeight: "700" },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, overflow: "hidden" },
  empty: { alignItems: "center", paddingHorizontal: 30, paddingTop: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: "700", textAlign: "center" },
  emptyDetail: { marginTop: 7, fontSize: 15, lineHeight: 21, textAlign: "center" },
  primaryButton: { marginTop: 22, minHeight: 48, borderRadius: 16, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
