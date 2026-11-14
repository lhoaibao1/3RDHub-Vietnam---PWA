import { useMemo, useState } from "react"
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../src/api"
import { when } from "../src/format"
import { Card, Chip, Empty, ErrorBox, Loading, t } from "../src/ui"

type Note = { id: string; title: string; body: string; link: string; kind: string; created_at: string; read_at: string | null }
const cat = (k: string) => (k.startsWith("order_") || k === "mgr_order_new" || k === "mgr_lost_order" ? "order" : k === "wallet_credited" || k === "payout_created" || k.startsWith("withdraw_") ? "wallet" : /^(contract_|join_|kyc_)/.test(k) || k === "comment_reply" ? "mail" : "system")
const ICON = { order: "receipt-outline", wallet: "wallet-outline", mail: "mail-outline", system: "megaphone-outline" } as const
const TABS = [["", "Tất cả"], ["order", "Đơn hàng"], ["wallet", "Ví"], ["mail", "Thư"], ["system", "Hệ thống"]] as const

export default function Notifications() {
  const router = useRouter()
  const qc = useQueryClient()
  const [f, setF] = useState("")
  const q = useQuery({ queryKey: ["notes"], queryFn: () => api<{ data: Note[] }>("/api/v1/tenant/notifications").then((r) => r.data) })
  const done = () => { void qc.invalidateQueries({ queryKey: ["notes"] }); void qc.invalidateQueries({ queryKey: ["unread"] }) }
  const readAll = useMutation({ mutationFn: () => api("/api/v1/tenant/notifications/read-all", { method: "POST" }), onSuccess: done })
  const read = useMutation({ mutationFn: (id: string) => api(`/api/v1/tenant/notifications/${id}/read`, { method: "POST" }), onSuccess: done })
  const rows = useMemo(() => (q.data ?? []).filter((n) => !f || cat(n.kind) === f), [q.data, f])
  const open = (n: Note) => {
    if (!n.read_at) read.mutate(n.id)
    const m = n.link.match(/\/campaigns\/([^/?#]+)/)
    if (m) router.push(`/campaign/${m[1]}`)
    else if (/wallet|payment|withdraw/.test(n.link)) router.push("/(tabs)/wallet")
    else if (/order|conversion/.test(n.link)) router.push("/(tabs)/orders")
  }
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: "Thông báo", headerBackTitle: "Quay lại", headerRight: () => <Pressable onPress={() => readAll.mutate()}><Text style={{ color: t.navy2, fontWeight: "700" }}>Đọc hết</Text></Pressable> }} />
      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}>
          {TABS.map(([k, l]) => <Chip key={k} label={l} on={f === k} onPress={() => setF(k)} />)}
        </ScrollView>
      </View>
      {q.isPending ? <Loading /> : q.isError ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { void q.refetch() }} tintColor={t.navy} />}
          ListEmptyComponent={<Empty text="Chưa có thông báo." icon="notifications-off-outline" />}
          renderItem={({ item: n }) => (
            <Pressable onPress={() => open(n)}>
              <Card style={{ flexDirection: "row", gap: 12, borderLeftWidth: n.read_at ? 0 : 4, borderLeftColor: t.gold }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={ICON[cat(n.kind)]} size={18} color={t.navy} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: n.read_at ? "600" : "800", color: t.text }}>{n.title}</Text>
                  {n.body ? <Text style={{ color: t.sub }} numberOfLines={3}>{n.body}</Text> : null}
                  <Text style={{ color: t.sub, fontSize: 11, marginTop: 2 }}>{when(n.created_at)}</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}
