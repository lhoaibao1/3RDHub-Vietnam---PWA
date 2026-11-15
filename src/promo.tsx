import { useEffect, useState } from "react"
import { Dimensions, Linking, Modal, Pressable, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { abs, api, store } from "./api"
import { Text } from "./text"
import { t } from "./theme"

// Banner quảng cáo dạng nổi (Cài đặt → Banner quảng cáo trên web): GET /tenant/promo-banners → {every_hours, items}.
// Hiện lại sau mỗi every_hours giờ, giống bản web.
type Promo = { id: string; image_url: string; title?: string; link?: string }
const KEY = "promo_seen_at"
const { width: W, height: H } = Dimensions.get("window")

export function PromoPopup() {
  const router = useRouter()
  const q = useQuery({ queryKey: ["promo"], queryFn: () => api<{ data: { every_hours: number; items: Promo[] } }>("/api/v1/tenant/promo-banners").then((r) => r.data), staleTime: 10 * 60_000, retry: false })
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [ratio, setRatio] = useState<Record<string, number>>({}) // cao / rộng của từng ảnh, để khung vừa khít ảnh
  const items = q.data?.items ?? []
  useEffect(() => {
    if (!items.length) return
    let alive = true
    void (async () => {
      let last = 0
      try { last = Number(await store.getItemAsync(KEY)) || 0 } catch {}
      if (alive && Date.now() - last > (q.data?.every_hours || 24) * 3600_000) setOpen(true)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])
  const close = () => { setOpen(false); void store.setItemAsync(KEY, String(Date.now())).catch(() => {}) }
  const go = (p: Promo) => {
    close()
    const l = p.link || ""
    const m = l.match(/\/campaigns\/([^/?#]+)/)
    if (m) router.push(`/campaign/${m[1]}`)
    else if (/^https?:/.test(l)) void Linking.openURL(l)
  }
  if (!open || !items.length) return null
  const w = W - 48
  const h = Math.min(H * 0.68, w * (ratio[items[page]?.id ?? ""] ?? 1))
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(8,20,55,0.7)", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <View style={{ width: w }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))} style={{ borderRadius: 20 }}>
            {items.map((p) => (
              <Pressable key={p.id} onPress={() => go(p)}>
                <Image source={{ uri: abs(p.image_url) }} style={{ width: w, height: h }} contentFit="cover" transition={200} onLoad={(e) => { const { width, height } = e.source; if (width && height) setRatio((r) => ({ ...r, [p.id]: height / width })) }} />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={close} hitSlop={10} style={{ position: "absolute", top: -14, right: -10, width: 34, height: 34, borderRadius: 17, backgroundColor: t.card, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={20} color={t.text} />
          </Pressable>
        </View>
        {items.length > 1 ? <View style={{ flexDirection: "row", gap: 6 }}>{items.map((p, i) => <View key={p.id} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? t.gold : "rgba(255,255,255,0.6)" }} />)}</View> : null}
        {items[page]?.title ? <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center", paddingHorizontal: 24 }}>{items[page]!.title}</Text> : null}
        <Pressable onPress={close}><Text style={{ color: "#C9D6F5" }}>Đóng</Text></Pressable>
      </View>
    </Modal>
  )
}
