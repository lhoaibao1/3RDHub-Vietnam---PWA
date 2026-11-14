import type { ReactNode } from "react"
import { Alert, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import * as Clipboard from "expo-clipboard"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { tap } from "./chrome"
import { Text } from "./text"
import { shadow, t } from "./theme"

export const copyText = (v: string, what = "Đã sao chép") => { tap(); void Clipboard.setStringAsync(v); Alert.alert(what, v) }

/** Khối đầu trang nền xanh có vòng trang trí, dùng cho màn chi tiết (đơn, thành viên, ví, hồ sơ). */
export function Hero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={[t.navy, t.navy2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, style]}>
      <View style={[s.ring, { width: 200, height: 200, top: -80, right: -60 }]} />
      <View style={[s.ring, { width: 120, height: 120, bottom: -50, left: -30, borderColor: "rgba(255,106,43,0.35)" }]} />
      {children}
    </LinearGradient>
  )
}
/** Ô số nhỏ nền kính đặt trong Hero. */
export function HeroStat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <View style={s.hstat}>
      <Text style={{ color: "#C9D6F5", fontSize: 11 }}>{k}</Text>
      <Text style={{ color: accent ? "#FFB08A" : "#fff", fontWeight: "800", fontSize: 15 }} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
    </View>
  )
}
export function Chip2({ label, color = "#fff", bg = "rgba(255,255,255,0.18)" }: { label: string; color?: string; bg?: string }) {
  return <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color, fontSize: 12, fontWeight: "700" }}>{label}</Text></View>
}

/** Nhóm thông tin: tiêu đề nhỏ + thẻ trắng chứa các dòng. */
export function InfoGroup({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      {title ? <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 6 }}><Text style={s.gtitle}>{title}</Text>{right}</View> : null}
      <View style={s.group}>{children}</View>
    </View>
  )
}
/** Một dòng thông tin: icon nền màu, nhãn, giá trị; chạm để mở / sao chép. */
export function InfoRow({ icon, color = t.navy, label, value, sub, onPress, copy, first, valueColor }: { icon: keyof typeof Ionicons.glyphMap; color?: string; label: string; value?: string; sub?: string; onPress?: () => void; copy?: boolean; first?: boolean; valueColor?: string }) {
  const act = copy && value ? () => copyText(value) : onPress ? () => { tap(); onPress() } : undefined
  return (
    <Pressable onPress={act} disabled={!act} style={({ pressed }) => [s.row, !first && s.line, pressed && { backgroundColor: t.bg }]}>
      <View style={[s.icon, { backgroundColor: color + "1A" }]}><Ionicons name={icon} size={17} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.sub, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: valueColor ?? t.text, fontWeight: "600", fontSize: 15, marginTop: 1 }} numberOfLines={2}>{value || "—"}</Text>
        {sub ? <Text style={{ color: t.sub, fontSize: 12, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {copy && value ? <Ionicons name="copy-outline" size={16} color={t.sub} /> : onPress ? <Ionicons name="chevron-forward" size={16} color={t.sub} /> : null}
    </Pressable>
  )
}
/** Thẻ 2–3 số ngang có vạch ngăn. */
export function StatBar({ items, style }: { items: { k: string; v: string; color?: string; onPress?: () => void }[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.stats, style]}>
      {items.map((it, i) => (
        <Pressable key={it.k} onPress={it.onPress} disabled={!it.onPress} style={[s.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.line }]}>
          <Text style={{ color: t.sub, fontSize: 11 }}>{it.k}</Text>
          <Text style={{ color: it.color ?? t.text, fontWeight: "800", fontSize: 16 }} numberOfLines={1} adjustsFontSizeToFit>{it.v}</Text>
        </Pressable>
      ))}
    </View>
  )
}
/** Dòng thời gian (lịch sử xử lý). */
export function Timeline({ steps }: { steps: { title: string; sub?: string; note?: string; color?: string }[] }) {
  return (
    <View style={[s.group, { padding: 14 }]}>
      {steps.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: x.color ?? t.navy2, borderWidth: i === 0 ? 3 : 0, borderColor: (x.color ?? t.navy2) + "55" }} />
            {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: t.line, marginTop: 2 }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 16 : 0, gap: 2 }}>
            <Text style={{ fontWeight: "700", color: t.text }}>{x.title}</Text>
            {x.note ? <Text style={{ color: t.text, fontSize: 13 }}>{x.note}</Text> : null}
            {x.sub ? <Text style={{ color: t.sub, fontSize: 12 }}>{x.sub}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  )
}
const s = StyleSheet.create({
  hero: { borderRadius: 22, padding: 18, overflow: "hidden", gap: 10 },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.12)" },
  hstat: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 10, gap: 2 },
  gtitle: { color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  group: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 18, paddingVertical: 12, ...shadow },
  stat: { flex: 1, alignItems: "center", gap: 3, paddingHorizontal: 6 },
})
