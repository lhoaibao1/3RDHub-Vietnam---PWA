import { useState } from "react"
import { Alert, Dimensions, Linking, ScrollView, Share, View } from "react-native"
import { Pressable } from "../../src/press"
import { Text } from "../../src/text"
import { useLocalSearchParams } from "expo-router"
import { Image } from "expo-image"
import * as Clipboard from "expo-clipboard"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { abs, api } from "../../src/api"
import { OfferRate, plain, rateText } from "../../src/format"
import { Art, Button, Card, ErrorBox, Loading, Pill, t } from "../../src/ui"
import { GlassButton, TopBar } from "../../src/chrome"

type Detail = {
  id: string; name: string; status?: string; content?: string
  offer?: { banners?: { url: string; thumb: string }[]; banner_url?: string; category?: string; settlement_cycle?: string; payment_schedule?: string; commission_rates?: OfferRate[]; sections?: Record<string, string>; labels?: { text: string; url: string }[] }
}
type Join = { status: string; eligibility: string; open?: boolean }
type Link = { id: string; url: string; campaign_id: string; status: string }
const W = Dimensions.get("window").width
const SECTIONS: [string, string][] = [["intro", "Giới thiệu"], ["commission_policy", "Chính sách hoa hồng"], ["conditions", "Điều kiện"], ["cookies", "Cookie / theo dõi"], ["cancel_reasons", "Lý do hủy đơn"], ["traffic_rules", "Quy định traffic"]]

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState("intro")
  const [page, setPage] = useState(0)
  const camp = useQuery({ queryKey: ["campaign", id], queryFn: () => api<{ data: Detail }>(`/api/v1/campaigns/${id}`).then((r) => r.data) })
  const join = useQuery({ queryKey: ["join", id], queryFn: () => api<{ data: Join }>(`/api/v1/campaigns/${id}/join`).then((r) => r.data) })
  const links = useQuery({ queryKey: ["links"], queryFn: () => api<{ data: Link[] }>("/api/v1/tracking-links").then((r) => r.data) })

  const register = useMutation({
    mutationFn: () => api<{ data: Join }>(`/api/v1/campaigns/${id}/join`, { method: "POST", body: {} }),
    onSuccess: (r) => { Alert.alert(r.data.status === "approved" ? "Đã tham gia" : "Đã đăng ký", r.data.status === "approved" ? "Bạn có thể lấy link ngay." : "Đang chờ quản trị viên duyệt."); void qc.invalidateQueries({ queryKey: ["join", id] }); void qc.invalidateQueries({ queryKey: ["joined"] }) },
    onError: (e: Error) => Alert.alert("Không đăng ký được", e.message),
  })
  const make = useMutation({
    mutationFn: () => api<{ data: { url: string } }>("/api/v1/tracking-links", { method: "POST", body: { campaign_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
    onError: (e: Error) => Alert.alert("Không tạo được link", e.message),
  })

  if (camp.isPending) return <Loading />
  if (camp.isError) return <View style={{ flex: 1 }}><TopBar title="Chiến dịch" /><ErrorBox error={camp.error} retry={() => camp.refetch()} /></View>
  const d = camp.data, o = d.offer
  const status = join.data?.status
  const mine = links.data?.find((l) => l.campaign_id === id && l.status === "active")?.url
  const pics = o?.banners?.length ? o.banners.map((b) => b.url) : o?.banner_url ? [o.banner_url] : []
  const approved = status === "approved"

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {pics.length ? (
          <View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}>
              {pics.map((p, i) => <Image key={i} source={{ uri: abs(p) }} style={{ width: W, height: W * 0.56 }} contentFit="cover" transition={200} />)}
            </ScrollView>
            {pics.length > 1 ? <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", position: "absolute", bottom: 10, left: 0, right: 0 }}>{pics.map((_, i) => <View key={i} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? t.gold : "rgba(255,255,255,0.7)" }} />)}</View> : null}
          </View>
        ) : <Art name={d.name} style={{ width: W, height: 140 }} />}
        <View style={{ padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: t.text }}>{d.name}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {o?.category ? <Pill label={o.category} tone="navy" /> : null}
            {o?.settlement_cycle ? <Pill label={`Đối soát: ${o.settlement_cycle}`} tone="gold" /> : null}
            {o?.payment_schedule ? <Pill label={`Trả: ${o.payment_schedule}`} tone="gold" /> : null}
            {status === "approved" ? <Pill label="✓ Đã tham gia" tone="ok" /> : status === "pending" ? <Pill label="Chờ duyệt" tone="warn" /> : null}
          </View>
          {o?.commission_rates?.length ? (
            <Card style={{ gap: 8 }}>
              <Text style={{ fontWeight: "800", color: t.text }}>Bảng hoa hồng</Text>
              {o.commission_rates.map((r, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
                  <View style={{ flex: 1 }}><Text style={{ color: t.text, fontWeight: "600" }}>{r.label || "Mức hoa hồng"}{r.channel ? ` · ${r.channel}` : ""}</Text>{r.note ? <Text style={{ color: t.sub, fontSize: 12 }}>{r.note}</Text> : null}</View>
                  <Text style={{ color: t.gold, fontWeight: "900" }}>{rateText(r)}</Text>
                </View>
              ))}
            </Card>
          ) : null}
          {approved && mine ? (
            <Card style={{ gap: 8 }}>
              <Text style={{ fontWeight: "800", color: t.text }}>Link giới thiệu của bạn</Text>
              <Text selectable style={{ color: t.navy2 }}>{mine}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Button label="Sao chép" kind="ghost" onPress={() => { void Clipboard.setStringAsync(mine); Alert.alert("Đã sao chép link") }} /></View>
                <View style={{ flex: 1 }}><Button label="Chia sẻ" kind="ghost" onPress={() => Share.share({ message: mine })} /></View>
              </View>
            </Card>
          ) : null}
          {SECTIONS.filter(([k]) => plain(o?.sections?.[k])).map(([k, label]) => (
            <Card key={k} style={{ gap: 8 }}>
              <Pressable onPress={() => setOpen(open === k ? "" : k)} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "800", color: t.text }}>{label}</Text><Text style={{ color: t.sub }}>{open === k ? "−" : "+"}</Text>
              </Pressable>
              {open === k ? <Text style={{ color: t.text, lineHeight: 21 }}>{plain(o?.sections?.[k])}</Text> : null}
            </Card>
          ))}
          {(o?.labels ?? []).filter((l) => l.url).map((l, i) => <Pressable key={i} onPress={() => Linking.openURL(abs(l.url))}><Text style={{ color: t.navy2, fontWeight: "700" }}>🔗 {l.text}</Text></Pressable>)}
        </View>
      </ScrollView>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.line }}>
        {approved ? <Button label={mine ? "Tạo link mới" : "Lấy link giới thiệu"} icon="link" onPress={() => make.mutate()} busy={make.isPending} />
          : status === "pending" ? <Button label="Đang chờ duyệt" kind="ghost" onPress={() => {}} disabled />
          : <Button label="Đăng ký tham gia" kind="gold" onPress={() => register.mutate()} busy={register.isPending} />}
      </View>
      <TopBar overlay title={d.name} right={<GlassButton icon="share-outline" label="Chia sẻ" onPress={() => Share.share({ message: mine || d.name })} />} />
    </View>
  )
}
