import { useMemo, useState } from "react"
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { ORDER_STATUS, orderStatus, useCampaigns, useMembers, useOrders, type Order } from "../../src/hooks"
import { RANGES, rangeOf, type RangeKey } from "../../src/dates"
import { num, vnd, vndShort, when } from "../../src/format"
import { FilterButton, PickerSheet } from "../../src/sheet"
import { Card, Empty, ErrorBox, Loading, t } from "../../src/ui"
import { shadow } from "../../src/theme"

const PAGE = 30
const SORTS = [{ value: "new", label: "Mới nhất" }, { value: "old", label: "Cũ nhất" }, { value: "comm", label: "Hoa hồng cao nhất" }, { value: "sale", label: "Doanh số cao nhất" }]

export default function Orders() {
  const router = useRouter()
  const q = useOrders()
  const camps = useCampaigns()
  const members = useMembers()
  const [term, setTerm] = useState("")
  const [status, setStatus] = useState("")
  const [range, setRange] = useState<RangeKey>("30d")
  const [camp, setCamp] = useState("")
  const [member, setMember] = useState("")
  const [sort, setSort] = useState("new")
  const [sheet, setSheet] = useState<"" | "range" | "camp" | "member" | "sort">("")
  const [shown, setShown] = useState(PAGE)

  const campName = useMemo(() => new Map((camps.data ?? []).map((c) => [c.id, c.name])), [camps.data])
  const memberName = useMemo(() => new Map((members.data ?? []).map((m) => [m.id, m.name])), [members.data])
  const nameOf = (o: Order) => o.campaign_name || (o.campaign_id ? campName.get(o.campaign_id) : "") || "Đơn hàng"

  // Lọc theo mọi thứ trừ trạng thái (để đếm số đơn từng trạng thái), rồi mới lọc trạng thái.
  const base = useMemo(() => {
    const win = rangeOf(range)
    const k = term.trim().toLowerCase()
    return (q.data ?? []).filter((o) => {
      if (win) { const at = new Date(o.created_at).getTime(); if (at < win[0] || at >= win[1]) return false }
      if (camp && o.campaign_id !== camp) return false
      if (member && o.publisher_id !== member) return false
      if (k && !(o.external_order_id ?? "").toLowerCase().includes(k) && !nameOf(o).toLowerCase().includes(k)) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, range, camp, member, term, campName])
  const counts = useMemo(() => base.reduce<Record<string, number>>((a, o) => ((a[o.status] = (a[o.status] ?? 0) + 1), a), {}), [base])
  const rows = useMemo(() => {
    const r = base.filter((o) => !status || o.status === status)
    const by = { new: (a: Order, b: Order) => b.created_at.localeCompare(a.created_at), old: (a: Order, b: Order) => a.created_at.localeCompare(b.created_at), comm: (a: Order, b: Order) => (b.publisher_commission || 0) - (a.publisher_commission || 0), sale: (a: Order, b: Order) => (b.sale_amount || 0) - (a.sale_amount || 0) }[sort as "new"]
    return [...r].sort(by)
  }, [base, status, sort])
  const sum = rows.reduce((a, o) => a + (o.publisher_commission || 0), 0)
  const approved = rows.filter((o) => o.status === "approved" || o.status === "paid").reduce((a, o) => a + (o.publisher_commission || 0), 0)
  const reset = () => { setStatus(""); setRange("30d"); setCamp(""); setMember(""); setTerm(""); setSort("new"); setShown(PAGE) }
  const filtered = !!(status || range !== "30d" || camp || member || term)

  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />

  const campOpts = [{ value: "", label: "Mọi chiến dịch" }, ...[...new Set((q.data ?? []).map((o) => o.campaign_id).filter(Boolean) as string[])].map((id) => ({ value: id, label: campName.get(id) || "Chiến dịch" })).sort((a, b) => a.label.localeCompare(b.label, "vi"))]
  const memberOpts = [{ value: "", label: "Mọi thành viên" }, ...(members.data ?? []).map((m) => ({ value: m.id, label: m.name, sub: [m.rd_code, m.role].filter(Boolean).join(" · ") })).sort((a, b) => a.label.localeCompare(b.label, "vi"))]

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <View style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder="Tìm mã đơn hoặc chiến dịch…" placeholderTextColor={t.sub} value={term} onChangeText={(v) => { setTerm(v); setShown(PAGE) }} autoCorrect={false} />{term ? <Pressable onPress={() => setTerm("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={t.sub} /></Pressable> : null}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <FilterButton label="Thời gian" value={RANGES.find((r) => r.value === range)?.label} active onPress={() => setSheet("range")} />
        <FilterButton label="Chiến dịch" value={campName.get(camp)} active={!!camp} onPress={() => setSheet("camp")} />
        {members.on ? <FilterButton label="Thành viên" value={memberName.get(member)} active={!!member} onPress={() => setSheet("member")} /> : null}
        <FilterButton label="Sắp xếp" value={SORTS.find((x) => x.value === sort)?.label} active={sort !== "new"} onPress={() => setSheet("sort")} />
        {filtered ? <Pressable onPress={reset} style={s.clear}><Ionicons name="refresh" size={14} color={t.bad} /><Text style={{ color: t.bad, fontWeight: "700", fontSize: 13 }}>Xóa lọc</Text></Pressable> : null}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable onPress={() => setStatus("")} style={[s.st, !status && s.stOn]}><Text style={[s.stText, !status && { color: "#fff" }]}>Tất cả · {num(base.length)}</Text></Pressable>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Pressable key={k} onPress={() => { setStatus(status === k ? "" : k); setShown(PAGE) }} style={[s.st, status === k && { backgroundColor: v.color, borderColor: v.color }]}>
            <View style={[s.dot, { backgroundColor: status === k ? "#fff" : v.color }]} />
            <Text style={[s.stText, status === k && { color: "#fff" }]}>{v.label} · {num(counts[k] ?? 0)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={s.sum}><Text style={s.sumK}>Số đơn</Text><Text style={s.sumV}>{num(rows.length)}</Text></Card>
        <Card style={s.sum}><Text style={s.sumK}>Tổng hoa hồng</Text><Text style={[s.sumV, { color: t.gold }]} numberOfLines={1}>{vndShort(sum)}</Text></Card>
        <Card style={s.sum}><Text style={s.sumK}>Đã duyệt</Text><Text style={[s.sumV, { color: t.ok }]} numberOfLines={1}>{vndShort(approved)}</Text></Card>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={rows.slice(0, shown)}
        keyExtractor={(o) => o.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={q.isFetching && !q.isPending} onRefresh={() => { void q.refetch() }} tintColor={t.navy} />}
        ListEmptyComponent={<Empty text={filtered ? "Không có đơn nào khớp bộ lọc." : "Chưa có đơn hàng."} icon="receipt-outline" />}
        onEndReached={() => setShown((n) => (n < rows.length ? n + PAGE : n))}
        onEndReachedThreshold={0.4}
        ListFooterComponent={rows.length > shown ? <Text style={{ textAlign: "center", color: t.sub, paddingVertical: 12 }}>Đang hiện {num(shown)} / {num(rows.length)} đơn</Text> : undefined}
        renderItem={({ item: o }) => {
          const st = orderStatus(o.status)
          return (
            <Pressable onPress={() => router.push(`/order/${o.id}`)} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
              <View style={[s.bar, { backgroundColor: st.color }]} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontWeight: "800", color: t.text }} numberOfLines={1}>{nameOf(o)}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }} numberOfLines={1}>{o.external_order_id ? `#${o.external_order_id}` : "Không có mã"} · {when(o.created_at)}</Text>
                {members.on && o.publisher_id ? <Text style={{ color: t.sub, fontSize: 12 }} numberOfLines={1}>👤 {memberName.get(o.publisher_id) || "Thành viên"}</Text> : null}
                <View style={[s.pill, { backgroundColor: st.soft }]}><Text style={{ color: st.color, fontSize: 11, fontWeight: "800" }}>{st.label}</Text></View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text style={{ fontWeight: "900", color: t.text, fontSize: 15 }}>{vnd(o.publisher_commission)}</Text>
                {o.sale_amount ? <Text style={{ color: t.sub, fontSize: 11 }}>DS {vnd(o.sale_amount)}</Text> : null}
                <Ionicons name="chevron-forward" size={16} color={t.sub} />
              </View>
            </Pressable>
          )
        }}
      />
      <PickerSheet open={sheet === "range"} title="Thời gian" options={RANGES} value={range} onPick={(v) => { setRange(v as RangeKey); setShown(PAGE) }} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "camp"} title="Chiến dịch" options={campOpts} value={camp} onPick={(v) => { setCamp(v); setShown(PAGE) }} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "member"} title="Thành viên" options={memberOpts} value={member} onPick={(v) => { setMember(v); setShown(PAGE) }} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "sort"} title="Sắp xếp" options={SORTS} value={sort} onPick={setSort} onClose={() => setSheet("")} />
    </View>
  )
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: t.line },
  clear: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10 },
  st: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: t.line },
  stOn: { backgroundColor: t.navy, borderColor: t.navy },
  stText: { color: t.text, fontWeight: "700", fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sum: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 2 },
  sumK: { color: t.sub, fontSize: 11 },
  sumV: { color: t.text, fontWeight: "900", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, paddingLeft: 0, overflow: "hidden", ...shadow },
  bar: { width: 4, alignSelf: "stretch", borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  pill: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
})
