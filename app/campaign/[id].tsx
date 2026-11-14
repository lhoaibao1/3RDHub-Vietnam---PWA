import { useState } from "react"
import { Image, Linking, ScrollView, Share, StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import * as Clipboard from "expo-clipboard"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { abs, api } from "../../src/api"
import { Button, Card, ErrorBox, Loading, c } from "../../src/ui"

type Detail = { id: string; name: string; description?: string; status?: string; offer?: { banner_url?: string; category?: string; commission_rates?: { label?: string; name?: string; value?: number; rate?: number }[] } }
type Join = { status: string; eligibility: string; open?: boolean }
type Link = { id: string; code: string; url: string; campaign_id: string; status: string }

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const [url, setUrl] = useState("")
  const [msg, setMsg] = useState("")
  const camp = useQuery({ queryKey: ["campaign", id], queryFn: () => api<{ data: Detail }>(`/api/v1/campaigns/${id}`) })
  const join = useQuery({ queryKey: ["join", id], queryFn: () => api<{ data: Join }>(`/api/v1/campaigns/${id}/join`) })
  const links = useQuery({ queryKey: ["links"], queryFn: () => api<{ data: Link[] }>("/api/v1/tracking-links") })

  const register = useMutation({
    mutationFn: () => api<{ data: Join }>(`/api/v1/campaigns/${id}/join`, { method: "POST", body: {} }),
    onSuccess: (r) => { setMsg(r.data.status === "approved" ? "Đã tham gia, tạo link được rồi." : "Đã đăng ký, chờ duyệt."); void qc.invalidateQueries({ queryKey: ["join", id] }) },
    onError: (e: Error) => setMsg(e.message),
  })
  const make = useMutation({
    mutationFn: () => api<{ data: { url: string } }>("/api/v1/tracking-links", { method: "POST", body: { campaign_id: id } }),
    onSuccess: (r) => { setUrl(r.data.url); void qc.invalidateQueries({ queryKey: ["links"] }) },
    onError: (e: Error) => setMsg(e.message),
  })

  if (camp.isPending || join.isPending) return <Loading />
  if (camp.isError) return <ErrorBox error={camp.error} retry={() => camp.refetch()} />
  const d = camp.data.data, status = join.data?.data.status
  const mine = url || links.data?.data.find((l) => l.campaign_id === id && l.status === "active")?.url || ""
  const approved = status === "approved"
  const copy = async (u: string) => { await Clipboard.setStringAsync(u); setMsg("Đã sao chép link.") }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: d.name, headerBackTitle: "Quay lại" }} />
      {d.offer?.banner_url ? <Image source={{ uri: abs(d.offer.banner_url) }} style={s.banner} resizeMode="cover" /> : null}
      <Text style={s.title}>{d.name}</Text>
      {d.offer?.category ? <Text style={{ color: c.sub }}>{d.offer.category}</Text> : null}
      {d.offer?.commission_rates?.length ? (
        <Card>
          <Text style={s.h}>Hoa hồng</Text>
          {d.offer.commission_rates.map((r, i) => <Text key={i} style={{ marginTop: 4 }}>{r.label || r.name || "Mức"}: {r.value ?? r.rate ?? ""}</Text>)}
        </Card>
      ) : null}
      {d.description ? <Card><Text style={s.h}>Mô tả</Text><Text style={{ marginTop: 4 }}>{d.description.replace(/<[^>]+>/g, " ")}</Text></Card> : null}
      {msg ? <Text style={{ color: c.sub }}>{msg}</Text> : null}
      {approved ? (
        <View style={{ gap: 10 }}>
          {mine ? (
            <Card style={{ gap: 8 }}>
              <Text style={s.h}>Link giới thiệu của bạn</Text>
              <Text selectable style={{ color: c.brand }}>{mine}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Button label="Sao chép" onPress={() => copy(mine)} kind="ghost" /></View>
                <View style={{ flex: 1 }}><Button label="Chia sẻ" onPress={() => Share.share({ message: mine })} kind="ghost" /></View>
              </View>
            </Card>
          ) : null}
          <Button label={mine ? "Tạo link mới" : "Lấy link giới thiệu"} onPress={() => make.mutate()} busy={make.isPending} />
        </View>
      ) : status === "pending" ? <Text style={{ color: c.warn, fontWeight: "600" }}>Đăng ký đã gửi, đang chờ duyệt.</Text>
        : <Button label="Đăng ký tham gia" onPress={() => register.mutate()} busy={register.isPending} />}
      <Button label="Mở trên web" onPress={() => Linking.openURL(`${abs("/campaigns/")}${id}`)} kind="ghost" />
    </ScrollView>
  )
}
const s = StyleSheet.create({ banner: { width: "100%", height: 160, borderRadius: 14 }, title: { fontSize: 20, fontWeight: "800" }, h: { fontWeight: "700", fontSize: 15 } })
