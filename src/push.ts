import { Platform } from "react-native"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { api, PROJECT_ID } from "./api"

// Thông báo hiện cả khi đang mở app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
})

let current: string | null = null
export type PushState = "on" | "denied" | "unsupported" | "error"

/** Xin quyền + lấy Expo push token + gửi lên server. Không bao giờ ném lỗi: app vẫn chạy nếu push không dùng được. */
export async function registerPush(ask = true): Promise<PushState> {
  try {
    if (!Device.isDevice) return "unsupported"
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", { name: "Thông báo", importance: Notifications.AndroidImportance.HIGH, lightColor: "#0B2A6F" })
    }
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== "granted" && ask) status = (await Notifications.requestPermissionsAsync()).status
    if (status !== "granted") return "denied"
    const { data } = await Notifications.getExpoPushTokenAsync(PROJECT_ID ? { projectId: PROJECT_ID } : undefined)
    current = data
    await api("/api/v1/tenant/push/expo", { method: "POST", body: { token: data, platform: Platform.OS } })
    return "on"
  } catch {
    return "error"
  }
}

export async function unregisterPush() {
  if (!current) return
  try { await api("/api/v1/tenant/push/expo/unsubscribe", { method: "POST", body: { token: current } }) } catch {}
  current = null
}

export const setBadge = (n: number) => { void Notifications.setBadgeCountAsync(n).catch(() => {}) }
