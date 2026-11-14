import { useMemo, useState } from "react"
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { abs, api } from "../../src/api"
import { Card, Empty, ErrorBox, Loading, c } from "../../src/ui"

export type CampaignRow = { id: string; name: string; status?: string; participants?: number; offer?: { thumb_url?: string; banner_url?: string; category?: string } }

export default function Campaigns() {
  const router = useRouter()
  const [term, setTerm] = useState("")
  const q = useQuery({ queryKey: ["campaigns"], queryFn: () => api<{ data: CampaignRow[] }>("/api/v1/campaigns") })
  const rows = useMemo(() => (q.data?.data ?? []).filter((r) => r.status !== "archived" && r.name.toLowerCase().includes(term.trim().toLowerCase())), [q.data, term])
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TextInput style={s.search} placeholder="Tìm chiến dịch…" value={term} onChangeText={setTerm} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { void q.refetch() }} />}
        ListEmptyComponent={<Empty text="Không có chiến dịch nào." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: "/campaign/[id]", params: { id: item.id } })}>
            <Card style={s.row}>
              {item.offer?.thumb_url || item.offer?.banner_url ? <Image source={{ uri: abs(item.offer.thumb_url || item.offer.banner_url) }} style={s.img} /> : <View style={[s.img, { backgroundColor: c.line }]} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }} numberOfLines={2}>{item.name}</Text>
                <Text style={{ color: c.sub, fontSize: 12 }}>{[item.offer?.category, item.participants ? `${item.participants} publisher` : ""].filter(Boolean).join(" · ")}</Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}
const s = StyleSheet.create({
  search: { margin: 16, marginBottom: 8, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.line },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  img: { width: 56, height: 56, borderRadius: 10 },
})
