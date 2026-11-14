import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text } from "../../src/text"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { api, ApiError } from "../../src/api"
import { orderCode, orderStatus, useCampaigns, useMembers, useOrders } from "../../src/hooks"
import { vnd, when } from "../../src/format"
import { Card, Empty, ErrorBox, Loading, SectionTitle, t } from "../../src/ui"
import { TopBar } from "../../src/chrome"

type Step = { at: string; source?: string; status?: string; biz_status?: string; partner_status?: string; sale_amount?: number }

function KV({ k, v, strong, onPress }: { k: string; v: string; strong?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text style={{ color: t.sub }}>{k}</Text>
      <Text style={{ flex: 1, textAlign: "right", color: onPress ? t.navy2 : strong ? t.gold : t.text, fontWeight: strong ? "800" : "600" }} numberOfLines={2}>{v}</Text>
    </Pressable>
  )
}

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
  const m = members.data?.find((x) => x.id === o.publisher_id)
  const customer = [o.fields?.customer_name, o.fields?.customer_phone].filter(Boolean).join(" · ")
  const copy = (v: string) => { void Clipboard.setStringAsync(v); Alert.alert("Đã sao chép", v) }
  const steps = [...(hist.data ?? [])].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
    <TopBar title="Chi tiết đơn" />
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: t.sub }}>Giá trị đơn</Text>
          <View style={{ backgroundColor: st.soft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}><Text style={{ color: st.color, fontWeight: "700", fontSize: 12 }}>{st.label}</Text></View>
        </View>
        <Text style={{ fontSize: 30, fontWeight: "800", color: t.text }}>{vnd(o.sale_amount)}</Text>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line }} />
        <KV k="Hoa hồng" v={vnd(o.publisher_commission)} strong />
        {o.tl_commission !== undefined ? <KV k="Hoa hồng TL" v={vnd(o.tl_commission)} /> : null}
        {o.am_commission !== undefined ? <KV k="Hoa hồng AM" v={vnd(o.am_commission)} /> : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <KV k="Mã đơn" v={orderCode(o) || "—"} onPress={orderCode(o) ? () => copy(orderCode(o)) : undefined} />
        <KV k="Chiến dịch" v={o.campaign_name || camp?.name || "—"} onPress={o.campaign_id ? () => router.push(`/campaign/${o.campaign_id}`) : undefined} />
        {o.fields?.product ? <KV k="Sản phẩm" v={o.fields.product} /> : null}
        {customer ? <KV k="Khách hàng" v={customer} /> : null}
        <KV k="Ngày phát sinh" v={when(o.created_at)} />
        {o.approved_on ? <KV k="Ngày duyệt / giải ngân" v={when(o.approved_on)} /> : null}
        {o.updated_at ? <KV k="Cập nhật" v={when(o.updated_at)} /> : null}
      </Card>

      {m ? (
        <Card style={{ gap: 10 }}>
          <KV k="Thành viên" v={m.name} onPress={() => router.push(`/members/${m.id}`)} />
          {m.rd_code ? <KV k="Mã RD" v={m.rd_code} /> : null}
          {m.team ? <KV k="Nhóm" v={m.team} /> : null}
          {m.region ? <KV k="Khu vực" v={m.region} /> : null}
          {m.team_lead_name ? <KV k="TeamLead" v={m.team_lead_name} /> : null}
          {m.am_name ? <KV k="AM" v={m.am_name} /> : null}
        </Card>
      ) : null}

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
