import { useMemo, useState } from "react"
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { t } from "./theme"

export type Option = { value: string; label: string; sub?: string }

/** Bảng chọn trượt từ dưới lên, có ô tìm khi danh sách dài. */
export function PickerSheet({ open, title, options, value, onPick, onClose }: { open: boolean; title: string; options: Option[]; value: string; onPick: (v: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const [q, setQ] = useState("")
  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return k ? options.filter((o) => o.label.toLowerCase().includes(k) || o.sub?.toLowerCase().includes(k)) : options
  }, [options, q])
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={s.grab} />
        <View style={s.head}>
          <Text style={s.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}><Ionicons name="close" size={22} color={t.sub} /></Pressable>
        </View>
        {options.length > 8 ? (
          <View style={s.search}><Ionicons name="search" size={16} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 10, color: t.text }} placeholder="Tìm…" placeholderTextColor={t.sub} value={q} onChangeText={setQ} /></View>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(o) => o.value || "_all"}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => { onPick(item.value); onClose(); setQ("") }} style={({ pressed }) => [s.row, pressed && { backgroundColor: t.bg }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: item.value === value ? "800" : "500" }}>{item.label}</Text>
                {item.sub ? <Text style={{ color: t.sub, fontSize: 12 }}>{item.sub}</Text> : null}
              </View>
              {item.value === value ? <Ionicons name="checkmark" size={20} color={t.navy} /> : null}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  )
}

/** Nút lọc dạng viên thuốc: nhãn + giá trị đang chọn. */
export function FilterButton({ label, value, active, onPress }: { label: string; value?: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.fbtn, active && { backgroundColor: t.navySoft, borderColor: t.navy }]}>
      <Text style={{ color: active ? t.navy : t.text, fontWeight: "700", fontSize: 13 }} numberOfLines={1}>{active && value ? value : label}</Text>
      <Ionicons name="chevron-down" size={14} color={active ? t.navy : t.sub} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,27,61,0.35)" },
  sheet: { maxHeight: "75%", backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16 },
  grab: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, marginTop: 8 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: "800", color: t.text },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.bg, borderRadius: 12, paddingHorizontal: 12, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
  fbtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: t.line, maxWidth: 180 },
})
