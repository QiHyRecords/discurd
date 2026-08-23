import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "@/lib/luma/context";

const icons = { index: "home-filled", inbox: "forum", spaces: "grid-view", calls: "call", settings: "tune" } as const;

export default function TabLayout() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: palette.primary, tabBarInactiveTintColor: palette.tertiary, tabBarStyle: { height: 57 + bottom, paddingTop: 7, paddingBottom: bottom, backgroundColor: palette.tab, borderTopColor: palette.border, borderTopWidth: 0.6 }, tabBarLabelStyle: { fontWeight: "700", fontSize: 11 }, tabBarIcon: ({ color, focused }) => <MaterialIcons name={icons[route.name as keyof typeof icons]} size={23} color={color} style={{ opacity: focused ? 1 : 0.84 }} /> })}>
    <Tabs.Screen name="index" options={{ title: "Home" }} />
    <Tabs.Screen name="inbox" options={{ title: "Messages" }} />
    <Tabs.Screen name="spaces" options={{ title: "Spaces" }} />
    <Tabs.Screen name="calls" options={{ title: "Calls" }} />
    <Tabs.Screen name="settings" options={{ title: "Settings" }} />
  </Tabs>;
}
