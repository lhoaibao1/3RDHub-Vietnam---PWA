import { useEffect, useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tap } from "./chrome"
import { customRange, dmy, isCustom, RANGES, ymdOf } from "./dates"
import { Text } from "./text"
import { t, sheet } from "./theme"
import { Button } from "./ui"

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

/** Bảng chọn thời gian: các khoảng có sẵn (có Hôm qua) và lịch để chọn từ ngày – đến ngày tuỳ ý. */
export function RangeSheet({ open, value, onPick, onClose }: { open: boolean; value: string; onPick: (v: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const today = ymdOf(new Date())
  const [cal, setCal] = useState(false)
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [from, setFrom] = useState(""), [to, setTo] = useState("")
  useEffect(() => {
    if (!open) return
    if (isCustom(value)) { const [, a, b] = value.split(":"); setFrom(a ?? ""); setTo(b ?? ""); setCal(true) } else { setFrom(""); setTo(""); setCal(false) }
  }, [open, value])
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const lead = (first.getDay() + 6) % 7 // tuần bắt đầu từ thứ Hai
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => ymdOf(new Date(month.getFullYear(), month.getMonth(), i + 1)))]
  }, [month])
  const tapDay = (d: string) => {
    tap()
    if (!from || (from && to)) { setFrom(d); setTo("") } else if (d < from) { setTo(from); setFrom(d) } else setTo(d)
  }
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const apply = () => { onPick(customRange(from, to || from)); onClose() }
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(15,27,61,0.35)" }} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.grab} />
        <View style={s.head}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>Thời gian</Text>
          <Pressable onPress={onClose} hitSlop={12}><Ionicons name="close" size={22} color={t.sub} /></Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {RANGES.map((r) => (
              <Pressable key={r.value} onPress={() => { tap(); onPick(r.value); onClose() }} style={[s.opt, value === r.value && s.optOn]}>
                <Text style={{ color: value === r.value ? "#fff" : t.text, fontWeight: "700", fontSize: 13 }}>{r.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => { tap(); setCal((v) => !v) }} style={[s.opt, (cal || isCustom(value)) && { borderColor: t.navy, borderWidth: 1.5 }]}>
              <Ionicons name="calendar-outline" size={14} color={t.navy} /><Text style={{ color: t.navy, fontWeight: "700", fontSize: 13 }}>Chọn ngày</Text>
            </Pressable>
          </View>
          {cal ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable onPress={() => move(-1)} hitSlop={10} style={s.nav}><Ionicons name="chevron-back" size={18} color={t.navy} /></Pressable>
                <Text style={{ fontWeight: "800", color: t.text, fontSize: 15 }}>Tháng {month.getMonth() + 1}/{month.getFullYear()}</Text>
                <Pressable onPress={() => move(1)} hitSlop={10} style={s.nav}><Ionicons name="chevron-forward" size={18} color={t.navy} /></Pressable>
              </View>
              <View style={{ flexDirection: "row" }}>{WD.map((w) => <Text key={w} style={s.wd}>{w}</Text>)}</View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {cells.map((d, i) => {
                  if (!d) return <View key={`e${i}`} style={s.cell} />
                  const end = to || from
                  const edge = d === from || d === end, inside = !!from && d > from && d < end, future = d > today
                  return (
                    <Pressable key={d} disabled={future} onPress={() => tapDay(d)} style={[s.cell, inside && { backgroundColor: t.navySoft }]}>
                      <View style={[s.day, edge && { backgroundColor: t.solid }]}>
                        <Text style={{ color: edge ? "#fff" : future ? t.line : t.text, fontWeight: edge || d === today ? "800" : "500" }}>{Number(d.slice(8))}</Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
              <Text style={{ color: t.sub, fontSize: 13, textAlign: "center" }}>{from ? `${dmy(from)} – ${dmy(to || from)}` : "Chạm ngày bắt đầu, rồi chạm ngày kết thúc"}</Text>
              <Button label="Áp dụng" onPress={apply} disabled={!from} />
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}
const s = sheet(() => StyleSheet.create({
  sheet: { maxHeight: "85%", backgroundColor: t.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16 },
  grab: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, marginTop: 8 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  opt: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.line },
  optOn: { backgroundColor: t.solid, borderColor: t.solid },
  nav: { width: 34, height: 34, borderRadius: 17, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" },
  wd: { width: `${100 / 7}%`, textAlign: "center", color: t.sub, fontSize: 12, fontWeight: "700" },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: "center", justifyContent: "center" },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
}))
