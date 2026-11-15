import { Pressable, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Glass, tap } from "./chrome"
import { prefs, setPref } from "./prefs"
import { t } from "./theme"
import { Text } from "./text"

// Hai nút đổi nhanh đặt ngay trên đầu màn (owner, 2026-11-15: "sao k đặt bên ngoài cho dễ sử dụng"):
// ngôn ngữ VI ⇄ EN và sáng ⇄ tối. Áp dụng ngay, không nạp lại app. Trong Cài đặt vẫn có thêm lựa chọn "Theo máy".
export function QuickPrefs() {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Pressable onPress={() => { tap(); setPref("lang", prefs.lang === "en" ? "vi" : "en") }} hitSlop={6} accessibilityLabel="Language"
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }]}>
        <Glass interactive style={s.round}><Text style={{ color: t.navy, fontWeight: "800", fontSize: 13 }}>{prefs.lang === "en" ? "EN" : "VI"}</Text></Glass>
      </Pressable>
      <Pressable onPress={() => { tap(); setPref("theme", t.dark ? "light" : "dark") }} hitSlop={6} accessibilityLabel="Theme"
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }]}>
        <Glass interactive style={s.round}><Ionicons name={t.dark ? "sunny" : "moon"} size={18} color={t.navy} /></Glass>
      </Pressable>
    </View>
  )
}
const s = StyleSheet.create({ round: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" } })
