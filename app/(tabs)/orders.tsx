import { useMemo, useState } from "react"
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text, TextInput } from "../../src/text"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { commissionOf, ORDER_STATUS, orderCode, orderStatus, useCampaigns, useMembers, useOrders, type Member, type Order } from "../../src/hooks"
import { rangeLabel, rangeOf } from "../../src/dates"
import { RangeSheet } from "../../src/rangesheet"
import { num, vnd, vndShort, when } from "../../src/format"
import { FilterButton, PickerSheet } from "../../src/sheet"
import { Art, Card, Empty, ErrorBox, Loading, t, PullRefresh } from "../../src/ui"
import { Glass, LargeTitle, Pager, tap, usePager, useOwnScroll } from "../../src/chrome"
import { shadow } from "../../src/theme"
import { sheet } from "../../src/theme"

const SORTS = [{ value: "new", label: "Mới nhất" }, { value: "old", label: "Cũ nhất" }, { value: "sale", label: "Giá trị đơn cao nhất" }, { value: "comm", label: "Hoa hồng cao nhất" }]

export default function Orders() {
  const router = useRouter()
  const q = useOrders()
  const camps = useCampaigns()
  const members = useMembers()
  const [term, setTerm] = useState("")
  const [status, setStatus] = useState("")
  const [range, setRange] = useState<string>("30d")
  const [camp, setCamp] = useState("")
  const [member, setMember] = useState("")
  const [team, setTeam] = useState("")
  const [sort, setSort] = useState("new")
  const [sheet, setSheet] = useState<"" | "range" | "camp" | "member" | "team" | "sort">("")

  const campName = useMemo(() => new Map((camps.data ?? []).map((c) => [c.id, c.name])), [camps.data])
  const campArt = useMemo(() => new Map((camps.data ?? []).map((c) => [c.id, c.offer?.thumb_url || c.offer?.banner_url || ""])), [camps.data])
  const memberOf = useMemo(() => new Map<string, Member>((members.data ?? []).map((m) => [m.id, m])), [members.data])
  const nameOf = (o: Order) => o.campaign_name || (o.campaign_id ? campName.get(o.campaign_id) : "") || "Đơn hàng"
  const who = (o: Order) => (o.publisher_id ? memberOf.get(o.publisher_id) : undefined)

  // Lọc theo mọi thứ trừ trạng thái (để đếm số đơn từng trạng thái), rồi mới lọc trạng thái.
  const base = useMemo(() => {
    const win = rangeOf(range)
    const k = term.trim().toLowerCase()
    return (q.data ?? []).filter((o) => {
      if (win) { const at = new Date(o.created_at).getTime(); if (at < win[0] || at >= win[1]) return false }
      if (camp && o.campaign_id !== camp) return false
      if (member && o.publisher_id !== member) return false
      const m = who(o)
      if (team && m?.team !== team) return false
      if (k && ![orderCode(o), nameOf(o), m?.name, o.fields?.product].some((v) => (v ?? "").toLowerCase().includes(k))) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, range, camp, member, team, term, campName, memberOf])
  const counts = useMemo(() => base.reduce<Record<string, number>>((a, o) => ((a[o.status] = (a[o.status] ?? 0) + 1), a), {}), [base])
  const rows = useMemo(() => {
    const r = base.filter((o) => !status || o.status === status)
    const by = { new: (a: Order, b: Order) => b.created_at.localeCompare(a.created_at), old: (a: Order, b: Order) => a.created_at.localeCompare(b.created_at), comm: (a: Order, b: Order) => (b.publisher_commission || 0) - (a.publisher_commission || 0), sale: (a: Order, b: Order) => (b.sale_amount || 0) - (a.sale_amount || 0) }[sort as "new"]
    return [...r].sort(by)
  }, [base, status, sort])
  const sale = rows.reduce((a, o) => a + (o.sale_amount || 0), 0)
  const pg = usePager(rows, 20, `${status}|${range}|${camp}|${member}|${team}|${term}|${sort}`)
  const keep = useOwnScroll()
  const list = keep.ref
  const reset = () => { setStatus(""); setRange("30d"); setCamp(""); setMember(""); setTeam(""); setTerm(""); setSort("new") }
  const filtered = !!(status || range !== "30d" || camp || member || team || term)

  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />

  const campOpts = [{ value: "", label: "Mọi chiến dịch" }, ...[...new Set((q.data ?? []).map((o) => o.campaign_id).filter(Boolean) as string[])].map((id) => ({ value: id, label: campName.get(id) || "Chiến dịch" })).sort((a, b) => a.label.localeCompare(b.label, "vi"))]
  const memberOpts = [{ value: "", label: "Mọi thành viên" }, ...(members.data ?? []).map((m) => ({ value: m.id, label: m.name, sub: [m.rd_code, m.team, m.region].filter(Boolean).join(" · ") })).sort((a, b) => a.label.localeCompare(b.label, "vi"))]
  const teams = [...new Set((members.data ?? []).map((m) => m.team).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "vi"))

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <Glass style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder={members.on ? "Tìm mã đơn, chiến dịch, thành viên…" : "Tìm mã đơn hoặc chiến dịch…"} placeholderTextColor={t.sub} value={term} onChangeText={setTerm} autoCorrect={false} />{term ? <Pressable onPress={() => setTerm("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={t.sub} /></Pressable> : null}</Glass>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <FilterButton label="Thời gian" value={rangeLabel(range)} active onPress={() => setSheet("range")} />
        <FilterButton label="Chiến dịch" value={campName.get(camp)} active={!!camp} onPress={() => setSheet("camp")} />
        {members.on && teams.length ? <FilterButton label="Nhóm" value={team} active={!!team} onPress={() => setSheet("team")} /> : null}
        {members.on ? <FilterButton label="Thành viên" value={memberOf.get(member)?.name} active={!!member} onPress={() => setSheet("member")} /> : null}
        <FilterButton label="Sắp xếp" value={SORTS.find((x) => x.value === sort)?.label} active={sort !== "new"} onPress={() => setSheet("sort")} />
        {filtered ? <Pressable onPress={reset} style={s.clear}><Text style={{ color: t.bad, fontWeight: "700", fontSize: 13 }}>Xóa lọc</Text></Pressable> : null}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable onPress={() => setStatus("")} style={[s.st, !status && s.stOn]}><Text style={[s.stText, !status && { color: "#fff" }]}>Tất cả · {num(base.length)}</Text></Pressable>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Pressable key={k} onPress={() => setStatus(status === k ? "" : k)} style={[s.st, status === k && { backgroundColor: v.color, borderColor: v.color }]}>
            <View style={[s.dot, { backgroundColor: status === k ? "#fff" : v.color }]} />
            <Text style={[s.stText, status === k && { color: "#fff" }]}>{v.label} · {num(counts[k] ?? 0)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={s.sum}><Text style={s.sumK}>Số đơn</Text><Text style={s.sumV}>{num(rows.length)}</Text></Card>
        <Card style={s.sum}><Text style={s.sumK}>Giá trị đơn</Text><Text style={s.sumV} numberOfLines={1}>{vndShort(sale)}</Text></Card>
        <Card style={s.sum}><Text style={s.sumK}>Hoa hồng</Text><Text style={[s.sumV, { color: t.gold }]} numberOfLines={1}>{vndShort(commissionOf(rows))}</Text></Card>
      </View>
      <Text style={{ color: t.sub, fontSize: 11 }}>Hoa hồng cộng theo từng đơn, không tính đơn bị từ chối hoặc hủy. Số tiền thực nhận xem ở Ví.</Text>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LargeTitle title="Đơn hàng" sub={`${num(q.data.length)} đơn`} />
      <FlatList showsVerticalScrollIndicator={false}
        {...keep}
        data={pg.rows}
        keyExtractor={(o) => o.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 110, gap: 10, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<PullRefresh run={() => Promise.all([q.refetch()])} />}
        ListEmptyComponent={<Empty text={filtered ? "Không có đơn nào khớp bộ lọc." : "Chưa có đơn hàng."} icon="receipt-outline" />}
        ListFooterComponent={<Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} unit="đơn" onPage={(p) => { pg.setPage(p); list.current?.scrollToOffset({ offset: 0, animated: true }) }} />}
        renderItem={({ item: o }) => {
          const st = orderStatus(o.status), m = who(o)
          const line = [m?.team, m?.region].filter(Boolean).join(" · ")
          return (
            <Pressable onPress={() => { tap(); router.push(`/order/${o.id}`) }} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Art url={o.campaign_id ? campArt.get(o.campaign_id) : ""} name={nameOf(o)} style={s.thumb} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{nameOf(o)}</Text>
                  <Text style={{ color: t.sub, fontSize: 12 }} numberOfLines={1}>{orderCode(o) || "Không có mã"}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: st.soft }]}><Text style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>{st.label}</Text></View>
              </View>
              <View style={s.money}>
                <View style={{ flex: 1 }}>
                  <Text style={s.k}>Giá trị đơn</Text>
                  <Text style={s.big} numberOfLines={1}>{vnd(o.sale_amount)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.k}>Hoa hồng</Text>
                  <Text style={s.small}>{vnd(o.publisher_commission)}</Text>
                </View>
              </View>
              <View style={s.meta}>
                {o.fields?.product ? <Text style={s.tag} numberOfLines={1}>{o.fields.product}</Text> : null}
                {m ? <Text style={s.metaText} numberOfLines={1}>{m.name}{line ? ` · ${line}` : ""}</Text> : null}
                <Text style={[s.metaText, { marginLeft: "auto", flexShrink: 0 }]}>{when(o.created_at)}</Text>
              </View>
              {m && (m.team_lead_name || m.am_name) ? <Text style={s.metaText} numberOfLines={1}>TL: {m.team_lead_name || "—"} · AM: {m.am_name || "—"}</Text> : null}
            </Pressable>
          )
        }}
      />
      <RangeSheet open={sheet === "range"} value={range} onPick={setRange} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "camp"} title="Chiến dịch" options={campOpts} value={camp} onPick={setCamp} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "team"} title="Nhóm" options={[{ value: "", label: "Mọi nhóm" }, ...teams.map((x) => ({ value: x, label: x }))]} value={team} onPick={setTeam} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "member"} title="Thành viên" options={memberOpts} value={member} onPick={setMember} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "sort"} title="Sắp xếp" options={SORTS} value={sort} onPick={setSort} onClose={() => setSheet("")} />
    </View>
  )
}
const s = sheet(() => StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, paddingHorizontal: 14, overflow: "hidden" },
  clear: { justifyContent: "center", paddingHorizontal: 10 },
  st: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  stOn: { backgroundColor: t.solid, borderColor: t.solid },
  stText: { color: t.text, fontWeight: "700", fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sum: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 2 },
  sumK: { color: t.sub, fontSize: 11 },
  sumV: { color: t.text, fontWeight: "800", fontSize: 15 },
  row: { backgroundColor: t.card, borderRadius: 16, padding: 12, gap: 8, ...shadow },
  thumb: { width: 40, height: 40, borderRadius: 10, overflow: "hidden" },
  pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  money: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  k: { color: t.sub, fontSize: 11 },
  big: { color: t.text, fontSize: 20, fontWeight: "800" },
  small: { color: t.gold, fontSize: 13, fontWeight: "700" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { color: t.sub, fontSize: 12, flexShrink: 1 },
  tag: { flexShrink: 0, color: t.navy, backgroundColor: t.navySoft, fontSize: 11, fontWeight: "700", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: "hidden" },
}))
