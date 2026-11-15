import { useEffect, useState } from "react"
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native"
import { Text, TextInput } from "./text"
import { shadow, t } from "./theme"

// Hộp nhập chữ chạy được cả iOS lẫn Android (Alert.prompt chỉ có trên iOS). iOS dùng hộp gốc của hệ thống,
// Android / web dùng hộp tự vẽ. Gọi: const v = await prompt({ title, message, secure }) → chuỗi hoặc null nếu hủy.
type Req = { title: string; message?: string; placeholder?: string; secure?: boolean; ok?: string; resolve: (v: string | null) => void }
// Giữ trong object, không dùng biến `let` rời (xem ghi chú ở src/webalert.tsx: trình đóng gói có thể xoá biến rời).
const host: { show: (r: Req) => void } = { show: () => {} }

export function prompt(o: Omit<Req, "resolve">): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      Alert.prompt(o.title, o.message, [{ text: "Hủy", style: "cancel", onPress: () => resolve(null) }, { text: o.ok ?? "Xong", onPress: (v?: string) => resolve(v ?? "") }], o.secure ? "secure-text" : "plain-text")
      return
    }
    host.show({ ...o, resolve })
  })
}

/** Đặt một lần ở gốc app. */
export function PromptHost() {
  const [req, setReq] = useState<Req | null>(null)
  const [v, setV] = useState("")
  useEffect(() => { host.show = (r) => { setV(""); setReq(r) } }, [])
  if (!req) return null
  const done = (val: string | null) => { req.resolve(val); setReq(null) }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => done(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.wrap}>
        <View style={s.box}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>{req.title}</Text>
          {req.message ? <Text style={{ color: t.sub, lineHeight: 20 }}>{req.message}</Text> : null}
          <TextInput autoFocus value={v} onChangeText={setV} secureTextEntry={req.secure} placeholder={req.placeholder} placeholderTextColor={t.sub} style={s.input} onSubmitEditing={() => done(v)} />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
            <Pressable onPress={() => done(null)} style={s.btn}><Text style={{ color: t.sub, fontWeight: "700" }}>Hủy</Text></Pressable>
            <Pressable onPress={() => done(v)} style={[s.btn, { backgroundColor: t.solid }]}><Text style={{ color: "#fff", fontWeight: "700" }}>{req.ok ?? "Xong"}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "rgba(15,27,61,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { alignSelf: "stretch", backgroundColor: t.card, borderRadius: 20, padding: 20, gap: 12, ...shadow },
  input: { borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 12, fontSize: 16, color: t.text, backgroundColor: t.bg },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
})
