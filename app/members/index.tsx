import { useMemo, useRef, useState } from "react"
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { kycOf, memberState, type Member, useMembers, useOrders } from "../../src/hooks"
import { num, vnd } from "../../src/format"
import { FilterButton, PickerSheet } from "../../src/sheet"
import { Avatar, Empty, ErrorBox, Loading, t } from "../../src/ui"
import { Pager, TopBar, tap, usePager } from "../../src/chrome"
import { shadow } from "../../src/theme"

const SORTS = [{ value: "name", label: "Tên A → Z" }, { value: "new", label: "Mới tham gia" }, { value: "comm", label: "Hoa hồng cao nhất" }, { value: "orders", label: "Nhiều đơn nhất" }]

export default function Members() {
  const router = useRouter()
  const q = useMembers()
  const orders = useOrders()
  const [term, setTerm] = useState("")
  const [role, setRole] = useState("")
  const [team, setTeam] = useState("")
  const [kyc, setKyc] = useState("")
  const [sort, setSort] = useState("name")
  const [sheet, setSheet] = useState<"" | "role" | "team" | "sort">("")

  const stats = useMemo(() => {
    const m = new Map<string, { n: number; comm: number }>()
    for (const o of orders.data ?? []) {
      if (!o.publisher_id) continue
      const x = m.get(o.publisher_id) ?? { n: 0, comm: 0 }
      x.n++; x.comm += o.publisher_commission || 0
      m.set(o.publisher_id, x)
    }
    return m
  }, [orders.data])
  const roles = useMemo(() => [...new Set((q.data ?? []).map((m) => m.role).filter(Boolean) as string[])].sort(), [q.data])
  const teams = useMemo(() => [...new Set((q.data ?? []).map((m) => m.team).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "vi")), [q.data])
  const rows = useMemo(() => {
    const k = term.trim().toLowerCase()
    const r = (q.data ?? []).filter((m) => {
      if (role && m.role !== role) return false
      if (team && m.team !== team) return false
      if (kyc === "done" && !["approved", "verified", "exempt"].includes(m.kyc_status ?? "")) return false
      if (kyc === "todo" && ["approved", "verified", "exempt"].includes(m.kyc_status ?? "")) return false
      if (k && ![m.name, m.rd_code, m.uid_code, m.email, m.phone].some((v) => (v ?? "").toLowerCase().includes(k))) return false
      return true
    })
    const by: Record<string, (a: Member, b: Member) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, "vi"),
      new: (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      comm: (a, b) => (stats.get(b.id)?.comm ?? 0) - (stats.get(a.id)?.comm ?? 0),
      orders: (a, b) => (stats.get(b.id)?.n ?? 0) - (stats.get(a.id)?.n ?? 0),
    }
    return [...r].sort(by[sort])
  }, [q.data, term, role, team, kyc, sort, stats])

  const pg = usePager(rows, 20, `${term}|${role}|${team}|${kyc}|${sort}`)
  const list = useRef<FlatList<Member>>(null)
  if (!q.on) return <Empty text="Bạn không có quyền xem danh sách thành viên." icon="lock-closed-outline" />
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <View style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder="Tên, mã RD, email, SĐT…" placeholderTextColor={t.sub} value={term} onChangeText={setTerm} autoCorrect={false} autoCapitalize="none" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <FilterButton label="Vai trò" value={role} active={!!role} onPress={() => setSheet("role")} />
        {teams.length ? <FilterButton label="Nhóm" value={team} active={!!team} onPress={() => setSheet("team")} /> : null}
        <FilterButton label="Sắp xếp" value={SORTS.find((x) => x.value === sort)?.label} active={sort !== "name"} onPress={() => setSheet("sort")} />
        {[["", "Mọi eKYC"], ["done", "Đã eKYC"], ["todo", "Chưa eKYC"]].map(([k, l]) => (
          <Pressable key={k} onPress={() => setKyc(k!)} style={[s.chip, kyc === k && s.chipOn]}><Text style={{ color: kyc === k ? "#fff" : t.text, fontWeight: "700", fontSize: 12 }}>{l}</Text></Pressable>
        ))}
      </ScrollView>
      <Text style={{ color: t.sub, fontSize: 12 }}>{num(rows.length)} / {num(q.data.length)} thành viên</Text>
    </View>
  )
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Thành viên" />
      <FlatList
        ref={list}
        data={pg.rows}
        ListFooterComponent={<Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} unit="thành viên" onPage={(p) => { pg.setPage(p); list.current?.scrollToOffset({ offset: 0, animated: true }) }} />}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={q.isFetching && !q.isPending} onRefresh={() => { void q.refetch() }} tintColor={t.navy} />}
        ListEmptyComponent={<Empty text="Không có thành viên phù hợp." icon="people-outline" />}
        renderItem={({ item: m }) => {
          const k = kycOf(m.kyc_status)
          const st = stats.get(m.id)
          return (
            <Pressable onPress={() => { tap(); router.push(`/members/${m.id}`) }} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
              <Avatar url={m.avatar_url} name={m.name} size={46} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontWeight: "800", color: t.text }} numberOfLines={1}>{m.name}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }} numberOfLines={1}>{[m.rd_code, m.role, m.team].filter(Boolean).join(" · ") || m.email}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={[s.pill, { backgroundColor: k[2] }]}><Text style={{ color: k[1], fontSize: 11, fontWeight: "800" }}>{k[0]}</Text></View>
                  {memberState(m.status) ? <View style={[s.pill, { backgroundColor: memberState(m.status)!.tone === "bad" ? t.badSoft : t.warnSoft }]}><Text style={{ color: memberState(m.status)!.tone === "bad" ? t.bad : t.warn, fontSize: 11, fontWeight: "800" }}>{memberState(m.status)!.label}</Text></View> : null}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontWeight: "900", color: t.text }}>{vnd(st?.comm)}</Text>
                <Text style={{ color: t.sub, fontSize: 11 }}>{num(st?.n)} đơn</Text>
              </View>
            </Pressable>
          )
        }}
      />
      <PickerSheet open={sheet === "role"} title="Vai trò" options={[{ value: "", label: "Mọi vai trò" }, ...roles.map((r) => ({ value: r, label: r }))]} value={role} onPick={setRole} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "team"} title="Nhóm" options={[{ value: "", label: "Mọi nhóm" }, ...teams.map((r) => ({ value: r, label: r }))]} value={team} onPick={setTeam} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "sort"} title="Sắp xếp" options={SORTS} value={sort} onPick={setSort} onClose={() => setSheet("")} />
    </View>
  )
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: t.line },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: t.line },
  chipOn: { backgroundColor: t.navy, borderColor: t.navy },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 12, ...shadow },
  pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
})
