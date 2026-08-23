import "../global.css";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LumaProvider, usePalette } from "@/lib/luma/context";

function RootNavigator() {
  const palette = usePalette();
  return <><StatusBar style={palette.background === "#0F1020" ? "light" : "dark"} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background }, animation: "fade" }} /></>;
}

function NotificationObserver() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = (notification: Notifications.Notification) => {
      const targetPath = notification.request.content.data?.targetPath;
      if (typeof targetPath === "string" && targetPath.startsWith("/")) router.push(targetPath as never);
    };
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) open(response.notification); });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => open(response.notification));
    return () => subscription.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  return <SafeAreaProvider><LumaProvider><NotificationObserver /><RootNavigator /></LumaProvider></SafeAreaProvider>;
}
