import { Appearance, Platform } from "react-native"
import * as SecureStore from "expo-secure-store"

// Hai lựa chọn của người dùng: ngôn ngữ (vi / en) và giao diện (light / dark / system). Đổi là áp dụng ngay, không nạp
// lại app (owner, 2026-11-15): src/theme.ts đổi bảng màu tại chỗ, root layout dựng lại toàn bộ cây giao diện.
export type Lang = "vi" | "en"
export type ThemeMode = "light" | "dark" | "system"

function read(key: string): string | null {
  try { return Platform.OS === "web" ? (globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItem(key) } catch { return null }
}
function write(key: string, value: string) {
  try { if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value); else SecureStore.setItem(key, value) } catch {}
}

const rawTheme = read("pref_theme")
export const prefs: { lang: Lang; theme: ThemeMode; version: number } = {
  lang: read("pref_lang") === "en" ? "en" : "vi",
  theme: rawTheme === "dark" || rawTheme === "system" ? rawTheme : "light",
  version: 0,
}
export const darkNow = () => prefs.theme === "dark" || (prefs.theme === "system" && Appearance.getColorScheme() === "dark")

const subs = new Set<() => void>()
/** Theo dõi thay đổi ngôn ngữ / giao diện (root layout dùng để dựng lại giao diện). */
export function onPrefs(fn: () => void) { subs.add(fn); return () => { subs.delete(fn) } }
export function bumpPrefs() { prefs.version++; subs.forEach((fn) => fn()) }

/** Lưu lựa chọn và áp dụng ngay. */
export function setPref(key: "lang" | "theme", value: string) {
  write(`pref_${key}`, value)
  if (key === "lang") prefs.lang = value === "en" ? "en" : "vi"
  else prefs.theme = value === "dark" || value === "system" ? value : "light"
  bumpPrefs()
}
