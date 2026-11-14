import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import type { ReactNode } from "react"

export const c = { bg: "#f5f6f8", card: "#fff", text: "#111827", sub: "#6b7280", line: "#e5e7eb", brand: "#e11d48", ok: "#16a34a", warn: "#d97706", bad: "#dc2626" }
export const vnd = (n?: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(n || 0))}đ`
export const num = (n?: number) => new Intl.NumberFormat("vi-VN").format(n || 0)
export const when = (iso?: string) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : ""
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>
}
export function Button({ label, onPress, busy, kind = "primary", disabled }: { label: string; onPress: () => void; busy?: boolean; kind?: "primary" | "ghost"; disabled?: boolean }) {
  const off = busy || disabled
  return (
    <Pressable onPress={onPress} disabled={off} style={[s.btn, kind === "ghost" && s.ghost, off && { opacity: 0.5 }]}>
      {busy ? <ActivityIndicator color={kind === "ghost" ? c.brand : "#fff"} /> : <Text style={[s.btnText, kind === "ghost" && { color: c.brand }]}>{label}</Text>}
    </Pressable>
  )
}
export function Center({ children }: { children: ReactNode }) { return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>{children}</View> }
export function Loading() { return <Center><ActivityIndicator color={c.brand} /></Center> }
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Center>
      <Text style={{ color: c.bad, textAlign: "center", marginBottom: 12 }}>{error instanceof Error ? error.message : "Có lỗi xảy ra"}</Text>
      {retry ? <Button label="Thử lại" onPress={retry} kind="ghost" /> : null}
    </Center>
  )
}
export function Empty({ text }: { text: string }) { return <Center><Text style={{ color: c.sub, textAlign: "center" }}>{text}</Text></Center> }

const s = StyleSheet.create({
  card: { backgroundColor: c.card, borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  btn: { backgroundColor: c.brand, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", minHeight: 48 },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: c.brand },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
