import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../../src/api"
import { useAuth } from "../../src/auth"
import { Button, Card, ErrorBox, Loading, c, when } from "../../src/ui"

type Note = { id: string; title: string; body: string; created_at: string; read_at: string | null }

export default function Account() {
  const { user, logout } = useAuth()
  const qc = useQueryClient()
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => api<{ data: Note[] }>("/api/v1/tenant/notifications") })
  const readAll = useMutation({ mutationFn: () => api("/api/v1/tenant/notifications/read-all", { method: "POST" }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["notes"] }); void qc.invalidateQueries({ queryKey: ["unread"] }) } })
  const read = useMutation({ mutationFn: (id: string) => api(`/api/v1/tenant/notifications/${id}/read`, { method: "POST" }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["notes"] }); void qc.invalidateQueries({ queryKey: ["unread"] }) } })
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={notes.isFetching} onRefresh={() => { void notes.refetch() }} />}>
      <Card>
        <Text style={{ fontWeight: "800", fontSize: 18 }}>{user?.display_name || user?.email}</Text>
        {user?.display_name ? <Text style={{ color: c.sub }}>{user.email}</Text> : null}
      </Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>Thông báo</Text>
        <Pressable onPress={() => readAll.mutate()}><Text style={{ color: c.brand, fontWeight: "600" }}>Đọc hết</Text></Pressable>
      </View>
      {notes.isPending ? <Loading /> : notes.isError ? <ErrorBox error={notes.error} retry={() => notes.refetch()} /> :
        notes.data.data.length ? notes.data.data.map((n) => (
          <Pressable key={n.id} onPress={() => !n.read_at && read.mutate(n.id)}>
            <Card style={!n.read_at ? s.unread : undefined}>
              <Text style={{ fontWeight: n.read_at ? "500" : "700" }}>{n.title}</Text>
              {n.body ? <Text style={{ color: c.sub, marginTop: 2 }}>{n.body}</Text> : null}
              <Text style={{ color: c.sub, fontSize: 11, marginTop: 4 }}>{when(n.created_at)}</Text>
            </Card>
          </Pressable>
        )) : <Text style={{ color: c.sub }}>Chưa có thông báo.</Text>}
      <Button label="Đăng xuất" onPress={logout} kind="ghost" />
    </ScrollView>
  )
}
const s = StyleSheet.create({ unread: { borderColor: c.brand, borderWidth: 1 } })
