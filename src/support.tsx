import { useEffect, useState } from "react"
import { Linking, Modal, StyleSheet, View } from "react-native"
import { Pressable } from "./press"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tap } from "./chrome"
import { ZALO_OA, ZALO_SUPPORT } from "./links"
import { Text } from "./text"
import { t, sheet } from "./theme"

// Bảng "Hỗ trợ" (owner, 2026-11-15): bấm nút hỗ trợ ở đâu cũng mở bảng này với hai lựa chọn: Zalo OA và Nhóm hỗ trợ.
const host: { open: () => void } = { open: () => {} }
export const openSupport = () => { tap(); host.open() }

export function SupportHost() {
  const insets = useSafeAreaInsets()
  const [on, setOn] = useState(false)
  useEffect(() => { host.open = () => setOn(true) }, [])
  const go = (url: string) => { setOn(false); void Linking.openURL(url) }
  return (
    <Modal visible={on} transparent animationType="slide" onRequestClose={() => setOn(false)}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(15,27,61,0.35)" }} onPress={() => setOn(false)} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.grab} />
        <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Hỗ trợ</Text>
        <Text style={{ color: t.sub }}>Chọn kênh bạn muốn liên hệ.</Text>
        {([
          ["chatbubble-ellipses", "Zalo OA 3RDHub Vietnam", "Nhắn trực tiếp với bộ phận hỗ trợ", ZALO_OA],
          ["people", "Nhóm Zalo hỗ trợ", "Hỏi đáp cùng cộng đồng Publisher", ZALO_SUPPORT],
        ] as const).map(([icon, title, sub, url]) => (
          <Pressable key={url} onPress={() => { tap(); go(url) }} style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}>
            <View style={s.icon}><Ionicons name={icon} size={22} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: t.text, fontSize: 15 }}>{title}</Text>
              <Text style={{ color: t.sub, fontSize: 13 }}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.sub} />
          </Pressable>
        ))}
      </View>
    </Modal>
  )
}
const s = sheet(() => StyleSheet.create({
  sheet: { backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  grab: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: t.line },
  row: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: t.bg, borderRadius: 16, padding: 14 },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#0068FF", alignItems: "center", justifyContent: "center" },
}))
