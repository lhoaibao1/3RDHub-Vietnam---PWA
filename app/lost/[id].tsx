import { ScrollView, View } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { lostStatus, useLost } from "../../src/hooks"
import { vnd, when } from "../../src/format"
import { Empty, Loading, t } from "../../src/ui"
import { TopBar } from "../../src/chrome"
import { Chip2, Hero, InfoGroup, InfoRow, Timeline } from "../../src/detail"
import { Text } from "../../src/text"
import { ymdVN } from "./index"

export default function LostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const q = useLost()
  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Phiếu báo đơn" /><Loading rows={3} /></View>
  const x = q.data?.find((r) => r.id === id)
  if (!x) return <View style={{ flex: 1 }}><TopBar title="Phiếu báo đơn" /><Empty text="Không tìm thấy phiếu này." icon="document-text-outline" /></View>
  const st = lostStatus(x)
  const steps = [...(x.history ?? [])].reverse()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Phiếu báo đơn" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Hero>
          <Text style={{ color: "#C9D6F5", fontSize: 12 }}>Phiếu {x.code}</Text>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }} numberOfLines={2}>{x.campaign_name || "Chưa rõ chiến dịch"}</Text>
          <View style={{ flexDirection: "row" }}><Chip2 label={st.label} color={st.color} bg="#fff" /></View>
          {x.sale_amount ? <View><Text style={{ color: "#C9D6F5", fontSize: 12 }}>Giá trị đơn</Text><Text style={{ color: "#fff", fontSize: 30, fontWeight: "800" }}>{vnd(x.sale_amount)}</Text></View> : null}
        </Hero>
        <InfoGroup title="Thông tin đơn">
          <InfoRow first icon="pricetag-outline" color="#7C3AED" label="Mã đơn" value={x.order_code} copy />
          <InfoRow icon="call-outline" color="#15803D" label="SĐT khách hàng" value={x.customer_phone} />
          <InfoRow icon="calendar-outline" color="#2563EB" label="Ngày phát sinh" value={ymdVN(x.occurred_at)} />
          {x.description ? <InfoRow icon="chatbox-ellipses-outline" color="#B45309" label="Mô tả" value={x.description} /> : null}
          {x.files?.length ? <InfoRow icon="attach-outline" color="#475569" label="Tệp đính kèm" value={`${x.files.length} tệp (xem trên bản web)`} /> : null}
        </InfoGroup>
        <InfoGroup title="Người báo">
          <InfoRow first icon="person-outline" color="#DB2777" label="Thành viên" value={x.reporter_name} sub={x.reporter_code} />
          <InfoRow icon="time-outline" color="#6B7280" label="Ngày báo" value={when(x.created_at)} />
        </InfoGroup>
        <View style={{ gap: 8 }}>
          <Text style={{ color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 6 }}>Lịch sử xử lý</Text>
          {steps.length ? <Timeline steps={steps.map((h) => ({ title: h.label || lostStatus({ status: h.status ?? "" }).label, color: lostStatus({ status: h.status ?? "" }).color, note: h.note, sub: [h.by, h.at ? when(h.at) : ""].filter(Boolean).join(" · ") }))} /> : <Text style={{ color: t.sub, marginLeft: 6 }}>Chưa có bước xử lý.</Text>}
        </View>
      </ScrollView>
    </View>
  )
}
