import { useMemo, useState } from "react"
import { FlatList, ScrollView, StyleSheet, View } from "react-native"
import { Pressable } from "../../src/press"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { KYC_STATE, useKycAdmin } from "../../src/hooks"
import { num, when } from "../../src/format"
import { Avatar, Empty, ErrorBox, Loading, t, PullRefresh } from "../../src/ui"
import { Glass, Pager, TopBar, tap, usePager } from "../../src/chrome"
import { Text, TextInput } from "../../src/text"
import { shadow } from "../../src/theme"
import { sheet } from "../../src/theme"

export const unix = (n?: number) => (n ? when(new Date(n * (n < 1e12 ? 1000 : 1)).toISOString()) : "")

export default function KycList() {
  const router = useRouter()
  const q = useKycAdmin()
  const [term, setTerm] = useState("")
  const [status, setStatus] = useState("pending")
  const base = useMemo(() => {
    const k = term.trim().toLowerCase()
    return (q.data ?? []).filter((x) => !k || [x.display_name, x.kyc.full_name, x.email, x.rd_code, x.kyc.id_number].some((v) => (v ?? "").toLowerCase().includes(k)))
  }, [q.data, term])
  const counts = useMemo(() => base.reduce<Record<string, number>>((a, x) => ((a[x.kyc.status] = (a[x.kyc.status] ?? 0) + 1), a), {}), [base])
  const rows = useMemo(() => base.filter((x) => !status || x.kyc.status === status), [base, status])
  const pg = usePager(rows, 20, `${term}|${status}`)
  if (!q.on) return <View style={{ flex: 1 }}><TopBar title="Duyệt định danh" /><Empty text="Chỉ Admin và Sale Admin duyệt định danh." icon="lock-closed-outline" /></View>
  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Duyệt định danh" /><Loading /></View>
  if (q.isError) return <View style={{ flex: 1 }}><TopBar title="Duyệt định danh" /><ErrorBox error={q.error} retry={() => q.refetch()} /></View>
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Duyệt định danh" />
      <FlatList showsVerticalScrollIndicator={false}
        data={pg.rows}
        keyExtractor={(x) => x.kyc.user_id}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1, paddingBottom: 40 }}
        refreshControl={<PullRefresh run={() => Promise.all([q.refetch()])} />}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 4 }}>
            <Glass style={s.search}><Ionicons name="search" size={18} color={t.sub} /><TextInput style={{ flex: 1, paddingVertical: 11, color: t.text }} placeholder="Tên, email, mã RD, số CCCD…" placeholderTextColor={t.sub} value={term} onChangeText={setTerm} autoCorrect={false} autoCapitalize="none" /></Glass>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(["pending", "approved", "rejected", "requested"] as const).map((k) => (
                <Pressable key={k} onPress={() => setStatus(status === k ? "" : k)} style={[s.st, status === k && { backgroundColor: KYC_STATE[k]!.color, borderColor: KYC_STATE[k]!.color }]}><Text style={[s.stText, status === k && { color: "#fff" }]}>{KYC_STATE[k]!.label} · {num(counts[k] ?? 0)}</Text></Pressable>
              ))}
              <Pressable onPress={() => setStatus("")} style={[s.st, !status && { backgroundColor: t.solid, borderColor: t.solid }]}><Text style={[s.stText, !status && { color: "#fff" }]}>Tất cả · {num(base.length)}</Text></Pressable>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<View style={{ alignItems: "center", gap: 10, paddingTop: 40 }}><Ionicons name="shield-checkmark-outline" size={44} color={t.line} /><Text style={{ color: t.sub }}>{status === "pending" ? "Không còn hồ sơ nào chờ duyệt." : "Không có hồ sơ phù hợp."}</Text></View>}
        ListFooterComponent={<Pager page={pg.page} pages={pg.pages} total={pg.total} size={pg.size} unit="hồ sơ" onPage={pg.setPage} />}
        renderItem={({ item: x }) => {
          const st = KYC_STATE[x.kyc.status] ?? KYC_STATE.none!
          return (
            <Pressable onPress={() => { tap(); router.push(`/kyc/${x.kyc.user_id}`) }} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
              <Avatar name={x.kyc.full_name || x.display_name} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{x.kyc.full_name || x.display_name || x.email}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }} numberOfLines={1}>{[x.rd_code, x.email].filter(Boolean).join(" · ")}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }}>Gửi {unix(x.kyc.submitted_at) || "—"}</Text>
              </View>
              <View style={{ backgroundColor: st.soft, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>{st.label}</Text></View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}
const s = sheet(() => StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, paddingHorizontal: 14, overflow: "hidden" },
  st: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  stText: { color: t.text, fontWeight: "700", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.card, borderRadius: 16, padding: 12, ...shadow },
}))
