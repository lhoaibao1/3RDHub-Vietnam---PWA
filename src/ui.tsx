import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import type { ReactNode } from "react"
import { img } from "./api"
import { initials } from "./format"
import { shadow, t } from "./theme"

export { t }
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>
}
export function Button({ label, onPress, busy, kind = "primary", disabled, icon }: { label: string; onPress: () => void; busy?: boolean; kind?: "primary" | "ghost" | "gold"; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const off = busy || disabled
  const fg = kind === "ghost" ? t.navy : "#fff"
  return (
    <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [s.btn, kind === "ghost" && s.ghost, kind === "gold" && { backgroundColor: t.gold }, off && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
      {busy ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[s.btnText, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}
export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={{ color: on ? "#fff" : t.text, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  )
}
export function Pill({ label, tone = "navy" }: { label: string; tone?: "navy" | "gold" | "ok" | "warn" | "bad" | "gray" }) {
  const m = { navy: [t.navySoft, t.navy], gold: [t.goldSoft, t.gold], ok: [t.okSoft, t.ok], warn: [t.warnSoft, t.warn], bad: [t.badSoft, t.bad], gray: ["#EEF0F5", t.sub] }[tone]
  return <View style={{ backgroundColor: m[0], borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" }}><Text style={{ color: m[1], fontSize: 11, fontWeight: "700" }}>{label}</Text></View>
}
export function Avatar({ url, name, size = 44 }: { url?: string; name?: string; size?: number }) {
  const src = img(url)
  return src ? (
    <Image source={src} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.line }} contentFit="cover" transition={150} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: t.navy, fontWeight: "800", fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  )
}
/** Ảnh chiến dịch; không có ảnh thì hiện khung chữ cái đầu. */
export function Art({ url, name, style }: { url?: string; name?: string; style?: StyleProp<ViewStyle> }) {
  const src = img(url)
  return src ? <Image source={src} style={style as never} contentFit="cover" transition={200} /> : (
    <View style={[{ backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" }, style]}>
      <Text style={{ color: t.navy, fontWeight: "800", fontSize: 22 }}>{initials(name)}</Text>
    </View>
  )
}
export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
      <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={{ color: t.navy2, fontWeight: "700", fontSize: 13 }}>{action}</Text></Pressable> : null}
    </View>
  )
}
export function Center({ children }: { children: ReactNode }) { return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 }}>{children}</View> }
export function Loading() { return <Center><ActivityIndicator color={t.navy} /></Center> }
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Center>
      <Ionicons name="cloud-offline-outline" size={36} color={t.sub} />
      <Text style={{ color: t.bad, textAlign: "center" }}>{error instanceof Error ? error.message : "Có lỗi xảy ra"}</Text>
      {retry ? <Button label="Thử lại" onPress={retry} kind="ghost" /> : null}
    </Center>
  )
}
export function Empty({ text, icon = "file-tray-outline" }: { text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Center><Ionicons name={icon} size={40} color={t.line} /><Text style={{ color: t.sub, textAlign: "center" }}>{text}</Text></Center>
}
export function Row({ icon, label, value, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.rowItem, pressed && { backgroundColor: t.bg }]}>
      <View style={[s.rowIcon, danger && { backgroundColor: t.badSoft }]}><Ionicons name={icon} size={18} color={danger ? t.bad : t.navy} /></View>
      <Text style={{ flex: 1, fontWeight: "600", color: danger ? t.bad : t.text }}>{label}</Text>
      {value ? <Text style={{ color: t.sub, maxWidth: 160 }} numberOfLines={1}>{value}</Text> : null}
      {onPress && !danger ? <Ionicons name="chevron-forward" size={16} color={t.sub} /> : null}
    </Pressable>
  )
}
const s = StyleSheet.create({
  card: { backgroundColor: t.card, borderRadius: t.radius, padding: 14, ...shadow },
  btn: { backgroundColor: t.navy, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", minHeight: 48 },
  ghost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: t.navy },
  btnText: { fontWeight: "800", fontSize: 15 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: t.line },
  chipOn: { backgroundColor: t.navy, borderColor: t.navy },
  rowItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" },
})
