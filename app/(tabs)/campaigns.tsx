import { useMemo, useState } from "react"
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Campaign, useCampaigns, useJoined } from "../../src/hooks"
import { rateText } from "../../src/format"
import { Art, Card, Chip, Empty, ErrorBox, Loading, Pill, t } from "../../src/ui"

const TAGS: Record<string, [string, "bad" | "gold" | "ok" | "navy"]> = { hot: ["🔥 Hot", "bad"], featured: ["⭐ Nổi bật", "gold"], top_pay: ["💰 Hoa hồng cao", "ok"], new: ["Mới", "navy"], fast_order: ["Lên đơn nhanh", "navy"], fast_approve: ["Duyệt nhanh", "navy"], fast_pay: ["Trả nhanh", "navy"] }

export const headline = (c: Campaign) => {
  const r = (c.offer?.commission_rates ?? []).filter((x) => (x.kind === "fixed" ? x.amount_minor : x.rate_bps))
  if (!r.length) return ""
  const best = r.reduce((a, b) => ((b.kind === "fixed" ? b.amount_minor! : b.rate_bps!) > (a.kind === "fixed" ? a.amount_minor! : a.rate_bps!) && b.kind === a.kind ? b : a))
  return `Đến ${rateText(best)}`
}

export default function Campaigns() {
  const router = useRouter()
  const [term, setTerm] = useState("")
  const [cat, setCat] = useState("")
  const [mine, setMine] = useState(false)
  const q = useCampaigns()
  const joined = useJoined()
  const cats = useMemo(() => [...new Set((q.data ?? []).map((c) => c.offer?.category).filter(Boolean) as string[])], [q.data])
  const rows = useMemo(() => (q.data ?? []).filter((c) => (!cat || c.offer?.category === cat) && (!mine || joined.data?.includes(c.id)) && c.name.toLowerCase().includes(term.trim().toLowerCase())), [q.data, term, cat, mine, joined.data])
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder="Tìm chiến dịch…" placeholderTextColor={t.sub} value={term} onChangeText={setTerm} /></View>
      <View style={{ height: 46 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}>
          <Chip label="Tất cả" on={!cat && !mine} onPress={() => { setCat(""); setMine(false) }} />
          <Chip label="Đã tham gia" on={mine} onPress={() => setMine((v) => !v)} />
          {cats.map((c) => <Chip key={c} label={c} on={cat === c} onPress={() => setCat(cat === c ? "" : c)} />)}
        </ScrollView>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 14, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { void q.refetch(); void joined.refetch() }} tintColor={t.navy} />}
        ListEmptyComponent={<Empty text="Không có chiến dịch phù hợp." icon="megaphone-outline" />}
        renderItem={({ item: c }) => (
          <Pressable onPress={() => router.push(`/campaign/${c.id}`)}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <Art url={c.offer?.banner_url || c.offer?.thumb_url} name={c.name} style={{ width: "100%", height: 150 }} />
              <View style={{ padding: 14, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: t.text }} numberOfLines={2}>{c.name}</Text>
                  {headline(c) ? <Text style={{ color: t.gold, fontWeight: "900" }}>{headline(c)}</Text> : null}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {c.offer?.category ? <Pill label={c.offer.category} tone="navy" /> : null}
                  {(c.offer?.highlights ?? []).slice(0, 3).map((h) => TAGS[h] ? <Pill key={h} label={TAGS[h][0]} tone={TAGS[h][1]} /> : null)}
                  {joined.data?.includes(c.id) ? <Pill label="✓ Đã tham gia" tone="ok" /> : null}
                </View>
                {c.participants ? <Text style={{ color: t.sub, fontSize: 12 }}>{c.participants} publisher đang chạy</Text> : null}
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}
const s = StyleSheet.create({ search: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 4, marginBottom: 10, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: t.line } })
