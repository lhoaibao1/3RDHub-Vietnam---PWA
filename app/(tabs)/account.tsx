import { useMemo } from "react"
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View, Platform } from "react-native"
import { Text } from "../../src/text"
import { useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import Constants from "expo-constants"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "../../src/auth"
import { api, API_URL } from "../../src/api"
import { BrandLogo } from "../../src/brand"
import { commissionOf, KYC_STATE, useCan, useKycAdmin, useLost, useMe, useMembers, useOrders, useUnread } from "../../src/hooks"
import { ZALO_SUPPORT } from "../../src/links"
import { num, vndShort } from "../../src/format"
import { Avatar, t } from "../../src/ui"
import { GlassButton, tap } from "../../src/chrome"
import { shadow } from "../../src/theme"

type Item = { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; value?: string; badge?: number; onPress: () => void }

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.group}>
        {items.map((it, i) => (
          <Pressable key={it.label} onPress={() => { tap(); it.onPress() }} style={({ pressed }) => [s.item, i > 0 && s.itemLine, pressed && { backgroundColor: t.bg }]}>
            <View style={[s.icon, { backgroundColor: it.color + "1A" }]}><Ionicons name={it.icon} size={19} color={it.color} /></View>
            <Text style={s.itemText}>{it.label}</Text>
            {it.badge ? <View style={s.badge}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{it.badge}</Text></View> : null}
            {it.value ? <Text style={s.itemVal} numberOfLines={1}>{it.value}</Text> : null}
            <Ionicons name="chevron-forward" size={16} color={t.sub} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default function Account() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const me = useMe()
  const unread = useUnread()
  const members = useMembers()
  const can = useCan()
  const lost = useLost()
  const kyc = useKycAdmin()
  const line = me.data?.me
  const pendingKyc = kyc.data?.filter((x) => x.kyc.status === "pending").length || 0
  const orders = useOrders()
  const ownKyc = useQuery({ queryKey: ["own-kyc"], queryFn: () => api<{ data: { status: string } }>("/api/v1/tenant/account/kyc").then((r) => r.data), retry: false })
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => api<{ data: { balance?: { available: number } } }>("/api/v1/wallet").then((r) => r.data), retry: false })
  const name = user?.display_name || user?.email || ""
  const code = me.data?.me?.rd_code
  const month = useMemo(() => {
    const d = new Date(), from = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    const rows = (orders.data ?? []).filter((o) => new Date(o.created_at).getTime() >= from)
    return { n: rows.length, comm: commissionOf(rows) }
  }, [orders.data])
  const copyCode = () => { if (code) { void Clipboard.setStringAsync(code); Alert.alert("Đã sao chép mã", code) } }
  const askLogout = () => Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [{ text: "Hủy", style: "cancel" }, { text: "Đăng xuất", style: "destructive", onPress: () => void logout() }])

  return (
    <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 110 }}>
      <LinearGradient colors={[t.navy, t.navy2]} style={[s.hero, { paddingTop: insets.top + 20 }]}>
        <View style={[s.ring, { width: 240, height: 240, top: -90, right: -80 }]} />
        <View style={[s.ring, { width: 140, height: 140, bottom: -40, left: -50, borderColor: "rgba(255,106,43,0.35)" }]} />
        <View style={{ position: "absolute", right: 14, top: insets.top + 6, flexDirection: "row", gap: 8 }}><GlassButton icon="search" label="Tìm kiếm" onPress={() => router.push("/find")} /><GlassButton icon="settings-outline" label="Cài đặt" onPress={() => router.push("/settings")} /></View>
        <Pressable onPress={() => { tap(); router.push("/profile") }} style={s.avatarWrap}>
          <Avatar url={user?.avatar_url} name={name} size={88} />
          <View style={s.cam}><Ionicons name="camera" size={14} color="#fff" /></View>
        </Pressable>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        {user?.display_name ? <Text style={{ color: "#C9D6F5" }} numberOfLines={1}>{user.email}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {me.data?.role_name ? <View style={s.chipGold}><Ionicons name="ribbon" size={12} color="#fff" /><Text style={s.chipText}>{me.data.role_name}</Text></View> : null}
          {code ? <Pressable onPress={copyCode} style={s.chipGlass}><Text style={s.chipText}>Mã {code}</Text><Ionicons name="copy-outline" size={12} color="#fff" /></Pressable> : null}
        </View>
      </LinearGradient>

      <View style={s.stats}>
        <Pressable onPress={() => router.push("/(tabs)/wallet")} style={s.stat}><Text style={s.statK}>Số dư ví</Text><Text style={[s.statV, { color: t.navy }]} numberOfLines={1}>{wallet.data?.balance ? vndShort(wallet.data.balance.available) : "—"}</Text></Pressable>
        <View style={s.statLine} />
        <Pressable onPress={() => router.push("/(tabs)/orders")} style={s.stat}><Text style={s.statK}>HH tháng này</Text><Text style={[s.statV, { color: t.gold }]} numberOfLines={1}>{vndShort(month.comm)}</Text></Pressable>
        <View style={s.statLine} />
        <Pressable onPress={() => router.push("/(tabs)/orders")} style={s.stat}><Text style={s.statK}>Đơn tháng này</Text><Text style={s.statV}>{num(month.n)}</Text></Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        <Group title="Tài khoản" items={[
          { icon: "person", color: "#2563EB", label: "Thông tin cá nhân", onPress: () => router.push("/profile") },
          { icon: "wallet", color: "#15803D", label: "Ví & rút tiền", onPress: () => router.push("/(tabs)/wallet") },
          { icon: "shield-checkmark", color: "#0F766E", label: "Định danh eKYC", value: KYC_STATE[ownKyc.data?.status ?? ""]?.label ?? "", onPress: () => router.push("/ekyc") },
          ...(code ? [{ icon: "qr-code" as const, color: "#7C3AED", label: "Mã Publisher", value: code, onPress: copyCode }] : []),
        ]} />
        <Group title="Kinh doanh" items={[
          { icon: "link", color: t.gold, label: "Link giới thiệu của tôi", onPress: () => router.push("/links") },
          { icon: "receipt", color: "#0F766E", label: "Đơn hàng", onPress: () => router.push("/(tabs)/orders") },
          ...(can("clicks.read") ? [{ icon: "analytics" as const, color: "#2563EB", label: "Báo cáo click", onPress: () => router.push("/clicks") }] : []),
          ...(lost.on ? [{ icon: "alert-circle" as const, color: "#B45309", label: "Báo đơn thất lạc", value: lost.data?.length ? `${lost.data.length} phiếu` : "", onPress: () => router.push("/lost") }] : []),
          ...(members.on ? [{ icon: "people" as const, color: "#DB2777", label: "Thành viên", value: members.data ? `${members.data.length} người` : "", onPress: () => router.push("/members") }] : []),
          ...(kyc.on ? [{ icon: "shield-checkmark" as const, color: "#15803D", label: "Duyệt định danh", badge: pendingKyc, onPress: () => router.push("/kyc") }] : []),
        ]} />
        {line?.team_lead_name || line?.am_name ? (
          <View style={{ gap: 8 }}>
            <Text style={s.groupTitle}>Quản lý của tôi</Text>
            <View style={s.group}>
              {([["TeamLead", line.team_lead_name, line.team_lead_phone], ["AM", line.am_name, line.am_phone]] as const).filter((x) => x[1]).map(([role, n, phone], i) => (
                <View key={role} style={[s.item, i > 0 && s.itemLine]}>
                  <Avatar name={n} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{n}</Text>
                    <Text style={{ color: t.sub, fontSize: 12 }}>{role}{phone ? ` · ${phone}` : ""}</Text>
                  </View>
                  {phone ? (
                    <>
                      <Pressable onPress={() => { tap(); void Linking.openURL(`tel:${phone}`) }} style={[s.round, { backgroundColor: t.okSoft }]}><Ionicons name="call" size={17} color={t.ok} /></Pressable>
                      <Pressable onPress={() => { tap(); void Linking.openURL(`https://zalo.me/${phone.replace(/\D/g, "")}`) }} style={[s.round, { backgroundColor: "#E3ECFD" }]}><Ionicons name="chatbubble-ellipses" size={17} color="#0068FF" /></Pressable>
                    </>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <Group title="Hỗ trợ & ứng dụng" items={[
          { icon: "notifications", color: "#D97706", label: "Thông báo", badge: unread.data || 0, onPress: () => router.push("/notifications") },
          { icon: "chatbubbles", color: "#0068FF", label: "Nhóm Zalo hỗ trợ", onPress: () => void Linking.openURL(ZALO_SUPPORT) },
          { icon: "settings", color: "#475569", label: "Cài đặt", onPress: () => router.push("/settings") },
          ...(Platform.OS !== "web" ? [{ icon: "globe" as const, color: t.navy2, label: "Mở bản web", onPress: () => void Linking.openURL(API_URL) }] : []),
        ]} />
        <Pressable onPress={askLogout} style={({ pressed }) => [s.logout, pressed && { opacity: 0.8 }]}>
          <Ionicons name="log-out-outline" size={19} color={t.bad} /><Text style={{ color: t.bad, fontWeight: "800" }}>Đăng xuất</Text>
        </Pressable>
        <View style={{ alignItems: "center", gap: 6, marginTop: 4 }}>
          <BrandLogo width={150} height={28} style={{ opacity: 0.85 }} />
          <Text style={{ color: t.sub, fontSize: 12 }}>v{Constants.expoConfig?.version}</Text>
          <Text selectable style={{ color: t.sub, fontSize: 11 }}>Bản cập nhật: {(process.env.EXPO_PUBLIC_BUILD_SHA || "chạy thử trên máy").slice(0, 7)}{process.env.EXPO_PUBLIC_BUILD_AT ? ` · ${new Date(process.env.EXPO_PUBLIC_BUILD_AT).toLocaleString("vi-VN")}` : ""}</Text>
        </View>
      </View>
    </ScrollView>
  )
}
const s = StyleSheet.create({
  hero: { alignItems: "center", paddingBottom: 56, paddingHorizontal: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.12)" },
  avatarWrap: { padding: 4, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.25)" },
  cam: { position: "absolute", right: 2, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: t.gold, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  name: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 12 },
  chipGold: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: t.gold, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  chipGlass: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  stats: { flexDirection: "row", marginHorizontal: 16, marginTop: -34, marginBottom: 18, backgroundColor: "#fff", borderRadius: 20, paddingVertical: 14, ...shadow, shadowOpacity: 0.12 },
  stat: { flex: 1, alignItems: "center", gap: 3, paddingHorizontal: 6 },
  statLine: { width: 1, backgroundColor: t.line },
  statK: { color: t.sub, fontSize: 11 },
  statV: { color: t.text, fontWeight: "900", fontSize: 16 },
  groupTitle: { color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 6 },
  group: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", ...shadow },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  itemLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, fontWeight: "700", color: t.text },
  itemVal: { color: t.sub, maxWidth: 140 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: t.bad, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  logout: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: t.badSoft, borderRadius: 16, paddingVertical: 14 },
})
