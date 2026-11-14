import { useMemo, useState } from "react"
import { Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { type Campaign, useCampaigns, useMemberships } from "../../src/hooks"
import { num, rateText, vnd } from "../../src/format"
import { FilterButton, PickerSheet } from "../../src/sheet"
import { Art, Empty, ErrorBox, Loading, t } from "../../src/ui"
import { shadow } from "../../src/theme"

const W = Dimensions.get("window").width
const TAGS: Record<string, [string, string]> = { hot: ["🔥 Hot", "#DC2626"], featured: ["⭐ Nổi bật", "#B45309"], top_pay: ["💰 Hoa hồng cao", "#15803D"], new: ["✨ Mới", "#2563EB"], fast_order: ["⚡ Lên đơn nhanh", "#0B2A6F"], fast_approve: ["✅ Duyệt nhanh", "#0B2A6F"], fast_pay: ["💸 Trả nhanh", "#0B2A6F"] }
const TABS = [{ k: "all", label: "Tất cả" }, { k: "joined", label: "Của tôi" }, { k: "hot", label: "Nổi bật" }, { k: "new", label: "Mới" }] as const
const SORTS = [{ value: "pos", label: "Đề xuất" }, { value: "new", label: "Mới nhất" }, { value: "pay", label: "Hoa hồng cao nhất" }, { value: "people", label: "Nhiều người chạy nhất" }]

/** Mức hoa hồng nổi bật nhất của chiến dịch: tiền cố định cao nhất, không có thì % cao nhất. */
export function bestRate(c: Campaign): { text: string; score: number } | null {
  const rates = c.offer?.commission_rates ?? []
  const fixed = rates.filter((r) => r.kind === "fixed" && (r.amount_minor ?? 0) > 0).sort((a, b) => (b.amount_minor ?? 0) - (a.amount_minor ?? 0))[0]
  if (fixed) return { text: `${vnd(fixed.amount_minor)}`, score: fixed.amount_minor ?? 0 }
  const pct = rates.filter((r) => r.kind !== "fixed" && (r.rate_bps ?? 0) > 0).sort((a, b) => (b.rate_bps ?? 0) - (a.rate_bps ?? 0))[0]
  return pct ? { text: rateText(pct), score: (pct.rate_bps ?? 0) * 100 } : null
}

export function CampaignCard({ c, status, onPress }: { c: Campaign; status?: string; onPress: () => void }) {
  const best = bestRate(c)
  const off = c.status && c.status !== "active"
  const tags = (c.offer?.highlights ?? []).filter((h) => TAGS[h]).slice(0, 2)
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View>
        <Art url={c.offer?.banner_url || c.offer?.thumb_url} name={c.name} style={{ width: "100%", height: (W - 32) * 0.5 }} />
        <LinearGradient colors={["transparent", "rgba(8,20,55,0.85)"]} style={s.shade} />
        <View style={s.tags}>{tags.map((h) => <View key={h} style={[s.tag, { backgroundColor: TAGS[h]![1] }]}><Text style={s.tagText}>{TAGS[h]![0]}</Text></View>)}</View>
        {status === "approved" ? <View style={[s.state, { backgroundColor: t.ok }]}><Ionicons name="checkmark" size={12} color="#fff" /><Text style={s.tagText}>Đã tham gia</Text></View>
          : status === "pending" ? <View style={[s.state, { backgroundColor: t.warn }]}><Text style={s.tagText}>Chờ duyệt</Text></View>
          : off ? <View style={[s.state, { backgroundColor: "#6B7280" }]}><Text style={s.tagText}>{c.status === "paused" ? "Tạm dừng" : "Ngừng"}</Text></View> : null}
        <View style={s.over}>
          {c.offer?.category ? <Text style={s.cat}>{c.offer.category}</Text> : null}
          <Text style={s.name} numberOfLines={2}>{c.name}</Text>
        </View>
      </View>
      <View style={s.foot}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.sub, fontSize: 11 }}>Hoa hồng đến</Text>
          <Text style={{ color: t.gold, fontSize: 20, fontWeight: "900" }}>{best ? best.text : "Xem chi tiết"}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {c.participants ? <Text style={s.meta}><Ionicons name="people-outline" size={12} /> {num(c.participants)} publisher</Text> : null}
          {c.rating?.count ? <Text style={s.meta}><Ionicons name="star" size={12} color="#F59E0B" /> {c.rating.avg.toFixed(1)} ({num(c.rating.count)})</Text> : null}
        </View>
        <View style={[s.cta, status === "approved" ? { backgroundColor: t.navy } : { backgroundColor: t.gold }]}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{status === "approved" ? "Lấy link" : status === "pending" ? "Xem" : "Tham gia"}</Text>
        </View>
      </View>
    </Pressable>
  )
}

export default function Campaigns() {
  const router = useRouter()
  const q = useCampaigns()
  const mem = useMemberships()
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("all")
  const [term, setTerm] = useState("")
  const [cat, setCat] = useState("")
  const [sort, setSort] = useState("pos")
  const [sheet, setSheet] = useState<"" | "cat" | "sort">("")
  const status = (id: string) => mem.data?.[id]

  const cats = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of q.data ?? []) if (c.offer?.category) m.set(c.offer.category, (m.get(c.offer.category) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [q.data])
  const rows = useMemo(() => {
    const k = term.trim().toLowerCase()
    const monthAgo = Date.now() - 30 * 86400000
    const r = (q.data ?? []).filter((c) => {
      if (cat && c.offer?.category !== cat) return false
      if (k && !c.name.toLowerCase().includes(k) && !(c.offer?.category ?? "").toLowerCase().includes(k)) return false
      if (tab === "joined") return mem.data?.[c.id] === "approved" || mem.data?.[c.id] === "pending"
      if (tab === "hot") return (c.offer?.highlights ?? []).some((h) => h === "hot" || h === "featured" || h === "top_pay")
      if (tab === "new") return (c.offer?.highlights ?? []).includes("new") || (c.created_at ? new Date(c.created_at).getTime() > monthAgo : false)
      return true
    })
    const score = (c: Campaign) => bestRate(c)?.score ?? 0
    const by: Record<string, (a: Campaign, b: Campaign) => number> = {
      pos: (a, b) => Number(a.status !== "active") - Number(b.status !== "active") || (a.position ?? 999) - (b.position ?? 999),
      new: (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      pay: (a, b) => score(b) - score(a),
      people: (a, b) => (b.participants ?? 0) - (a.participants ?? 0),
    }
    return [...r].sort(by[sort])
  }, [q.data, mem.data, term, cat, tab, sort])

  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const joinedCount = Object.values(mem.data ?? {}).filter((v) => v === "approved").length

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <View style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder="Tìm chiến dịch, ngành hàng…" placeholderTextColor={t.sub} value={term} onChangeText={setTerm} />{term ? <Pressable onPress={() => setTerm("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={t.sub} /></Pressable> : null}</View>
      <View style={s.seg}>
        {TABS.map((x) => (
          <Pressable key={x.k} onPress={() => setTab(x.k)} style={[s.segItem, tab === x.k && s.segOn]}>
            <Text numberOfLines={1} style={{ color: tab === x.k ? t.navy : t.sub, fontWeight: "800", fontSize: 13 }}>{x.k === "joined" && joinedCount ? `${x.label} ${joinedCount}` : x.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <FilterButton label="Ngành hàng" value={cat} active={!!cat} onPress={() => setSheet("cat")} />
        <FilterButton label="Sắp xếp" value={SORTS.find((x) => x.value === sort)?.label} active={sort !== "pos"} onPress={() => setSheet("sort")} />
        <Text style={{ marginLeft: "auto", color: t.sub, fontSize: 12 }}>{num(rows.length)} chiến dịch</Text>
      </View>
    </View>
  )
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={q.isFetching && !q.isPending} onRefresh={() => { void q.refetch(); void mem.refetch() }} tintColor={t.navy} />}
        ListEmptyComponent={<Empty text={tab === "joined" ? "Bạn chưa tham gia chiến dịch nào." : "Không có chiến dịch phù hợp."} icon="megaphone-outline" />}
        renderItem={({ item }) => <CampaignCard c={item} status={status(item.id)} onPress={() => router.push(`/campaign/${item.id}`)} />}
      />
      <PickerSheet open={sheet === "cat"} title="Ngành hàng" options={[{ value: "", label: "Mọi ngành hàng" }, ...cats.map(([c, n]) => ({ value: c, label: c, sub: `${n} chiến dịch` }))]} value={cat} onPick={setCat} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "sort"} title="Sắp xếp" options={SORTS} value={sort} onPick={setSort} onClose={() => setSheet("")} />
    </View>
  )
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: t.line },
  seg: { flexDirection: "row", backgroundColor: "#E7EBF4", borderRadius: 12, padding: 3 },
  segItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10 },
  segOn: { backgroundColor: "#fff", ...shadow },
  card: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", ...shadow },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
  tags: { position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  state: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  over: { position: "absolute", left: 14, right: 14, bottom: 12 },
  cat: { color: "#FFD3BF", fontSize: 12, fontWeight: "700", marginBottom: 2 },
  name: { color: "#fff", fontSize: 18, fontWeight: "900" },
  foot: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  meta: { color: t.sub, fontSize: 12 },
  cta: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
})
