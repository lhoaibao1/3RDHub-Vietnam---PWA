import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { orderCode, orderStatus, useCampaigns, useLost, useMembers, useOrders } from "./hooks"
import { vnd } from "./format"
import { Art, Avatar, t } from "./ui"
import { Glass, LargeTitle, TopBar, tap } from "./chrome"
import { Text, TextInput } from "./text"
import { shadow } from "./theme"

const has = (k: string, ...v: (string | undefined)[]) => v.some((x) => (x ?? "").toLowerCase().includes(k))
const SHORTCUTS: { icon: keyof typeof Ionicons.glyphMap; label: string; to: string }[] = [
  { icon: "megaphone-outline", label: "Chiến dịch", to: "/(tabs)/campaigns" }, { icon: "receipt-outline", label: "Đơn hàng", to: "/(tabs)/orders" },
  { icon: "link-outline", label: "Link của tôi", to: "/links" }, { icon: "notifications-outline", label: "Thông báo", to: "/notifications" },
  { icon: "shield-checkmark-outline", label: "Định danh eKYC", to: "/ekyc" }, { icon: "settings-outline", label: "Cài đặt", to: "/settings" },
]

/** Tìm chung một chỗ: chiến dịch, đơn hàng, thành viên, phiếu đơn thất lạc. */
export function SearchScreen({ stack }: { stack?: boolean }) {
  const router = useRouter()
  const [term, setTerm] = useState("")
  const camps = useCampaigns(), orders = useOrders(), members = useMembers(), lost = useLost()
  const k = term.trim().toLowerCase()
  const campName = useMemo(() => new Map((camps.data ?? []).map((c) => [c.id, c.name])), [camps.data])
  const res = useMemo(() => {
    if (k.length < 2) return null
    return {
      camps: (camps.data ?? []).filter((c) => has(k, c.name, c.offer?.category)).slice(0, 6),
      orders: (orders.data ?? []).filter((o) => has(k, orderCode(o), o.fields?.customer_name, o.fields?.product, o.campaign_id ? campName.get(o.campaign_id) : "")).slice(0, 8),
      members: (members.data ?? []).filter((m) => has(k, m.name, m.rd_code, m.email, m.phone)).slice(0, 6),
      lost: (lost.data ?? []).filter((x) => has(k, x.code, x.order_code, x.campaign_name)).slice(0, 5),
    }
  }, [k, camps.data, orders.data, members.data, lost.data, campName])
  const go = (to: string) => { tap(); router.push(to as never) }
  const none = res && !res.camps.length && !res.orders.length && !res.members.length && !res.lost.length

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {stack ? <TopBar title="Tìm kiếm" /> : <LargeTitle title="Tìm kiếm" />}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Glass style={s.search}>
          <Ionicons name="search" size={18} color={t.sub} />
          <TextInput style={{ flex: 1, paddingVertical: 12, color: t.text, fontSize: 16 }} placeholder="Chiến dịch, mã đơn, thành viên…" placeholderTextColor={t.sub} autoFocus={stack} value={term} onChangeText={setTerm} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
          {term ? <Pressable onPress={() => setTerm("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={t.sub} /></Pressable> : null}
        </Glass>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 110, gap: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {!res ? (
          <>
            <Text style={s.h}>Đi nhanh tới</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {SHORTCUTS.map((x) => (
                <Pressable key={x.label} onPress={() => go(x.to)} style={({ pressed }) => [s.short, pressed && { opacity: 0.8 }]}>
                  <Ionicons name={x.icon} size={20} color={t.navy} /><Text style={{ color: t.text, fontWeight: "600", fontSize: 13 }}>{x.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: t.sub, fontSize: 13 }}>Gõ từ 2 ký tự để tìm trong chiến dịch, đơn hàng{members.on ? ", thành viên" : ""}{lost.on ? ", phiếu đơn thất lạc" : ""}.</Text>
          </>
        ) : none ? (
          <View style={{ alignItems: "center", gap: 10, paddingTop: 40 }}><Ionicons name="search-outline" size={44} color={t.line} /><Text style={{ color: t.sub }}>Không tìm thấy gì cho “{term.trim()}”.</Text></View>
        ) : (
          <>
            {res.camps.length ? <View style={s.group}><Text style={s.h}>Chiến dịch</Text>{res.camps.map((c) => (
              <Pressable key={c.id} onPress={() => go(`/campaign/${c.id}`)} style={s.row}>
                <Art url={c.offer?.thumb_url || c.offer?.banner_url} name={c.name} style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden" }} />
                <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{c.name}</Text><Text style={s.sub} numberOfLines={1}>{c.offer?.category || "Chiến dịch"}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={t.sub} />
              </Pressable>
            ))}</View> : null}
            {res.orders.length ? <View style={s.group}><Text style={s.h}>Đơn hàng</Text>{res.orders.map((o) => {
              const st = orderStatus(o.status)
              return (
                <Pressable key={o.id} onPress={() => go(`/order/${o.id}`)} style={s.row}>
                  <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{orderCode(o) || "Đơn hàng"}</Text><Text style={s.sub} numberOfLines={1}>{(o.campaign_id && campName.get(o.campaign_id)) || ""}</Text></View>
                  <View style={{ alignItems: "flex-end" }}><Text style={{ fontWeight: "700", color: t.text }}>{vnd(o.sale_amount)}</Text><Text style={{ color: st.color, fontSize: 12, fontWeight: "600" }}>{st.label}</Text></View>
                </Pressable>
              )
            })}</View> : null}
            {res.members.length ? <View style={s.group}><Text style={s.h}>Thành viên</Text>{res.members.map((m) => (
              <Pressable key={m.id} onPress={() => go(`/members/${m.id}`)} style={s.row}>
                <Avatar url={m.avatar_url} name={m.name} size={40} />
                <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{m.name}</Text><Text style={s.sub} numberOfLines={1}>{[m.rd_code, m.role, m.team].filter(Boolean).join(" · ")}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={t.sub} />
              </Pressable>
            ))}</View> : null}
            {res.lost.length ? <View style={s.group}><Text style={s.h}>Phiếu đơn thất lạc</Text>{res.lost.map((x) => (
              <Pressable key={x.id} onPress={() => go(`/lost/${x.id}`)} style={s.row}>
                <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{x.code} · {x.order_code}</Text><Text style={s.sub} numberOfLines={1}>{x.campaign_name}</Text></View>
                <Ionicons name="chevron-forward" size={16} color={t.sub} />
              </Pressable>
            ))}</View> : null}
          </>
        )}
      </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, paddingHorizontal: 14, overflow: "hidden" },
  h: { color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  short: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, ...shadow },
  group: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 12, ...shadow },
  name: { fontWeight: "700", color: t.text },
  sub: { color: t.sub, fontSize: 12, marginTop: 1 },
})
