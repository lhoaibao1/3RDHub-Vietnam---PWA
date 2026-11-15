import { Alert, Appearance, Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import * as Updates from "expo-updates"

// Hai lựa chọn của người dùng: ngôn ngữ (vi / en) và giao diện (light / dark / system). Đọc ĐỒNG BỘ ngay lúc app khởi
// động, vì màu trong StyleSheet.create và bảng dịch được tính một lần khi nạp module; đổi lựa chọn = lưu rồi nạp lại app.
export type Lang = "vi" | "en"
export type ThemeMode = "light" | "dark" | "system"

function read(key: string): string | null {
  try { return Platform.OS === "web" ? (globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItem(key) } catch { return null }
}
function write(key: string, value: string) {
  try { if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value); else SecureStore.setItem(key, value) } catch {}
}

const rawTheme = read("pref_theme")
export const prefs: { lang: Lang; theme: ThemeMode } = {
  lang: read("pref_lang") === "en" ? "en" : "vi",
  theme: rawTheme === "dark" || rawTheme === "system" ? rawTheme : "light",
}
export const isDark = prefs.theme === "dark" || (prefs.theme === "system" && Appearance.getColorScheme() === "dark")

/** Lưu lựa chọn rồi nạp lại app để áp dụng. */
export async function setPref(key: "lang" | "theme", value: string) {
  write(`pref_${key}`, value)
  if (Platform.OS === "web") { globalThis.location?.reload(); return }
  try { await Updates.reloadAsync() } catch {
    Alert.alert(prefs.lang === "en" ? "Saved" : "Đã lưu", prefs.lang === "en" ? "Close the app completely and open it again to apply." : "Đóng hẳn app rồi mở lại để áp dụng.")
  }
}
