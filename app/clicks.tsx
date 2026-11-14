import { useMemo, useState } from "react"
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { api } from "../src/api"
import { useCampaigns, useCan } from "../src/hooks"
import { RANGES, rangeOf, type RangeKey } from "../src/dates"
import { num, when } from "../src/format"
import { Empty, ErrorBox, Loading, t } from "../src/ui"
import { Pager, TopBar, usePager } from "../src/chrome"
import { StatBar } from "../src/detail"
import { FilterButton, PickerSheet } from "../src/sheet"
import { Text } from "../src/text"
import { shadow } from "../src/theme"

type Click = { id: string; click_id?: string; campaign_id?: string; link_id?: string; publisher_id?: string; publisher_name?: string; occurred_at: string; ip?: string; device?: string; via?: string }

/** Thanh ngang tỉ lệ cho bảng xếp hạng. */
function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <View style={{ gap: 10 }}>
      {rows.map(([k, v]) => (
        <View key={k} style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Text style={{ flex: 1, color: t.text, fontSize: 13 }} numberOfLines={1}>{k}</Text><Text style={{ color: t.text, fontWeight: "700", fontSize: 13 }}>{num(v)}</Text></View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.navySoft }}><View style={{ height: 6, borderRadius: 3, backgroundColor: t.navy2, width: `${Math.max(2, (v / max) * 100)}%` }} /></View>
        </View>
      ))}
    </View>
  )
}

export default function Clicks() {
  const can = useCan()
  const on = can("clicks.read")
  const camps = useCampaigns()
  const q = useQuery({ queryKey: ["clicks"], queryFn: () => api<{ data: Click[] }>("/api/v1/clicks").then((r) => r.data ?? []), enabled: on, staleTime: 60_000 })
  const [range, setRange] = useState<RangeKey>("7d")
  const [camp, setCamp] = useState("")
  const [sheet, setSheet] = useState<"" | "range" | "camp">("")
  const campName = useMemo(() => new Map((camps.data ?? []).map((c) => [c.id, c.name])), [camps.data])

  const rows = useMemo(() => {
    const win = rangeOf(range)
    return (q.data ?? []).filter((c) => {
      if (camp && c.campaign_id !== camp) return false
      if (win) { const at = new Date(c.occurred_at).getTime(); if (at < win[0] || at >= win[1]) return false }
      return true
    })
  }, [q.data, range, camp])
  const stats = useMemo(() => {
    const byCamp = new Map<string, number>(), byDev = new Map<string, number>(), byDay = new Map<string, number>(), ips = new Set<string>()
    for (const c of rows) {
      const n = (c.campaign_id && campName.get(c.campaign_id)) || "Khác"
      byCamp.set(n, (byCamp.get(n) ?? 0) + 1)
      const d = c.device || "Không rõ"
      byDev.set(d, (byDev.get(d) ?? 0) + 1)
      const at = new Date(c.occurred_at), k = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`
      byDay.set(k, (byDay.get(k) ?? 0) + 1)
      if (c.ip) ips.add(c.ip)
    }
    const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
    const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14)
    return { camps: top(byCamp, 6), devs: top(byDev, 5), days, ips: ips.size }
  }, [rows, campName])
  const pg = usePager(rows, 20, `${range}|${camp}`)
  const maxDay = Math.max(1, ...stats.days.map((d) => d[1]))

  if (!on) return <View style={{ flex: 1 }}><TopBar title="Báo cáo click" /><Empty text="Bạn không có quyền xem báo cáo click." icon="lock-closed-outline" /></View>
  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Báo cáo click" /><Loading /></View>
  if (q.isError) return <View style={{ flex: 1 }}><TopBar title="Báo cáo click" /><ErrorBox error={q.error} retry={() => q.refetch()} /></View>
  const campOpts = [{ value: "", label: "Mọi chiến dịch" }, ...[...new Set(q.data.map((c) => c.campaign_id).filter(Boolean) as string[])].map((id) => ({ value: id, label: campName.get(id) || "Chiến dịch" })).sort((a, b) => a.label.localeCompare(b.label, "vi"))]

  const header = (
    <View style={{ gap: 14, paddingBottom: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <FilterButton label="Thời gian" value={RANGES.find((r) => r.value === range)?.label} active onPress={() => setSheet("range")} />
        <FilterButton label="Chiến dịch" value={campName.get(camp)} active={!!camp} onPress={() => setSheet("camp")} />
      </ScrollView>
      <StatBar items={[{ k: "Lượt click", v: num(rows.length), color: t.navy }, { k: "IP khác nhau", v: num(stats.ips) }, { k: "TB mỗi ngày", v: num(Math.round(rows.length / Math.max(1, stats.days.length))) }]} />
      {stats.days.length > 1 ? (
        <View style={s.card}>
          <Text style={s.h}>Click theo ngày</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 90 }}>
            {stats.days.map(([d, v], i) => (
              <View key={d} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <View style={{ width: "100%", height: Math.max(3, (v / maxDay) * 70), borderRadius: 4, backgroundColor: i === stats.days.length - 1 ? t.gold : t.navy2 }} />
                <Text style={{ color: t.sub, fontSize: 9 }}>{d.slice(8)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {stats.camps.length ? <View style={s.card}><Text style={s.h}>Theo chiến dịch</Text><Bars rows={stats.camps} /></View> : null}
      {stats.devs.length ? <View style={s.card}><Text style={s.h}>Theo thiết bị</Text><Bars rows={stats.devs} /></View> : null}
      <Text style={[s.h, { marginLeft: 6, marginBottom: 0 }]}>Từng lượt click</Text>
    </View>
  )
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Báo cáo click" />
      <FlatList
        data={pg.rows}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={q.isFetching && !q.isPending} onRefresh={() => { void q.refetch() }} tintColor={t.navy} />}
        ListEmptyComponent={<Text style={{ color: t.sub, textAlign: "center", paddingVertical: 20 }}>Không có lượt click nào trong khoảng này.</Text>}
        ListFooterComponent={<Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} unit="click" onPage={pg.setPage} />}
        renderItem={({ item: c }) => (
          <View style={s.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: "600", color: t.text }} numberOfLines={1}>{(c.campaign_id && campName.get(c.campaign_id)) || "Chiến dịch"}</Text>
              <Text style={{ color: t.sub, fontSize: 12 }} numberOfLines={1}>{[c.device, c.ip, c.publisher_name].filter(Boolean).join(" · ")}</Text>
            </View>
            <Text style={{ color: t.sub, fontSize: 12 }}>{when(c.occurred_at)}</Text>
          </View>
        )}
      />
      <PickerSheet open={sheet === "range"} title="Thời gian" options={RANGES} value={range} onPick={(v) => setRange(v as RangeKey)} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "camp"} title="Chiến dịch" options={campOpts} value={camp} onPick={setCamp} onClose={() => setSheet("")} />
    </View>
  )
}
const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 14, ...shadow },
  h: { color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
})
