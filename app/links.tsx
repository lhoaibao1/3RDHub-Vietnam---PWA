import { Alert, FlatList, RefreshControl, Share, View } from "react-native"
import { Text } from "../src/text"
import * as Clipboard from "expo-clipboard"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../src/api"
import { useCampaigns } from "../src/hooks"
import { day, num } from "../src/format"
import { Art, Button, Card, Empty, ErrorBox, Loading, Pill, t } from "../src/ui"
import { Pager, TopBar, usePager } from "../src/chrome"

type Link = { id: string; code: string; name: string; url: string; campaign_id: string; status: string; created_at: string }

export default function Links() {
  const qc = useQueryClient()
  const links = useQuery({ queryKey: ["links"], queryFn: () => api<{ data: Link[] }>("/api/v1/tracking-links").then((r) => r.data) })
  const clicks = useQuery({ queryKey: ["clicks"], queryFn: () => api<{ data: { link_id?: string }[] }>("/api/v1/clicks").then((r) => r.data) })
  const camps = useCampaigns()
  const toggle = useMutation({
    mutationFn: (l: Link) => api(`/api/v1/tracking-links/${l.id}`, { method: "PUT", body: { status: l.status === "active" ? "inactive" : "active" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
    onError: (e: Error) => Alert.alert("Không đổi được", e.message),
  })
  const pg = usePager(links.data ?? [], 20)
  const count = (id: string) => (clicks.data ?? []).filter((c) => c.link_id === id).length
  if (links.isPending) return <Loading />
  if (links.isError) return <ErrorBox error={links.error} retry={() => links.refetch()} />
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Link của tôi" />
      <FlatList
        data={pg.rows}
        ListFooterComponent={<Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} unit="link" onPage={pg.setPage} />}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={links.isFetching} onRefresh={() => { void links.refetch(); void clicks.refetch() }} tintColor={t.navy} />}
        ListEmptyComponent={<Empty text="Bạn chưa có link nào. Vào một chiến dịch để lấy link." icon="link-outline" />}
        renderItem={({ item: l }) => {
          const c = camps.data?.find((x) => x.id === l.campaign_id)
          return (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Art url={c?.offer?.thumb_url || c?.offer?.banner_url} name={c?.name} style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden" }} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontWeight: "800", color: t.text }} numberOfLines={1}>{l.name || c?.name || l.code}</Text>
                  <Text style={{ color: t.sub, fontSize: 12 }}>{day(l.created_at)} · {num(count(l.id))} click</Text>
                </View>
                <Pill label={l.status === "active" ? "Đang bật" : "Đã tắt"} tone={l.status === "active" ? "ok" : "gray"} />
              </View>
              <Text selectable style={{ color: t.navy2, fontSize: 12 }} numberOfLines={2}>{l.url}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Button label="Sao chép" kind="ghost" onPress={() => { void Clipboard.setStringAsync(l.url); Alert.alert("Đã sao chép link") }} /></View>
                <View style={{ flex: 1 }}><Button label="Chia sẻ" kind="ghost" onPress={() => Share.share({ message: l.url })} /></View>
                <View style={{ flex: 1 }}><Button label={l.status === "active" ? "Tắt" : "Bật"} kind="ghost" onPress={() => toggle.mutate(l)} busy={toggle.isPending && toggle.variables?.id === l.id} /></View>
              </View>
            </Card>
          )
        }}
      />
    </View>
  )
}
