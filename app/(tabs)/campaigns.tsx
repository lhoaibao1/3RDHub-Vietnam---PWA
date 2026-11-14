import { useMemo, useRef, useState } from "react"
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text, TextInput } from "../../src/text"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { type Campaign, useCampaigns, useMemberships } from "../../src/hooks"
import { num, rateText, vnd } from "../../src/format"
import { FilterButton, PickerSheet } from "../../src/sheet"
import { Art, Empty, ErrorBox, Loading, t, PullRefresh } from "../../src/ui"
import { Glass, LargeTitle, Pager, tap, usePager } from "../../src/chrome"
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

const CW = (W - 32 - 12) / 2

/** Thẻ chiến dịch dạng lưới 2 cột. */
export function CampaignCard({ c, status, onPress }: { c: Campaign; status?: string; onPress: () => void }) {
  const best = bestRate(c)
  const off = c.status && c.status !== "active"
  const tag = (c.offer?.highlights ?? []).find((h) => TAGS[h])
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.98 }] }, off && { opacity: 0.75 }]}>
      <View>
        <Art url={c.offer?.thumb_url || c.offer?.banner_url} name={c.name} style={{ width: CW, height: CW * 0.72 }} />
        <LinearGradient colors={["transparent", "rgba(8,20,55,0.55)"]} style={s.shade} />
        {tag ? <View style={[s.tag, { backgroundColor: TAGS[tag]![1] }]}><Text style={s.tagText} numberOfLines={1}>{TAGS[tag]![0]}</Text></View> : null}
        {status === "approved" ? <View style={[s.state, { backgroundColor: t.ok }]}><Ionicons name="checkmark" size={12} color="#fff" /></View>
          : status === "pending" ? <View style={[s.state, { backgroundColor: t.warn }]}><Ionicons name="time" size={12} color="#fff" /></View> : null}
        {off ? <View style={s.offBadge}><Text style={s.tagText}>{c.status === "paused" ? "Tạm dừng" : "Ngừng"}</Text></View> : null}
      </View>
      <View style={{ padding: 10, gap: 4, flex: 1 }}>
        {c.offer?.category ? <Text style={s.cat} numberOfLines={1}>{c.offer.category}</Text> : null}
        <Text style={s.name} numberOfLines={2}>{c.name}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: t.sub, fontSize: 10 }}>Hoa hồng đến</Text>
        <Text style={{ color: t.gold, fontSize: 16, fontWeight: "900" }} numberOfLines={1}>{best ? best.text : "Xem chi tiết"}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.meta} numberOfLines={1}><Ionicons name="people-outline" size={11} /> {num(c.participants ?? 0)}</Text>
          {c.rating?.count ? <Text style={s.meta}><Ionicons name="star" size={11} color="#F59E0B" /> {c.rating.avg.toFixed(1)}</Text> : null}
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

  const pg = usePager(rows, 20, `${tab}|${cat}|${sort}|${term}`)
  const list = useRef<FlatList<Campaign>>(null)
  if (q.isPending) return <Loading image rows={2} />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const joinedCount = Object.values(mem.data ?? {}).filter((v) => v === "approved").length

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <Glass style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder="Tìm chiến dịch, ngành hàng…" placeholderTextColor={t.sub} value={term} onChangeText={setTerm} />{term ? <Pressable onPress={() => setTerm("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={t.sub} /></Pressable> : null}</Glass>
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
      <LargeTitle title="Chiến dịch" sub={`${num(q.data.length)} chiến dịch đang có`} />
      <FlatList
        ref={list}
        data={pg.rows}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListFooterComponent={<Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} unit="chiến dịch" onPage={(p) => { pg.setPage(p); list.current?.scrollToOffset({ offset: 0, animated: true }) }} />}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 110, gap: 12, flexGrow: 1 }}
        refreshControl={<PullRefresh run={() => Promise.all([q.refetch(), mem.refetch()])} />}
        ListEmptyComponent={<Empty text={tab === "joined" ? "Bạn chưa tham gia chiến dịch nào." : "Không có chiến dịch phù hợp."} icon="megaphone-outline" />}
        renderItem={({ item }) => <CampaignCard c={item} status={status(item.id)} onPress={() => { tap(); router.push(`/campaign/${item.id}`) }} />}
      />
      <PickerSheet open={sheet === "cat"} title="Ngành hàng" options={[{ value: "", label: "Mọi ngành hàng" }, ...cats.map(([c, n]) => ({ value: c, label: c, sub: `${n} chiến dịch` }))]} value={cat} onPick={setCat} onClose={() => setSheet("")} />
      <PickerSheet open={sheet === "sort"} title="Sắp xếp" options={SORTS} value={sort} onPick={setSort} onClose={() => setSheet("")} />
    </View>
  )
}
const s = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, paddingHorizontal: 14, overflow: "hidden" },
  seg: { flexDirection: "row", backgroundColor: "#E7EBF4", borderRadius: 12, padding: 3 },
  segItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10 },
  segOn: { backgroundColor: "#fff", ...shadow },
  card: { width: CW, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", ...shadow },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" },
  tag: { position: "absolute", top: 8, left: 8, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, maxWidth: CW - 50 },
  tagText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  state: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  offBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "#6B7280", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  cat: { color: t.gold, fontSize: 11, fontWeight: "700" },
  name: { color: t.text, fontSize: 14, fontWeight: "800", lineHeight: 18, minHeight: 36 },
  meta: { color: t.sub, fontSize: 11 },
})
