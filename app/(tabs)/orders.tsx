import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../src/api"
import { Card, Empty, ErrorBox, Loading, c, vnd, when } from "../../src/ui"

type Order = { id: string; campaign_name?: string; external_order_id?: string; status: string; created_at: string; publisher_commission: number }
const tone = (s: string) => (/approv|duyet|paid/i.test(s) ? c.ok : /reject|cancel|huy|tu_choi/i.test(s) ? c.bad : c.warn)

export default function Orders() {
  const q = useQuery({ queryKey: ["orders"], queryFn: () => api<{ data: Order[] }>("/api/v1/conversions?limit=100") })
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={q.data.data}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { void q.refetch() }} />}
      ListEmptyComponent={<Empty text="Chưa có đơn hàng." />}
      renderItem={({ item: o }) => (
        <Card style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600" }} numberOfLines={1}>{o.campaign_name || "Đơn hàng"}</Text>
            <Text style={s.sub}>{o.external_order_id ? `#${o.external_order_id} · ` : ""}{when(o.created_at)}</Text>
            <Text style={{ color: tone(o.status), fontSize: 12, fontWeight: "600" }}>{o.status}</Text>
          </View>
          <Text style={{ fontWeight: "700" }}>{vnd(o.publisher_commission)}</Text>
        </Card>
      )}
    />
  )
}
const s = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 10 }, sub: { color: c.sub, fontSize: 12 } })
