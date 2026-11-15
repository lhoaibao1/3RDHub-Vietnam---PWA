import { useMemo, useState } from "react"
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { LOST_STATUS, lostStatus, useLost } from "../../src/hooks"
import { day, num, vnd } from "../../src/format"
import { Empty, ErrorBox, Loading, t, PullRefresh } from "../../src/ui"
import { Glass, GlassButton, Pager, TopBar, tap, usePager } from "../../src/chrome"
import { Text, TextInput } from "../../src/text"
import { shadow } from "../../src/theme"

export const ymdVN = (s?: string) => (s ? s.split("-").reverse().join("/") : "")

export default function LostOrders() {
  const router = useRouter()
  const q = useLost()
  const [term, setTerm] = useState("")
  const [status, setStatus] = useState("")
  const base = useMemo(() => {
    const k = term.trim().toLowerCase()
    return (q.data ?? []).filter((x) => !k || [x.code, x.order_code, x.campaign_name, x.reporter_name, x.reporter_code].some((v) => (v ?? "").toLowerCase().includes(k)))
  }, [q.data, term])
  const counts = useMemo(() => base.reduce<Record<string, number>>((a, x) => ((a[x.status] = (a[x.status] ?? 0) + 1), a), {}), [base])
  const rows = useMemo(() => base.filter((x) => !status || x.status === status), [base, status])
  const pg = usePager(rows, 20, `${term}|${status}`)
  const add = <GlassButton icon="add" label="Báo đơn thất lạc" onPress={() => router.push("/lost/new")} />

  if (!q.on) return <View style={{ flex: 1 }}><TopBar title="Đơn thất lạc" /><Empty text="Bạn không có quyền xem phiếu báo đơn thất lạc." icon="lock-closed-outline" /></View>
  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Đơn thất lạc" right={add} /><Loading /></View>
  if (q.isError) return <View style={{ flex: 1 }}><TopBar title="Đơn thất lạc" right={add} /><ErrorBox error={q.error} retry={() => q.refetch()} /></View>

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Đơn thất lạc" right={add} />
      <FlatList showsVerticalScrollIndicator={false}
        data={pg.rows}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1, paddingBottom: 40 }}
        refreshControl={<PullRefresh run={() => Promise.all([q.refetch()])} />}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 4 }}>
            <Glass style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder="Tìm mã phiếu, mã đơn, chiến dịch…" placeholderTextColor={t.sub} value={term} onChangeText={setTerm} autoCorrect={false} /></Glass>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Pressable onPress={() => setStatus("")} style={[s.st, !status && { backgroundColor: t.solid, borderColor: t.solid }]}><Text style={[s.stText, !status && { color: "#fff" }]}>Tất cả · {num(base.length)}</Text></Pressable>
              {Object.entries(LOST_STATUS).map(([k, v]) => (
                <Pressable key={k} onPress={() => setStatus(status === k ? "" : k)} style={[s.st, status === k && { backgroundColor: v.color, borderColor: v.color }]}><Text style={[s.stText, status === k && { color: "#fff" }]}>{v.label} · {num(counts[k] ?? 0)}</Text></Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<View style={{ alignItems: "center", gap: 12, paddingTop: 40 }}><Ionicons name="document-text-outline" size={44} color={t.line} /><Text style={{ color: t.sub, textAlign: "center" }}>Chưa có phiếu báo đơn thất lạc nào.{"\n"}Khách đã hoàn tất mà không thấy đơn? Bấm dấu + để báo.</Text></View>}
        ListFooterComponent={<Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} unit="phiếu" onPage={pg.setPage} />}
        renderItem={({ item: x }) => {
          const st = lostStatus(x)
          return (
            <Pressable onPress={() => { tap(); router.push(`/lost/${x.id}`) }} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ flex: 1, fontWeight: "700", color: t.text }} numberOfLines={1}>{x.campaign_name || "Chưa rõ chiến dịch"}</Text>
                <View style={{ backgroundColor: st.soft, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>{st.label}</Text></View>
              </View>
              <Text style={{ color: t.sub, fontSize: 12 }}>{x.code} · Mã đơn {x.order_code}</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <View style={{ flex: 1 }}>
                  {x.sale_amount ? <Text style={{ fontWeight: "800", fontSize: 17, color: t.text }}>{vnd(x.sale_amount)}</Text> : null}
                  {x.reporter_name ? <Text style={{ color: t.sub, fontSize: 12 }}>Người báo: {x.reporter_name}{x.reporter_code ? ` · ${x.reporter_code}` : ""}</Text> : null}
                </View>
                <Text style={{ color: t.sub, fontSize: 12 }}>{day(x.created_at)}</Text>
              </View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, paddingHorizontal: 14, overflow: "hidden" },
  st: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  stText: { color: t.text, fontWeight: "700", fontSize: 12 },
  row: { backgroundColor: t.card, borderRadius: 16, padding: 12, gap: 6, ...shadow },
})
