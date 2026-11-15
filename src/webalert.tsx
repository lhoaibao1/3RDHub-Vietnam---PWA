import { useEffect, useState } from "react"
import { Alert, Modal, Platform, StyleSheet, View, type AlertButton } from "react-native"
import { Pressable } from "./press"
import { Text } from "./text"
import { shadow, t, sheet } from "./theme"

// Trên web, Alert.alert của React Native không làm gì cả, nên mọi hộp xác nhận (rút tiền, đăng xuất, duyệt định danh…)
// sẽ im lặng. Ở bản web ta thay Alert.alert bằng hộp tự vẽ dưới đây; trên điện thoại vẫn là hộp gốc của hệ thống.
type Req = { title: string; message?: string; buttons: AlertButton[] }
// Giữ hàm hiện hộp trong một object (không dùng biến `let` rời): khi đóng gói cho iOS / Android, nhánh
// `Platform.OS === "web"` bị cắt bỏ và trình đóng gói xoá luôn biến rời chỉ được đọc trong nhánh đó, trong khi
// component vẫn gán vào nó → "ReferenceError: Property 'show' doesn't exist", app không mở được (2026-11-15).
const host: { show: (r: Req) => void } = { show: () => {} }

if (Platform.OS === "web") {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => host.show({ title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }] })
}

export function WebAlertHost() {
  const [req, setReq] = useState<Req | null>(null)
  useEffect(() => { if (Platform.OS === "web") host.show = setReq }, [])
  if (Platform.OS !== "web" || !req) return null
  const press = (b: AlertButton) => { setReq(null); b.onPress?.() }
  const col = req.buttons.length > 2
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setReq(null)}>
      <View style={s.wrap}>
        <View style={s.box}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: t.text, textAlign: "center" }}>{req.title}</Text>
          {req.message ? <Text style={{ color: t.sub, textAlign: "center", lineHeight: 20 }}>{req.message}</Text> : null}
          <View style={{ flexDirection: col ? "column" : "row", gap: 8, marginTop: 6 }}>
            {req.buttons.map((b, i) => {
              const main = b.style !== "cancel" && (req.buttons.length === 1 || i === req.buttons.length - 1 || b.style === "destructive")
              return (
                <Pressable key={i} onPress={() => press(b)} style={[s.btn, !col && { flex: 1 }, main ? { backgroundColor: b.style === "destructive" ? t.bad : t.navy } : { backgroundColor: t.bg }]}>
                  <Text style={{ color: main ? "#fff" : t.text, fontWeight: "700" }}>{b.text ?? "OK"}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}
const s = sheet(() => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "rgba(15,27,61,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { width: "100%", maxWidth: 380, backgroundColor: t.card, borderRadius: 20, padding: 20, gap: 8, ...shadow },
  btn: { alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
}))
