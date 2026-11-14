import { useState } from "react"
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../src/api"
import { Card, ErrorBox, Loading, c, num, vnd, when } from "../../src/ui"

type Totals = { clicks: number; orders: number; approved: number; commission: number; sale: number; approval_rate: number | null }
type Overview = { totals: Totals; previous: Totals }
type Order = { id: string; campaign_name?: string; external_order_id?: string; status: string; created_at: string; publisher_commission: number }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const RANGES = [{ k: "today", label: "Hôm nay", days: 0 }, { k: "7d", label: "7 ngày", days: 6 }, { k: "30d", label: "30 ngày", days: 29 }] as const

function delta(now: number, before: number) {
  if (!before) return null
  const p = Math.round(((now - before) / before) * 100)
  return { text: `${p >= 0 ? "+" : ""}${p}%`, up: p >= 0 }
}

export default function Dashboard() {
  const [range, setRange] = useState<(typeof RANGES)[number]["k"]>("7d")
  const days = RANGES.find((r) => r.k === range)!.days
  const to = new Date()
  const from = new Date(Date.now() - days * 86400000)
  const q = `from=${ymd(from)}&to=${ymd(to)}`
  const ov = useQuery({ queryKey: ["overview", q], queryFn: () => api<{ data: Overview }>(`/api/v1/dashboard/overview?${q}`) })
  const recent = useQuery({ queryKey: ["orders", "recent"], queryFn: () => api<{ data: Order[] }>("/api/v1/conversions?limit=5") })

  if (ov.isPending) return <Loading />
  if (ov.isError) return <ErrorBox error={ov.error} retry={() => ov.refetch()} />
  const t = ov.data.data.totals, p = ov.data.data.previous
  const tiles = [
    { label: "Hoa hồng", value: vnd(t.commission), d: delta(t.commission, p.commission) },
    { label: "Lượt click", value: num(t.clicks), d: delta(t.clicks, p.clicks) },
    { label: "Đơn hàng", value: num(t.orders), d: delta(t.orders, p.orders) },
    { label: "Đơn đã duyệt", value: num(t.approved), d: delta(t.approved, p.approved) },
  ]
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={ov.isFetching} onRefresh={() => { void ov.refetch(); void recent.refetch() }} />}>
      <View style={s.row}>
        {RANGES.map((r) => (
          <Pressable key={r.k} onPress={() => setRange(r.k)} style={[s.chip, range === r.k && s.chipOn]}>
            <Text style={{ color: range === r.k ? "#fff" : c.text, fontWeight: "600" }}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.grid}>
        {tiles.map((x) => (
          <Card key={x.label} style={s.tile}>
            <Text style={s.tileLabel}>{x.label}</Text>
            <Text style={s.tileValue}>{x.value}</Text>
            {x.d ? <Text style={{ color: x.d.up ? c.ok : c.bad, fontSize: 12 }}>{x.d.text} so với kỳ trước</Text> : null}
          </Card>
        ))}
      </View>
      {t.approval_rate != null ? <Card><Text style={s.tileLabel}>Tỷ lệ duyệt</Text><Text style={s.tileValue}>{Math.round(t.approval_rate * (t.approval_rate <= 1 ? 100 : 1))}%</Text></Card> : null}
      <Text style={s.h}>Đơn gần đây</Text>
      {(recent.data?.data ?? []).map((o) => (
        <Card key={o.id} style={s.order}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600" }} numberOfLines={1}>{o.campaign_name || o.external_order_id || "Đơn hàng"}</Text>
            <Text style={s.sub}>{when(o.created_at)} · {o.status}</Text>
          </View>
          <Text style={{ fontWeight: "700", color: c.ok }}>{vnd(o.publisher_commission)}</Text>
        </Card>
      ))}
      {recent.data && !recent.data.data.length ? <Text style={s.sub}>Chưa có đơn hàng.</Text> : null}
    </ScrollView>
  )
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: c.line },
  chipOn: { backgroundColor: c.brand, borderColor: c.brand },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, flexBasis: "46%", gap: 4 },
  tileLabel: { color: c.sub, fontSize: 13 },
  tileValue: { fontSize: 22, fontWeight: "800", color: c.text },
  h: { fontSize: 16, fontWeight: "700", marginTop: 6 },
  order: { flexDirection: "row", alignItems: "center", gap: 10 },
  sub: { color: c.sub, fontSize: 12 },
})
