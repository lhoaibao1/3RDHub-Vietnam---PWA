import { Linking, Pressable, ScrollView, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { kycOf, memberState, orderStatus, useMembers, useOrders } from "../../src/hooks"
import { day, num, vnd, vndShort, when } from "../../src/format"
import { Avatar, Card, Empty, Loading, Pill, Row, SectionTitle, t } from "../../src/ui"

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const q = useMembers()
  const orders = useOrders()
  if (q.isPending) return <Loading />
  const m = q.data?.find((x) => x.id === id)
  if (!m) return <Empty text="Không tìm thấy thành viên này." icon="person-outline" />
  const mine = (orders.data ?? []).filter((o) => o.publisher_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const comm = mine.reduce((a, o) => a + (o.publisher_commission || 0), 0)
  const ok = mine.filter((o) => o.status === "approved" || o.status === "paid")
  const k = kycOf(m.kyc_status)
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 20 }}>
        <Avatar url={m.avatar_url} name={m.name} size={84} />
        <Text style={{ fontSize: 20, fontWeight: "900", color: t.text }}>{m.name}</Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {m.role ? <Pill label={m.role} tone="navy" /> : null}
          <View style={{ backgroundColor: k[2], borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: k[1], fontSize: 11, fontWeight: "700" }}>{k[0]}</Text></View>
          {memberState(m.status) ? <Pill label={memberState(m.status)!.label} tone={memberState(m.status)!.tone} /> : null}
        </View>
      </Card>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1, gap: 2 }}><Text style={{ color: t.sub, fontSize: 11 }}>Số đơn</Text><Text style={{ fontSize: 18, fontWeight: "900", color: t.text }}>{num(mine.length)}</Text></Card>
        <Card style={{ flex: 1, gap: 2 }}><Text style={{ color: t.sub, fontSize: 11 }}>Đơn duyệt</Text><Text style={{ fontSize: 18, fontWeight: "900", color: t.ok }}>{num(ok.length)}</Text></Card>
        <Card style={{ flex: 1.4, gap: 2 }}><Text style={{ color: t.sub, fontSize: 11 }}>Hoa hồng</Text><Text style={{ fontSize: 18, fontWeight: "900", color: t.gold }} numberOfLines={1}>{vndShort(comm)}</Text></Card>
      </View>
      <Card style={{ paddingVertical: 6 }}>
        <Row icon="id-card-outline" label="Mã RD" value={m.rd_code || "—"} />
        {m.uid_code ? <Row icon="finger-print-outline" label="Mã UID" value={m.uid_code} /> : null}
        <Row icon="mail-outline" label="Email" value={m.email || "—"} onPress={m.email ? () => Linking.openURL(`mailto:${m.email}`) : undefined} />
        <Row icon="call-outline" label="Điện thoại" value={m.phone || "—"} onPress={m.phone ? () => Linking.openURL(`tel:${m.phone}`) : undefined} />
        {m.created_at ? <Row icon="calendar-outline" label="Tham gia" value={day(m.created_at)} /> : null}
      </Card>
      <Card style={{ paddingVertical: 6 }}>
        {m.team ? <Row icon="people-outline" label="Nhóm" value={m.team} /> : null}
        {m.region ? <Row icon="map-outline" label="Khu vực" value={m.region} /> : null}
        {m.team_lead_name ? <Row icon="person-outline" label="TeamLead" value={m.team_lead_name} /> : null}
        {m.am_name ? <Row icon="briefcase-outline" label="AM" value={m.am_name} /> : null}
        {m.hod_name ? <Row icon="ribbon-outline" label="HOD" value={m.hod_name} /> : null}
        {!m.team && !m.team_lead_name && !m.am_name && !m.hod_name ? <Row icon="git-network-outline" label="Tuyến quản lý" value="Chưa có" /> : null}
      </Card>
      <SectionTitle title="Đơn gần đây" />
      {mine.slice(0, 10).map((o) => {
        const st = orderStatus(o.status)
        return (
          <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{o.external_order_id ? `#${o.external_order_id}` : "Đơn hàng"}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }}>{when(o.created_at)}</Text>
              </View>
              <Text style={{ color: st.color, fontWeight: "800", fontSize: 12 }}>{st.label}</Text>
              <Text style={{ fontWeight: "900", color: t.text }}>{vnd(o.publisher_commission)}</Text>
            </Card>
          </Pressable>
        )
      })}
      {!mine.length ? <Text style={{ color: t.sub }}>Thành viên này chưa có đơn.</Text> : null}
    </ScrollView>
  )
}
