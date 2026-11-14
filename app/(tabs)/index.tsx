import { useState } from "react"
import { Dimensions, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { abs, api } from "../../src/api"
import { useAuth } from "../../src/auth"
import { useCampaigns, useMembers, useUnread } from "../../src/hooks"
import { compact, num, vnd, when, ymd } from "../../src/format"
import { Art, Avatar, Card, Chip, ErrorBox, Pill, SectionTitle, t } from "../../src/ui"
import { shadow } from "../../src/theme"

type Totals = { clicks: number; orders: number; approved: number; commission: number; sale: number; approval_rate: number | null }
type Overview = { buckets: string[]; totals: Totals; previous: Totals }
type Series = { buckets: string[]; series: { values: number[] }[] }
type Order = { id: string; campaign_name?: string; external_order_id?: string; status: string; created_at: string; publisher_commission: number }
type Banner = { id: string; image_url: string; link_url: string }

const RANGES = [{ k: "today", label: "Hôm nay", days: 0 }, { k: "7d", label: "7 ngày", days: 6 }, { k: "30d", label: "30 ngày", days: 29 }] as const
const W = Dimensions.get("window").width

function delta(now: number, before: number) {
  if (!before) return null
  const p = Math.round(((now - before) / before) * 100)
  return { text: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}%`, up: p >= 0 }
}

export default function Home() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const unread = useUnread()
  const [range, setRange] = useState<(typeof RANGES)[number]["k"]>("7d")
  const days = RANGES.find((r) => r.k === range)!.days
  const q = `from=${ymd(new Date(Date.now() - days * 86400000))}&to=${ymd(new Date())}`
  const ov = useQuery({ queryKey: ["overview", q], queryFn: () => api<{ data: Overview }>(`/api/v1/dashboard/overview?${q}`).then((r) => r.data) })
  const chart = useQuery({ queryKey: ["series", q], queryFn: () => api<{ data: Series }>(`/api/v1/dashboard/series?${q}&metric=commission&group=none`).then((r) => r.data) })
  const recent = useQuery({ queryKey: ["orders", "recent"], queryFn: () => api<{ data: Order[] }>("/api/v1/conversions?limit=5").then((r) => r.data) })
  const banners = useQuery({ queryKey: ["banners"], queryFn: () => api<{ data: Banner[] }>("/api/v1/catalog-banners").then((r) => r.data ?? []) })
  const camps = useCampaigns()
  const members = useMembers()

  const name = user?.display_name || user?.email?.split("@")[0] || ""
  const hour = new Date().getHours()
  const hello = hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối"
  const refresh = () => { void ov.refetch(); void chart.refetch(); void recent.refetch(); void banners.refetch(); void camps.refetch() }

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
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={ov.isFetching && !ov.isPending} onRefresh={refresh} tintColor={t.navy} />}>
      <LinearGradient colors={[t.navy, t.navy2]} style={[s.hero, { paddingTop: insets.top + 12 }]}>
        <View style={s.heroTop}>
          <Pressable onPress={() => router.push("/(tabs)/account")} style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <Avatar url={user?.avatar_url} name={name} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#C9D6F5", fontSize: 13 }}>{hello}</Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }} numberOfLines={1}>{name}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} style={s.bell}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {(unread.data || 0) > 0 ? <View style={s.dot}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{Math.min(unread.data || 0, 99)}</Text></View> : null}
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {RANGES.map((r) => <Chip key={r.k} label={r.label} on={range === r.k} onPress={() => setRange(r.k)} />)}
        </View>
        <View style={{ marginTop: 14 }}>
          <Text style={{ color: "#C9D6F5" }}>Hoa hồng {RANGES.find((r) => r.k === range)!.label.toLowerCase()}</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
            <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900" }}>{ov.isPending ? "—" : vnd(t0?.commission)}</Text>
            {t0 && p0 && delta(t0.commission, p0.commission) ? <Text style={{ color: delta(t0.commission, p0.commission)!.up ? "#86EFAC" : "#FCA5A5", fontWeight: "800", marginBottom: 6 }}>{delta(t0.commission, p0.commission)!.text}</Text> : null}
          </View>
        </View>
        <View style={s.bars}>
          {bars.length ? bars.map((v, i) => <View key={i} style={{ flex: 1, height: Math.max(3, (v / max) * 56), backgroundColor: i === bars.length - 1 ? t.gold : "rgba(255,255,255,0.45)", borderRadius: 3 }} />) : <Text style={{ color: "#C9D6F5", fontSize: 12 }}>Chưa có dữ liệu biểu đồ</Text>}
        </View>
      </LinearGradient>

      <View style={{ padding: 16, gap: 14 }}>
        {ov.isError ? <ErrorBox error={ov.error} retry={() => ov.refetch()} /> : (
          <View style={s.grid}>
            {[
              { icon: "hand-left-outline", label: "Lượt click", value: num(t0?.clicks), d: t0 && p0 ? delta(t0.clicks, p0.clicks) : null },
              { icon: "cart-outline", label: "Đơn hàng", value: num(t0?.orders), d: t0 && p0 ? delta(t0.orders, p0.orders) : null },
              { icon: "checkmark-done-outline", label: "Đơn đã duyệt", value: num(t0?.approved), d: t0 && p0 ? delta(t0.approved, p0.approved) : null },
              { icon: "pie-chart-outline", label: "Doanh số", value: compact(t0?.sale), d: t0 && p0 ? delta(t0.sale, p0.sale) : null },
            ].map((x) => (
              <Card key={x.label} style={s.tile}>
                <Ionicons name={x.icon as never} size={18} color={t.gold} />
                <Text style={s.tileLabel}>{x.label}</Text>
                <Text style={s.tileValue}>{x.value}</Text>
                {x.d ? <Text style={{ color: x.d.up ? t.ok : t.bad, fontSize: 12, fontWeight: "700" }}>{x.d.text}</Text> : null}
              </Card>
            ))}
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[{ icon: "link", label: "Link của tôi", to: "/links" }, { icon: "megaphone", label: "Chiến dịch", to: "/(tabs)/campaigns" }, ...(members.on ? [{ icon: "people", label: "Thành viên", to: "/members" }] : []), { icon: "wallet", label: "Rút tiền", to: "/(tabs)/wallet" }].map((a) => (
            <Pressable key={a.label} onPress={() => router.push(a.to as never)} style={s.quick}>
              <View style={s.quickIcon}><Ionicons name={a.icon as never} size={20} color={t.navy} /></View>
              <Text style={{ fontWeight: "700", fontSize: 12, color: t.text }}>{a.label}</Text>
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
            <View style={s.orderIcon}><Ionicons name="receipt-outline" size={18} color={t.navy} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{o.campaign_name || o.external_order_id || "Đơn hàng"}</Text>
              <Text style={{ color: t.sub, fontSize: 12 }}>{when(o.created_at)}</Text>
            </View>
            <Text style={{ fontWeight: "800", color: t.ok }}>+{vnd(o.publisher_commission)}</Text>
          </Card>
          </Pressable>
        ))}
        {recent.data && !recent.data.length ? <Text style={{ color: t.sub }}>Chưa có đơn hàng nào.</Text> : null}
      </View>
    </ScrollView>
  )
}
const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: t.bad, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 60, marginTop: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, flexBasis: "46%", gap: 3 },
  tileLabel: { color: t.sub, fontSize: 12 },
  tileValue: { fontSize: 22, fontWeight: "900", color: t.text },
  quick: { flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 12, alignItems: "center", gap: 6, ...shadow },
  quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" },
  hot: { width: 168, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", ...shadow },
  orderIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" },
})
