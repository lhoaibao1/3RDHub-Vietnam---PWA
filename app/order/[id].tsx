import { ScrollView, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { api, ApiError } from "../../src/api"
import { orderCode, orderStatus, useCampaigns, useMembers, useOrders } from "../../src/hooks"
import { vnd, when } from "../../src/format"
import { Art, Empty, ErrorBox, Loading, t } from "../../src/ui"
import { TopBar } from "../../src/chrome"
import { Chip2, copyText, Hero, HeroStat, InfoGroup, InfoRow, Timeline } from "../../src/detail"
import { Text } from "../../src/text"

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
  if (orders.isPending) return <View style={{ flex: 1 }}><TopBar title="Chi tiết đơn" /><Loading rows={3} /></View>
  if (orders.isError) return <View style={{ flex: 1 }}><TopBar title="Chi tiết đơn" /><ErrorBox error={orders.error} retry={() => orders.refetch()} /></View>
  const o = orders.data.find((x) => x.id === id)
  if (!o) return <View style={{ flex: 1 }}><TopBar title="Chi tiết đơn" /><Empty text="Không tìm thấy đơn này (có thể đã bị xoá hoặc ngoài phạm vi của bạn)." icon="search-outline" /></View>
  const st = orderStatus(o.status)
  const camp = camps.data?.find((c) => c.id === o.campaign_id)
  const m = members.data?.find((x) => x.id === o.publisher_id)
  const customer = [o.fields?.customer_name, o.fields?.customer_phone].filter(Boolean).join(" · ")
  const code = orderCode(o)
  const name = o.campaign_name || camp?.name || "Đơn hàng"
  const steps = [...(hist.data ?? [])].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Chi tiết đơn" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Hero>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Art url={camp?.offer?.thumb_url || camp?.offer?.banner_url} name={name} style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden" }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }} numberOfLines={2}>{name}</Text>
              <Text style={{ color: "#C9D6F5", fontSize: 12, marginTop: 2 }} numberOfLines={1}>{code || "Không có mã"}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <Chip2 label={st.label} color={st.color} bg="#fff" />
            {o.fields?.product ? <Chip2 label={o.fields.product} /> : null}
          </View>
          <View>
            <Text style={{ color: "#C9D6F5", fontSize: 12 }}>Giá trị đơn</Text>
            <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800" }} numberOfLines={1} adjustsFontSizeToFit>{vnd(o.sale_amount)}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <HeroStat k="Hoa hồng" v={vnd(o.publisher_commission)} accent />
            {o.tl_commission !== undefined ? <HeroStat k="Hoa hồng TL" v={vnd(o.tl_commission)} /> : null}
            {o.am_commission !== undefined ? <HeroStat k="Hoa hồng AM" v={vnd(o.am_commission)} /> : null}
          </View>
        </Hero>

        <InfoGroup title="Thông tin đơn">
          <InfoRow first icon="pricetag-outline" color="#7C3AED" label="Mã đơn" value={code} copy />
          <InfoRow icon="megaphone-outline" color={t.gold} label="Chiến dịch" value={name} onPress={o.campaign_id ? () => router.push(`/campaign/${o.campaign_id}`) : undefined} />
          {o.fields?.product ? <InfoRow icon="cube-outline" color="#0F766E" label="Sản phẩm" value={o.fields.product} /> : null}
          {customer ? <InfoRow icon="person-circle-outline" color="#2563EB" label="Khách hàng" value={customer} /> : null}
        </InfoGroup>

        <InfoGroup title="Thời gian">
          <InfoRow first icon="calendar-outline" color="#2563EB" label="Ngày phát sinh" value={when(o.created_at)} />
          {o.approved_on ? <InfoRow icon="checkmark-done-outline" color="#15803D" label="Ngày duyệt / giải ngân" value={when(o.approved_on)} /> : null}
          {o.updated_at ? <InfoRow icon="refresh-outline" color="#6B7280" label="Cập nhật gần nhất" value={when(o.updated_at)} /> : null}
        </InfoGroup>

        {m ? (
          <InfoGroup title="Người phụ trách">
            <InfoRow first icon="person-outline" color="#DB2777" label="Thành viên" value={m.name} sub={m.rd_code} onPress={() => router.push(`/members/${m.id}`)} />
            {m.team || m.region ? <InfoRow icon="people-outline" color="#0F766E" label="Nhóm · Khu vực" value={[m.team, m.region].filter(Boolean).join(" · ")} /> : null}
            {m.team_lead_name ? <InfoRow icon="shield-outline" color="#B45309" label="TeamLead" value={m.team_lead_name} /> : null}
            {m.am_name ? <InfoRow icon="briefcase-outline" color={t.navy2} label="AM" value={m.am_name} /> : null}
          </InfoGroup>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={{ color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 6 }}>Lịch sử xử lý</Text>
          {hist.isPending ? <Loading rows={1} /> : hist.isError ? (
            <Text style={{ color: t.sub, marginLeft: 6 }}>{hist.error instanceof ApiError && hist.error.status === 403 ? "Bạn chưa có quyền xem lịch sử đơn." : "Chưa xem được lịch sử đơn."}</Text>
          ) : steps.length ? (
            <Timeline steps={steps.map((x) => ({
              title: x.status ? orderStatus(x.status).label : x.biz_status || x.partner_status || "Cập nhật",
              color: x.status ? orderStatus(x.status).color : undefined,
              note: [x.partner_status && x.status ? `Đối tác: ${x.partner_status}` : "", x.sale_amount != null ? `Giá trị đơn ${vnd(x.sale_amount)}` : ""].filter(Boolean).join(" · ") || undefined,
              sub: `${x.source === "partner" ? "Đối tác" : "Hệ thống"} · ${when(x.at)}`,
            }))} />
          ) : <Text style={{ color: t.sub, marginLeft: 6 }}>Chưa có bước xử lý nào.</Text>}
        </View>
        {code ? <Text onPress={() => copyText(o.id, "Đã sao chép mã hệ thống")} style={{ color: t.sub, fontSize: 11, textAlign: "center" }}>Mã hệ thống: {o.id}</Text> : null}
      </ScrollView>
    </View>
  )
}
