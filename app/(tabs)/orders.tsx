import { useMemo, useState } from "react"
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../src/api"
import { STATUS_HEX, useStatuses } from "../../src/hooks"
import { vnd, when } from "../../src/format"
import { Card, Chip, Empty, ErrorBox, Loading, t } from "../../src/ui"

type Order = { id: string; campaign_name?: string; external_order_id?: string; status: string; biz_status?: string; created_at: string; publisher_commission: number; sale_amount?: number }
const BASE: Record<string, [string, string]> = { pending: ["Chờ xử lý", t.warn], hold: ["Tạm giữ", t.warn], approved: ["Đã duyệt", t.ok], paid: ["Đã trả", t.ok], rejected: ["Từ chối", t.bad], cancelled: ["Đã hủy", t.sub] }

export default function Orders() {
  const [f, setF] = useState("")
  const q = useQuery({ queryKey: ["orders"], queryFn: () => api<{ data: Order[] }>("/api/v1/conversions?limit=50").then((r) => r.data) })
  const st = useStatuses()
  const label = (o: Order): [string, string] => {
    const u = st.data?.find((x) => x.key === o.biz_status)
    if (u) return [u.label, STATUS_HEX[u.color] || t.sub]
    return BASE[o.status] ?? [o.status, t.sub]
  }
  const rows = useMemo(() => (q.data ?? []).filter((o) => !f || o.status === f), [q.data, f])
  const total = rows.reduce((a, o) => a + (o.publisher_commission || 0), 0)
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}>
          <Chip label="Tất cả" on={!f} onPress={() => setF("")} />
          {Object.entries(BASE).map(([k, v]) => <Chip key={k} label={v[0]} on={f === k} onPress={() => setF(f === k ? "" : k)} />)}
        </ScrollView>
      </View>
      <Text style={{ marginHorizontal: 16, marginBottom: 6, color: t.sub }}>{rows.length} đơn · Hoa hồng {vnd(total)}</Text>
      <FlatList
        data={rows}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { void q.refetch() }} tintColor={t.navy} />}
        ListEmptyComponent={<Empty text="Chưa có đơn hàng." icon="receipt-outline" />}
        renderItem={({ item: o }) => {
          const [text, color] = label(o)
          return (
            <Card style={s.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: "800", color: t.text }} numberOfLines={1}>{o.campaign_name || "Đơn hàng"}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }}>{o.external_order_id ? `#${o.external_order_id} · ` : ""}{when(o.created_at)}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /><Text style={{ color, fontSize: 12, fontWeight: "700" }}>{text}</Text></View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontWeight: "900", color: t.text }}>{vnd(o.publisher_commission)}</Text>
                {o.sale_amount ? <Text style={{ color: t.sub, fontSize: 11 }}>ĐS {vnd(o.sale_amount)}</Text> : null}
              </View>
            </Card>
          )
        }}
      />
    </View>
  )
}
const s = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 10 } })
