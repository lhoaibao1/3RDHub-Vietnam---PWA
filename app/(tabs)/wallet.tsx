import { useState } from "react"
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../../src/api"
import { Button, Card, ErrorBox, Loading, c, vnd, when } from "../../src/ui"

type Wallet = {
  member: boolean
  balance?: { credited: number; pending: number; withdrawn: number; available: number }
  bank?: { bank_name: string; bank_account_number: string; bank_account_name: string; ready: boolean; kyc_done: boolean }
  min_amount?: number
  withdrawals?: { id: string; amount: number; net?: number; status: "pending" | "paid" | "rejected" | "cancelled"; requested_at: string }[]
}
const LABEL = { pending: ["Chờ chuyển", c.warn], paid: ["Đã chuyển", c.ok], rejected: ["Bị từ chối", c.bad], cancelled: ["Đã hủy", c.sub] } as const

export default function WalletScreen() {
  const qc = useQueryClient()
  const [amount, setAmount] = useState("")
  const q = useQuery({ queryKey: ["wallet"], queryFn: () => api<{ data: Wallet }>("/api/v1/wallet") })
  const withdraw = useMutation({
    mutationFn: (n: number) => api("/api/v1/wallet/withdraw", { method: "POST", body: { amount: n } }),
    onSuccess: () => { setAmount(""); void qc.invalidateQueries({ queryKey: ["wallet"] }); Alert.alert("Đã gửi yêu cầu rút tiền") },
    onError: (e: Error) => Alert.alert("Không rút được", e.message),
  })
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const w = q.data.data
  const b = w.balance ?? { credited: 0, pending: 0, withdrawn: 0, available: 0 }
  const n = Number(amount.replace(/\D/g, ""))
  const blocked = !w.bank ? "Chưa có tài khoản nhận tiền. Cập nhật trên web trước." : !w.bank.kyc_done ? "Cần xác minh danh tính (KYC) trên web trước khi rút." : !w.bank.ready ? "Thông tin ngân hàng chưa đầy đủ." : ""
  const ok = !blocked && n > 0 && n <= b.available && n >= (w.min_amount ?? 0)
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => { void q.refetch() }} />}>
      <Card>
        <Text style={s.sub}>Số dư có thể rút</Text>
        <Text style={s.big}>{vnd(b.available)}</Text>
        <Text style={s.sub}>Chờ về ví: {vnd(b.pending)} · Đã rút: {vnd(b.withdrawn)}</Text>
      </Card>
      <Card style={{ gap: 10 }}>
        <Text style={s.h}>Rút tiền</Text>
        {w.bank ? <Text style={s.sub}>{[w.bank.bank_name, w.bank.bank_account_number, w.bank.bank_account_name].filter(Boolean).join(" · ")}</Text> : null}
        {blocked ? <Text style={{ color: c.warn }}>{blocked}</Text> : (
          <>
            <TextInput style={s.input} placeholder={`Số tiền (tối thiểu ${vnd(w.min_amount)})`} keyboardType="number-pad" value={amount} onChangeText={setAmount} />
            <Button label="Gửi yêu cầu rút" onPress={() => withdraw.mutate(n)} busy={withdraw.isPending} disabled={!ok} />
          </>
        )}
      </Card>
      <Text style={s.h}>Lịch sử rút</Text>
      {(w.withdrawals ?? []).map((x) => (
        <Card key={x.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View><Text style={{ fontWeight: "600" }}>{vnd(x.amount)}</Text><Text style={s.sub}>{when(x.requested_at)}</Text></View>
          <Text style={{ color: LABEL[x.status][1], fontWeight: "600" }}>{LABEL[x.status][0]}</Text>
        </Card>
      ))}
      {!(w.withdrawals ?? []).length ? <Text style={s.sub}>Chưa có yêu cầu rút nào.</Text> : null}
    </ScrollView>
  )
}
const s = StyleSheet.create({ sub: { color: c.sub, fontSize: 13 }, big: { fontSize: 28, fontWeight: "800", marginVertical: 4 }, h: { fontWeight: "700", fontSize: 15 }, input: { borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, fontSize: 16 } })
