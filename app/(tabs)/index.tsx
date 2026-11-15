import { useState } from "react"
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text } from "../../src/text"
import { useRouter } from "expo-router"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { abs, api } from "../../src/api"
import { useAuth } from "../../src/auth"
import { BrandLogo } from "../../src/brand"
import { useCampaigns, useCan, useKycAdmin, useLost, useMembers, useUnread } from "../../src/hooks"
import { Glass, tap, useOwnScroll } from "../../src/chrome"
import { PromoPopup } from "../../src/promo"
import { compact, num, vnd, when } from "../../src/format"
import { rangeDays, rangeLabel } from "../../src/dates"
import { RangeSheet } from "../../src/rangesheet"
import { Art, Avatar, Card, ErrorBox, Pill, SectionTitle, t, PullRefresh } from "../../src/ui"
import { shadow } from "../../src/theme"
import { openSupport } from "../../src/support"

type Totals = { clicks: number; orders: number; approved: number; commission: number; sale: number; approval_rate: number | null }
type Overview = { buckets: string[]; totals: Totals; previous: Totals }
type Series = { buckets: string[]; series: { values: number[] }[] }
type Order = { id: string; campaign_id?: string; campaign_name?: string; external_order_id?: string; partner_order_id?: string; status: string; created_at: string; publisher_commission: number; sale_amount?: number }
type Banner = { id: string; image_url: string; link_url: string }

const W = Dimensions.get("window").width

function delta(now: number, before: number) {
  if (!before) return null
  const p = Math.round(((now - before) / before) * 100)
  return { text: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}%`, up: p >= 0 }
}

export default function Home() {
  const router = useRouter()
  const keep = useOwnScroll()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const unread = useUnread()
  const [range, setRange] = useState("7d")
  const [pick, setPick] = useState(false)
  const span = rangeDays(range)
  const q = `from=${span.from}&to=${span.to}`
  const ov = useQuery({ queryKey: ["overview", q], queryFn: () => api<{ data: Overview }>(`/api/v1/dashboard/overview?${q}`).then((r) => r.data) })
  const chart = useQuery({ queryKey: ["series", q], queryFn: () => api<{ data: Series }>(`/api/v1/dashboard/series?${q}&metric=orders&group=none`).then((r) => r.data) })
  const recent = useQuery({ queryKey: ["orders", "recent"], queryFn: () => api<{ data: Order[] }>("/api/v1/conversions?limit=5").then((r) => r.data) })
  const banners = useQuery({ queryKey: ["banners"], queryFn: () => api<{ data: Banner[] }>("/api/v1/catalog-banners").then((r) => r.data ?? []) })
  const camps = useCampaigns()
  const members = useMembers()
  const can = useCan()
  const lost = useLost()
  const kyc = useKycAdmin()

  const name = user?.display_name || user?.email?.split("@")[0] || ""
  const hour = new Date().getHours()
  const hello = hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối"
  const refresh = () => Promise.all([ov.refetch(), chart.refetch(), recent.refetch(), banners.refetch(), camps.refetch()])

  const t0 = ov.data?.totals, p0 = ov.data?.previous
  const bars = chart.data?.series[0]?.values ?? []
  const max = Math.max(1, ...bars)
  const hot = (camps.data ?? []).filter((c) => c.offer?.highlights?.some((h) => ["hot", "featured", "top_pay"].includes(h))).concat(camps.data ?? []).filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i).slice(0, 8)

  const openBanner = (b: Banner) => {
    const l = b.link_url || ""
    const m = l.match(/\/campaigns\/([^/?#]+)/)
    if (m) router.push(`/campaign/${m[1]}`)
    else if (/^https?:/.test(l)) void Linking.openURL(l)
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" {...keep} style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 110 }} refreshControl={<PullRefresh run={refresh} />}>
      <LinearGradient colors={[t.brand, t.brand2]} style={[s.hero, { paddingTop: insets.top + 12 }]}>
        <View style={s.heroTop}>
          <BrandLogo light width={112} height={21} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => { tap(); router.push("/find") }} accessibilityLabel="Tìm kiếm">
            <Glass clear interactive style={s.bell}><Ionicons name="search" size={21} color="#fff" /></Glass>
          </Pressable>
          <Pressable onPress={() => openSupport()}  accessibilityLabel="Nhóm hỗ trợ">
            <Glass clear interactive style={s.bell}><Ionicons name="headset-outline" size={21} color="#fff" /></Glass>
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} >
            <Glass clear interactive style={s.bell}><Ionicons name="notifications-outline" size={22} color="#fff" /></Glass>
            {(unread.data || 0) > 0 ? <View style={s.dot}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{Math.min(unread.data || 0, 99)}</Text></View> : null}
          </Pressable>
        </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
  <Pressable onPress={() => router.push("/(tabs)/account")} style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <Avatar url={user?.avatar_url} name={name} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#C9D6F5", fontSize: 13 }}>{hello}</Text>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }} numberOfLines={1}>{name}</Text>
          </View>
        </Pressable>
          <Pressable onPress={() => { tap(); setPick(true) }}>
            <Glass clear interactive style={s.range}><Ionicons name="calendar-outline" size={15} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }} numberOfLines={1}>{rangeLabel(range)}</Text></Glass>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={{ padding: 16, gap: 14 }}>
        {ov.isError ? <ErrorBox error={ov.error} retry={() => ov.refetch()} /> : (
          <View style={s.grid}>
            {[
              { icon: "cart-outline", label: "Đơn hàng", value: num(t0?.orders), d: t0 && p0 ? delta(t0.orders, p0.orders) : null },
              { icon: "checkmark-done-outline", label: "Đơn đã duyệt", value: num(t0?.approved), d: t0 && p0 ? delta(t0.approved, p0.approved) : null },
              { icon: "cash-outline", label: "Giá trị đơn", value: compact(t0?.sale), d: t0 && p0 ? delta(t0.sale, p0.sale) : null },
              { icon: "hand-left-outline", label: "Lượt click", value: num(t0?.clicks), d: t0 && p0 ? delta(t0.clicks, p0.clicks) : null },
            ].map((x) => (
              <Card key={x.label} style={s.tile}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name={x.icon as never} size={16} color={t.gold} /><Text style={s.tileLabel}>{x.label}</Text></View>
                <Text style={s.tileValue}>{x.value}</Text>
                {x.d ? <Text style={{ color: x.d.up ? t.ok : t.bad, fontSize: 12, fontWeight: "700" }}>{x.d.text}</Text> : null}
              </Card>
            ))}
          </View>
        )}

        {bars.length > 1 ? (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700", color: t.text }}>Đơn theo ngày</Text>
              <Text style={{ color: t.sub, fontSize: 12 }}>{rangeLabel(range)}</Text>
            </View>
            <View style={s.bars}>
              {bars.slice(-31).map((v, i, a) => <View key={i} style={{ flex: 1, height: Math.max(3, (v / max) * 64), backgroundColor: i === a.length - 1 ? t.gold : t.navy2, opacity: i === a.length - 1 ? 1 : 0.55, borderRadius: 3 }} />)}
            </View>
          </Card>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            { icon: "link", label: "Link của tôi", to: "/links", on: true },
            { icon: "analytics", label: "Báo cáo click", to: "/clicks", on: can("clicks.read") },
            { icon: "alert-circle", label: "Đơn thất lạc", to: "/lost", on: lost.on },
            { icon: "people", label: "Thành viên", to: "/members", on: members.on },
            { icon: "shield-checkmark", label: "Duyệt định danh", to: "/kyc", on: kyc.on, badge: kyc.data?.filter((x) => x.kyc.status === "pending").length },
            { icon: "wallet", label: "Rút tiền", to: "/(tabs)/wallet", on: true },
            { icon: "megaphone", label: "Chiến dịch", to: "/(tabs)/campaigns", on: true },
            { icon: "headset", label: "Hỗ trợ", to: "zalo", on: true },
          ].filter((a) => a.on).map((a) => (
            <Pressable key={a.label} onPress={() => { tap(); if (a.to === "zalo") openSupport(); else router.push(a.to as never) }} style={({ pressed }) => [s.quick, pressed && { opacity: 0.8 }]}>
              <View style={s.quickIcon}><Ionicons name={a.icon as never} size={20} color={t.navy} />{a.badge ? <View style={s.qbadge}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{a.badge}</Text></View> : null}</View>
              <Text style={{ fontWeight: "600", fontSize: 11, color: t.text, textAlign: "center" }} numberOfLines={1}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {(banners.data?.length ?? 0) > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={W - 32 + 10} decelerationRate="fast" contentContainerStyle={{ gap: 10 }}>
            {banners.data!.map((b) => (
              <Pressable key={b.id} onPress={() => openBanner(b)}>
                <Image source={{ uri: abs(b.image_url) }} style={{ width: W - 32, height: (W - 32) * 0.42, borderRadius: 16 }} contentFit="cover" transition={200} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <SectionTitle title="Chiến dịch nổi bật" action="Xem tất cả" onAction={() => router.push("/(tabs)/campaigns")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {hot.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/campaign/${c.id}`)} style={s.hot}>
              <Art url={c.offer?.thumb_url || c.offer?.banner_url} name={c.name} style={{ width: "100%", height: 96 }} />
              <View style={{ padding: 10, gap: 4 }}>
                <Text style={{ fontWeight: "800", color: t.text }} numberOfLines={2}>{c.name}</Text>
                {c.offer?.category ? <Pill label={c.offer.category} tone="gold" /> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title="Đơn gần đây" action="Xem tất cả" onAction={() => router.push("/(tabs)/orders")} />
        {(recent.data ?? []).map((o) => (
          <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Art url={camps.data?.find((c) => c.id === o.campaign_id)?.offer?.thumb_url} name={o.campaign_name} style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden" }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{o.campaign_name || o.external_order_id || "Đơn hàng"}</Text>
              <Text style={{ color: t.sub, fontSize: 12 }}>{when(o.created_at)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontWeight: "800", color: t.text }}>{vnd(o.sale_amount)}</Text>
            </View>
          </Card>
          </Pressable>
        ))}
        {recent.data && !recent.data.length ? <Text style={{ color: t.sub }}>Chưa có đơn hàng nào.</Text> : null}
      </View>
      <RangeSheet open={pick} value={range} onPick={setRange} onClose={() => setPick(false)} />
      <PromoPopup />
    </ScrollView>
  )
}
const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  bell: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  dot: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: t.bad, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 66 },
  range: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, overflow: "hidden", maxWidth: 170 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, flexBasis: "46%", gap: 3 },
  tileLabel: { color: t.sub, fontSize: 12 },
  tileValue: { fontSize: 22, fontWeight: "900", color: t.text },
  quick: { width: (W - 32 - 30) / 4, backgroundColor: t.card, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 2, alignItems: "center", gap: 6, ...shadow },
  qbadge: { position: "absolute", top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: t.bad, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" },
  hot: { width: 168, backgroundColor: t.card, borderRadius: 16, overflow: "hidden", ...shadow },
})
