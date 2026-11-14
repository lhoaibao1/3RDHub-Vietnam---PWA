import { useState } from "react"
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../../src/api"
import { day, vnd, when } from "../../src/format"
import { Button, Card, ErrorBox, Loading, Pill, SectionTitle, t } from "../../src/ui"
import { LargeTitle } from "../../src/chrome"

type Wallet = {
  member: boolean
  balance?: { credited: number; held?: number; next_release?: string | null; pending: number; withdrawn: number; available: number }
  bank?: { bank_name: string; bank_account_number: string; bank_account_name: string; ready: boolean; kyc_done: boolean }
  min_amount?: number
  credits?: { id: string; period: string; amount: number; note: string; created_at: string }[]
  withdrawals?: { id: string; amount: number; net?: number; status: "pending" | "paid" | "rejected" | "cancelled"; requested_at: string }[]
}
const LABEL = { pending: ["Chờ chuyển", "warn"], paid: ["Đã chuyển", "ok"], rejected: ["Bị từ chối", "bad"], cancelled: ["Đã hủy", "gray"] } as const

export default function WalletScreen() {
  const qc = useQueryClient()
  const [amount, setAmount] = useState("")
  const q = useQuery({ queryKey: ["wallet"], queryFn: () => api<{ data: Wallet }>("/api/v1/wallet").then((r) => r.data) })
  const withdraw = useMutation({
    mutationFn: (n: number) => api("/api/v1/wallet/withdraw", { method: "POST", body: { amount: n } }),
    onSuccess: () => { setAmount(""); void qc.invalidateQueries({ queryKey: ["wallet"] }); Alert.alert("Đã gửi yêu cầu rút tiền", "Yêu cầu đang chờ xử lý.") },
    onError: (e: Error) => Alert.alert("Không rút được", e.message),
  })
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const w = q.data
  const b = w.balance ?? { credited: 0, pending: 0, withdrawn: 0, available: 0 }
  const n = Number(amount.replace(/\D/g, ""))
  const blocked = !w.bank ? "Chưa có tài khoản nhận tiền. Cập nhật trên web trước." : !w.bank.kyc_done ? "Cần xác minh danh tính (KYC) trên web trước khi rút." : !w.bank.ready ? "Thông tin ngân hàng chưa đầy đủ." : ""
  const ok = !blocked && n > 0 && n <= b.available && n >= (w.min_amount ?? 0)
  const confirm = () => Alert.alert("Xác nhận rút tiền", `Rút ${vnd(n)} về ${w.bank?.bank_name} ${w.bank?.bank_account_number}?`, [{ text: "Hủy", style: "cancel" }, { text: "Rút", onPress: () => withdraw.mutate(n) }])
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
    <LargeTitle title="Ví" />
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 110, gap: 14 }} refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { void q.refetch() }} tintColor={t.navy} />}>
      <LinearGradient colors={[t.navy, t.navy2]} style={s.hero}>
        <Text style={{ color: "#C9D6F5" }}>Số dư có thể rút</Text>
        <Text style={{ color: "#fff", fontSize: 34, fontWeight: "900" }}>{vnd(b.available)}</Text>
        <View style={{ flexDirection: "row", gap: 18, marginTop: 8 }}>
          <View><Text style={s.k}>Chờ về ví</Text><Text style={s.v}>{vnd(b.pending)}</Text></View>
          <View><Text style={s.k}>Đã rút</Text><Text style={s.v}>{vnd(b.withdrawn)}</Text></View>
          <View><Text style={s.k}>Tổng ghi nhận</Text><Text style={s.v}>{vnd(b.credited)}</Text></View>
        </View>
        {(b.held ?? 0) > 0 ? <Text style={{ color: "#C9D6F5", fontSize: 12, marginTop: 6 }}>Tạm giữ {vnd(b.held)}{b.next_release ? ` · rút được từ ${day(b.next_release)}` : ""}</Text> : null}
      </LinearGradient>
      <Card style={{ gap: 10 }}>
        <Text style={{ fontWeight: "800", fontSize: 15, color: t.text }}>Rút tiền</Text>
        {w.bank ? <Text style={{ color: t.sub, fontSize: 13 }}>{[w.bank.bank_name, w.bank.bank_account_number, w.bank.bank_account_name].filter(Boolean).join(" · ")}</Text> : null}
        {blocked ? <Text style={{ color: t.warn }}>{blocked}</Text> : (
          <>
            <TextInput style={s.input} placeholder={`Số tiền (tối thiểu ${vnd(w.min_amount)})`} placeholderTextColor={t.sub} keyboardType="number-pad" value={amount} onChangeText={setAmount} />
            <Button label="Gửi yêu cầu rút" onPress={confirm} busy={withdraw.isPending} disabled={!ok} icon="arrow-down-circle-outline" />
          </>
        )}
      </Card>
      <SectionTitle title="Lịch sử rút" />
      {(w.withdrawals ?? []).map((x) => (
        <Card key={x.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 3 }}><Text style={{ fontWeight: "800", color: t.text }}>{vnd(x.amount)}</Text><Text style={{ color: t.sub, fontSize: 12 }}>{when(x.requested_at)}</Text></View>
          <Pill label={LABEL[x.status][0]} tone={LABEL[x.status][1]} />
        </Card>
      ))}
      {!(w.withdrawals ?? []).length ? <Text style={{ color: t.sub }}>Chưa có yêu cầu rút nào.</Text> : null}
      {(w.credits ?? []).length ? <SectionTitle title="Hoa hồng đã vào ví" /> : null}
      {(w.credits ?? []).slice(0, 20).map((c) => (
        <Card key={c.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: "700", color: t.text }}>Kỳ {c.period}</Text><Text style={{ color: t.sub, fontSize: 12 }}>{day(c.created_at)}{c.note ? ` · ${c.note}` : ""}</Text></View>
          <Text style={{ color: t.ok, fontWeight: "800" }}>+{vnd(c.amount)}</Text>
        </Card>
      ))}
    </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({
  hero: { borderRadius: 20, padding: 18, gap: 2 },
  k: { color: "#C9D6F5", fontSize: 11 }, v: { color: "#fff", fontWeight: "800", fontSize: 13 },
  input: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.line, borderRadius: 12, padding: 13, fontSize: 16, color: t.text },
})
