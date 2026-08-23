import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export async function getNativePushRegistration(): Promise<{ token: string; platform: "android" | "ios" }> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") throw new Error("Push registration is available in the installed Android or iOS build, not in the web preview.");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", { name: "Messages", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 220, 180, 220], lightColor: "#5167E8" });
  }
  const existing = await Notifications.getPermissionsAsync();
  const finalStatus = existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") throw new Error("Notification permission was not granted.");
  const deviceToken = await Notifications.getDevicePushTokenAsync();
  if (!deviceToken.data || typeof deviceToken.data !== "string") throw new Error("The device did not return a native push token.");
  return { token: deviceToken.data, platform: Platform.OS };
}
