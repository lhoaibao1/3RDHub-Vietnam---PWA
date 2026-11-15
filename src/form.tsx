import { useState } from "react"
import { Pressable, StyleSheet, View, type TextInputProps } from "react-native"
import { Text, TextInput } from "./text"
import { Ionicons } from "@expo/vector-icons"
import { t, sheet } from "./theme"

/** Ô nhập có icon, nhãn và dòng lỗi; ô mật khẩu có nút hiện/ẩn. */
export function Field({ icon, label, error, secure, ...rest }: TextInputProps & { icon: keyof typeof Ionicons.glyphMap; label?: string; error?: string; secure?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.field, error ? { borderColor: t.bad } : null]}>
        <Ionicons name={icon} size={18} color={t.sub} />
        <TextInput placeholderTextColor={t.sub} style={s.input} secureTextEntry={secure && !show} {...rest} />
        {secure ? <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={t.sub} /></Pressable> : null}
      </View>
      {error ? <Text style={{ color: t.bad, fontSize: 12 }}>{error}</Text> : null}
    </View>
  )
}
export function Notice({ tone = "bad", text }: { tone?: "bad" | "ok" | "warn"; text: string }) {
  const c = { bad: [t.badSoft, t.bad, "alert-circle"], ok: [t.okSoft, t.ok, "checkmark-circle"], warn: [t.warnSoft, t.warn, "information-circle"] }[tone] as [string, string, keyof typeof Ionicons.glyphMap]
  return <View style={[s.notice, { backgroundColor: c[0] }]}><Ionicons name={c[2]} size={18} color={c[1]} /><Text style={{ color: c[1], flex: 1, lineHeight: 19 }}>{text}</Text></View>
}
const s = sheet(() => StyleSheet.create({
  label: { color: t.text, fontWeight: "700", fontSize: 13 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.card, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: t.line },
  input: { flex: 1, minWidth: 0, paddingVertical: 14, fontSize: 16, color: t.text },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, padding: 12 },
}))
