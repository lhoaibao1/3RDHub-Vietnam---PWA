import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { api, ApiError } from "../../src/api"
import { orderStatus, useCampaigns, useMembers, useOrders } from "../../src/hooks"
import { vnd, when } from "../../src/format"
import { Card, Empty, ErrorBox, Loading, Row, SectionTitle, t } from "../../src/ui"
import { TopBar } from "../../src/chrome"

type Step = { at: string; source?: string; status?: string; biz_status?: string; partner_status?: string; sale_amount?: number }

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const orders = useOrders()
  const camps = useCampaigns()
  const members = useMembers()
  const hist = useQuery({
    queryKey: ["order-history", id],
    queryFn: () => api<{ data: Step[] }>(`/api/v1/conversions/${id}/history`).then((r) => r.data ?? []),
    retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 1,
  })
  if (orders.isPending) return <Loading />
  if (orders.isError) return <ErrorBox error={orders.error} retry={() => orders.refetch()} />
  const o = orders.data.find((x) => x.id === id)
  if (!o) return <Empty text="Không tìm thấy đơn này (có thể đã bị xoá hoặc ngoài phạm vi của bạn)." icon="search-outline" />
  const st = orderStatus(o.status)
  const camp = camps.data?.find((c) => c.id === o.campaign_id)
  const memberName = members.data?.find((m) => m.id === o.publisher_id)?.name
  const copy = (v: string) => { void Clipboard.setStringAsync(v); Alert.alert("Đã sao chép", v) }
  const steps = [...(hist.data ?? [])].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
    <TopBar title="Chi tiết đơn" />
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 20 }}>
        <View style={{ backgroundColor: st.soft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 }}><Text style={{ color: st.color, fontWeight: "900" }}>{st.label}</Text></View>
        <Text style={{ color: t.sub }}>Hoa hồng của đơn</Text>
        <Text style={{ fontSize: 32, fontWeight: "900", color: t.text }}>{vnd(o.publisher_commission)}</Text>
        {o.sale_amount ? <Text style={{ color: t.sub }}>Doanh số {vnd(o.sale_amount)}</Text> : null}
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        <Row icon="pricetag-outline" label="Mã đơn" value={o.external_order_id || "—"} onPress={o.external_order_id ? () => copy(o.external_order_id!) : undefined} />
        <Row icon="megaphone-outline" label="Chiến dịch" value={o.campaign_name || camp?.name || "—"} onPress={o.campaign_id ? () => router.push(`/campaign/${o.campaign_id}`) : undefined} />
        {memberName ? <Row icon="person-outline" label="Thành viên" value={memberName} onPress={() => router.push(`/members/${o.publisher_id}`)} /> : null}
        <Row icon="time-outline" label="Ngày tạo" value={when(o.created_at)} />
        {o.approved_on ? <Row icon="checkmark-done-outline" label="Ngày duyệt" value={when(o.approved_on)} /> : null}
        {o.updated_at ? <Row icon="refresh-outline" label="Cập nhật" value={when(o.updated_at)} /> : null}
        <Row icon="finger-print-outline" label="Mã hệ thống" value={o.id.slice(0, 8)} onPress={() => copy(o.id)} />
      </Card>

      <SectionTitle title="Lịch sử xử lý" />
      {hist.isPending ? <Loading /> : hist.isError ? (
        <Text style={{ color: t.sub }}>{hist.error instanceof ApiError && hist.error.status === 403 ? "Bạn chưa có quyền xem lịch sử đơn." : "Chưa xem được lịch sử đơn."}</Text>
      ) : steps.length ? (
        <Card style={{ gap: 0 }}>
          {steps.map((x, i) => {
            const label = x.status ? orderStatus(x.status).label : x.biz_status || x.partner_status || "Cập nhật"
            const color = x.status ? orderStatus(x.status).color : t.navy2
            return (
              <View key={i} style={s.step}>
                <View style={{ alignItems: "center" }}>
                  <View style={[s.node, { backgroundColor: color }]} />
                  {i < steps.length - 1 ? <View style={s.line} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 16, gap: 2 }}>
                  <Text style={{ fontWeight: "800", color: t.text }}>{label}</Text>
                  {x.partner_status && x.status ? <Text style={{ color: t.sub, fontSize: 12 }}>Đối tác: {x.partner_status}</Text> : null}
                  {x.sale_amount != null ? <Text style={{ color: t.sub, fontSize: 12 }}>Doanh số {vnd(x.sale_amount)}</Text> : null}
                  <Text style={{ color: t.sub, fontSize: 12 }}><Ionicons name={x.source === "partner" ? "business-outline" : "server-outline"} size={11} /> {x.source === "partner" ? "Đối tác" : "Hệ thống"} · {when(x.at)}</Text>
                </View>
              </View>
            )
          })}
        </Card>
      ) : <Text style={{ color: t.sub }}>Chưa có bước xử lý nào.</Text>}
    </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({
  step: { flexDirection: "row", gap: 12 },
  node: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { width: 2, flex: 1, backgroundColor: t.line, marginTop: 2 },
})
