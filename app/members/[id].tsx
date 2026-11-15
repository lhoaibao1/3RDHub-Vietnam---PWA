import { Linking, Pressable, ScrollView, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { commissionOf, kycOf, memberState, orderCode, orderStatus, useCampaigns, useMembers, useOrders } from "../../src/hooks"
import { day, num, vnd, vndShort, when } from "../../src/format"
import { Avatar, Empty, Loading, t } from "../../src/ui"
import { TopBar, tap } from "../../src/chrome"
import { Chip2, Hero, InfoGroup, InfoRow, StatBar } from "../../src/detail"
import { Text } from "../../src/text"
import { shadow } from "../../src/theme"

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const q = useMembers()
  const orders = useOrders()
  const camps = useCampaigns()
  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Thành viên" /><Loading rows={3} /></View>
  const m = q.data?.find((x) => x.id === id)
  if (!m) return <View style={{ flex: 1 }}><TopBar title="Thành viên" /><Empty text="Không tìm thấy thành viên này." icon="person-outline" /></View>
  const mine = (orders.data ?? []).filter((o) => o.publisher_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const ok = mine.filter((o) => o.status === "approved" || o.status === "paid")
  const k = kycOf(m.kyc_status), state = memberState(m.status)
  const act = (icon: keyof typeof Ionicons.glyphMap, label: string, url: string) => (
    <Pressable onPress={() => { tap(); void Linking.openURL(url) }} style={({ pressed }) => [{ flex: 1, alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, paddingVertical: 10 }, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color="#fff" /><Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  )
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Thành viên" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Hero style={{ alignItems: "center" }}>
          <View style={{ padding: 4, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.25)" }}><Avatar url={m.avatar_url} name={m.name} size={84} /></View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }} numberOfLines={1}>{m.name}</Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {m.role ? <Chip2 label={m.role} bg={t.gold} /> : null}
            {m.rd_code ? <Chip2 label={`Mã ${m.rd_code}`} /> : null}
            <Chip2 label={k[0]} color={k[1]} bg="#fff" />
            {state ? <Chip2 label={state.label} color={state.tone === "bad" ? t.bad : t.warn} bg="#fff" /> : null}
          </View>
          {m.phone || m.email ? (
            <View style={{ flexDirection: "row", gap: 8, alignSelf: "stretch" }}>
              {m.phone ? act("call", "Gọi", `tel:${m.phone}`) : null}
              {m.phone ? act("chatbubble-ellipses", "Zalo", `https://zalo.me/${m.phone.replace(/\D/g, "")}`) : null}
              {m.email ? act("mail", "Email", `mailto:${m.email}`) : null}
            </View>
          ) : null}
        </Hero>
        <StatBar items={[{ k: "Số đơn", v: num(mine.length) }, { k: "Đơn duyệt", v: num(ok.length), color: t.ok }, { k: "Giá trị đơn", v: vndShort(mine.reduce((a, o) => a + (o.sale_amount || 0), 0)) }, { k: "Hoa hồng", v: vndShort(commissionOf(mine)), color: t.gold }]} />
        <InfoGroup title="Liên hệ">
          <InfoRow first icon="mail-outline" color="#2563EB" label="Email" value={m.email} copy={!!m.email} />
          <InfoRow icon="call-outline" color="#15803D" label="Số điện thoại" value={m.phone} copy={!!m.phone} />
          {m.created_at ? <InfoRow icon="calendar-outline" color="#6B7280" label="Ngày tham gia" value={day(m.created_at)} /> : null}
        </InfoGroup>
        <InfoGroup title="Tuyến quản lý">
          <InfoRow first icon="people-outline" color="#0F766E" label="Nhóm" value={m.team} />
          <InfoRow icon="map-outline" color="#B45309" label="Khu vực" value={m.region} />
          <InfoRow icon="shield-outline" color="#7C3AED" label="TeamLead" value={m.team_lead_name} />
          <InfoRow icon="briefcase-outline" color={t.navy2} label="AM" value={m.am_name} />
          {m.hod_name ? <InfoRow icon="ribbon-outline" color={t.gold} label="HOD" value={m.hod_name} /> : null}
        </InfoGroup>
        <View style={{ gap: 8 }}>
          <Text style={{ color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 6 }}>Đơn gần đây</Text>
          {mine.slice(0, 10).map((o) => {
            const st = orderStatus(o.status)
            return (
              <Pressable key={o.id} onPress={() => { tap(); router.push(`/order/${o.id}`) }} style={({ pressed }) => [{ backgroundColor: t.card, borderRadius: 16, padding: 12, gap: 6, ...shadow }, pressed && { opacity: 0.85 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ flex: 1, fontWeight: "700", color: t.text }} numberOfLines={1}>{camps.data?.find((c) => c.id === o.campaign_id)?.name || "Đơn hàng"}</Text>
                  <View style={{ backgroundColor: st.soft, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>{st.label}</Text></View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.sub, fontSize: 12 }}>{orderCode(o) || "Không có mã"} · {when(o.created_at)}</Text>
                    <Text style={{ color: t.text, fontWeight: "800", fontSize: 17 }}>{vnd(o.sale_amount)}</Text>
                  </View>
                  <Text style={{ color: t.gold, fontWeight: "700", fontSize: 13 }}>HH {vnd(o.publisher_commission)}</Text>
                </View>
              </Pressable>
            )
          })}
          {!mine.length ? <Text style={{ color: t.sub, marginLeft: 6 }}>Thành viên này chưa có đơn.</Text> : null}
        </View>
      </ScrollView>
    </View>
  )
}
