import { useState } from "react"
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native"
import { Pressable } from "../../src/press"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../../src/api"
import { day, num, vnd, vndShort, when } from "../../src/format"
import { Button, Empty, ErrorBox, Loading, t, PullRefresh } from "../../src/ui"
import { LargeTitle, tap, useOwnScroll } from "../../src/chrome"
import { Hero, HeroStat } from "../../src/detail"
import { Notice } from "../../src/form"
import { Text, TextInput } from "../../src/text"
import { shadow } from "../../src/theme"
import { prompt } from "../../src/prompt"
import { useRouter } from "expo-router"
import { sheet } from "../../src/theme"

type Withdrawal = { id: string; amount: number; tax?: number; net?: number; status: "pending" | "paid" | "rejected" | "cancelled"; bank?: string; note?: string; requested_at: string; decided_at?: string | null }
type Credit = { id: string; period: string; gross?: number; tax?: number; amount: number; note: string; created_at: string; release_at?: string | null }
type Wallet = {
  member: boolean
  balance?: { credited: number; held?: number; next_release?: string | null; pending: number; withdrawn: number; available: number }
  bank?: { bank_name: string; bank_account_number: string; bank_account_name: string; ready: boolean; kyc_done: boolean }
  min_amount?: number
  credits?: Credit[]
  withdrawals?: Withdrawal[]
}
const stateOf = (k: string) => {
  const m = {
  pending: { label: "Chờ chuyển", color: t.warn, soft: t.warnSoft, icon: "time-outline" },
  paid: { label: "Đã chuyển", color: t.ok, soft: t.okSoft, icon: "checkmark-circle-outline" },
  rejected: { label: "Bị từ chối", color: t.bad, soft: t.badSoft, icon: "close-circle-outline" },
  cancelled: { label: "Đã hủy", color: t.sub, soft: t.fill, icon: "remove-circle-outline" },
  } as const
  return m[k as keyof typeof m] ?? m.pending
}
const digits = (v: string) => Number(v.replace(/\D/g, "")) || 0

export default function WalletScreen() {
  const qc = useQueryClient()
  const router = useRouter()
  const keep = useOwnScroll()
  const insets = useSafeAreaInsets()
  const [sheet, setSheet] = useState(false)
  const [amount, setAmount] = useState("")
  const [tab, setTab] = useState<"out" | "in">("out")
  const q = useQuery({ queryKey: ["wallet"], queryFn: () => api<{ data: Wallet }>("/api/v1/wallet").then((r) => r.data) })
  const done = () => qc.invalidateQueries({ queryKey: ["wallet"] })
  const withdraw = useMutation({
    mutationFn: (n: number) => api("/api/v1/wallet/withdraw", { method: "POST", body: { amount: n } }),
    onSuccess: () => { setAmount(""); setSheet(false); void done(); Alert.alert("Đã gửi yêu cầu rút tiền", "Yêu cầu đang chờ chuyển khoản.") },
    onError: (e: Error) => Alert.alert("Không rút được", e.message),
  })
  const cancel = useMutation({
    mutationFn: (v: { id: string; reason: string }) => api(`/api/v1/wallet/withdrawals/${v.id}/cancel`, { method: "POST", body: { reason: v.reason } }),
    onSuccess: () => { void done() },
    onError: (e: Error) => Alert.alert("Không hủy được", e.message),
  })
  if (q.isPending) return <View style={{ flex: 1, backgroundColor: t.bg }}><LargeTitle title="Ví" /><Loading rows={3} /></View>
  if (q.isError) return <View style={{ flex: 1, backgroundColor: t.bg }}><LargeTitle title="Ví" /><ErrorBox error={q.error} retry={() => q.refetch()} /></View>
  const w = q.data
  if (!w.member) return <View style={{ flex: 1, backgroundColor: t.bg }}><LargeTitle title="Ví" /><Empty text="Tài khoản này không có hồ sơ thành viên nên không có ví." icon="wallet-outline" /></View>
  const b = w.balance ?? { credited: 0, pending: 0, withdrawn: 0, available: 0 }
  const min = w.min_amount ?? 0
  const n = digits(amount)
  const blocked = !w.bank ? "Chưa có tài khoản nhận tiền. Cập nhật trên bản web trước khi rút." : !w.bank.kyc_done ? "Cần định danh (eKYC) trước khi rút tiền." : !w.bank.ready ? "Thông tin ngân hàng chưa đầy đủ. Bổ sung trên bản web." : ""
  const why = n <= 0 ? "" : n < min ? `Số tiền tối thiểu là ${vnd(min)}.` : n > b.available ? "Vượt quá số dư có thể rút." : ""
  const ok = !blocked && n > 0 && !why
  const confirm = () => Alert.alert("Xác nhận rút tiền", `Rút ${vnd(n)} về ${w.bank?.bank_name} ${w.bank?.bank_account_number}?`, [{ text: "Hủy", style: "cancel" }, { text: "Rút tiền", onPress: () => withdraw.mutate(n) }])
  const askCancel = (x: Withdrawal) => void prompt({ title: "Hủy yêu cầu rút", message: `Hủy yêu cầu rút ${vnd(x.amount)}? Nhập lý do:`, ok: "Hủy yêu cầu" }).then((reason) => { if (reason?.trim()) cancel.mutate({ id: x.id, reason: reason.trim() }) })
  const outs = w.withdrawals ?? [], ins = w.credits ?? []

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LargeTitle title="Ví" />
      <ScrollView showsVerticalScrollIndicator={false} {...keep} contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 110, gap: 16 }} refreshControl={<PullRefresh run={() => Promise.all([q.refetch()])} />}>
        <Hero>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#C9D6F5" }}>Số dư có thể rút</Text>
            <Ionicons name="wallet" size={22} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={{ color: "#fff", fontSize: 36, fontWeight: "800" }} numberOfLines={1} adjustsFontSizeToFit>{vnd(b.available)}</Text>
          {w.bank ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="card-outline" size={16} color="#C9D6F5" />
              <Text style={{ color: "#fff", flex: 1 }} numberOfLines={1}>{[w.bank.bank_name, w.bank.bank_account_number].filter(Boolean).join(" · ")}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <HeroStat k="Chờ chuyển" v={vndShort(b.pending)} />
            <HeroStat k="Tạm giữ" v={vndShort(b.held)} />
            <HeroStat k="Đã rút" v={vndShort(b.withdrawn)} />
          </View>
          {(b.held ?? 0) > 0 && b.next_release ? <Text style={{ color: "#C9D6F5", fontSize: 12 }}>Phần tạm giữ rút được từ {day(b.next_release)}.</Text> : null}
          <Pressable onPress={() => { tap(); setSheet(true) }} disabled={!!blocked} style={({ pressed }) => [s.cta, (pressed || !!blocked) && { opacity: 0.7 }]}>
            <Ionicons name="arrow-down-circle" size={20} color={t.navy} /><Text style={{ color: t.navy, fontWeight: "800", fontSize: 15 }}>Rút tiền</Text>
          </Pressable>
        </Hero>
        {blocked ? <Notice tone="warn" text={blocked} /> : null}
        {w.bank && !w.bank.kyc_done ? <Button label="Định danh ngay trong app" icon="shield-checkmark-outline" onPress={() => router.push("/ekyc")} /> : null}

        <View style={s.seg}>
          {([["out", `Lịch sử rút (${num(outs.length)})`], ["in", `Hoa hồng theo kỳ (${num(ins.length)})`]] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => { tap(); setTab(k) }} style={[s.segItem, tab === k && s.segOn]}><Text style={{ color: tab === k ? t.navy : t.sub, fontWeight: "700", fontSize: 13 }}>{l}</Text></Pressable>
          ))}
        </View>

        {tab === "out" ? (outs.length ? outs.map((x) => {
          const st = stateOf(x.status)
          return (
            <View key={x.id} style={s.row}>
              <View style={[s.icon, { backgroundColor: st.soft }]}><Ionicons name={st.icon} size={20} color={st.color} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: "800", color: t.text, fontSize: 16 }}>{vnd(x.amount)}</Text>
                <Text style={{ color: t.sub, fontSize: 12 }}>{when(x.requested_at)}{x.tax ? ` · Thuế ${vnd(x.tax)}` : ""}</Text>
                {x.tax && x.net != null ? <Text style={{ color: t.sub, fontSize: 12 }}>Thực nhận {vnd(x.net)}</Text> : null}
                {x.note ? <Text style={{ color: t.text, fontSize: 12 }}>{x.note}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <View style={{ backgroundColor: st.soft, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>{st.label}</Text></View>
                {x.status === "pending" ? <Pressable onPress={() => askCancel(x)} hitSlop={8}><Text style={{ color: t.bad, fontSize: 12, fontWeight: "700" }}>Hủy yêu cầu</Text></Pressable> : null}
              </View>
            </View>
          )
        }) : <Text style={s.none}>Chưa có yêu cầu rút nào.</Text>) : (ins.length ? ins.map((c) => (
          <View key={c.id} style={s.row}>
            <View style={[s.icon, { backgroundColor: t.goldSoft }]}><Ionicons name="trending-up" size={20} color={t.gold} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: "700", color: t.text }}>Kỳ {c.period}</Text>
              <Text style={{ color: t.sub, fontSize: 12 }}>Ghi nhận {day(c.created_at)}{c.release_at ? ` · rút được từ ${day(c.release_at)}` : ""}</Text>
              {c.note ? <Text style={{ color: t.text, fontSize: 12 }}>{c.note}</Text> : null}
            </View>
            <Text style={{ color: t.ok, fontWeight: "800", fontSize: 15 }}>+{vnd(c.amount)}</Text>
          </View>
        )) : <Text style={s.none}>Chưa có kỳ hoa hồng nào được ghi vào ví.</Text>)}
      </ScrollView>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(15,27,61,0.4)" }} onPress={() => setSheet(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.grab} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Rút tiền</Text>
            <Text style={{ color: t.sub }}>Có thể rút {vnd(b.available)} · Tối thiểu {vnd(min)}</Text>
            <View style={s.amount}>
              <TextInput style={{ flex: 1, fontSize: 28, fontWeight: "800", color: t.text, paddingVertical: 12 }} placeholder="0" placeholderTextColor={t.line} keyboardType="number-pad" autoFocus value={n ? num(n) : ""} onChangeText={setAmount} />
              <Text style={{ fontSize: 20, fontWeight: "700", color: t.sub }}>đ</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[["Tối thiểu", min], ["50%", Math.floor(b.available / 2)], ["Tất cả", b.available]].filter(([, v]) => Number(v) > 0 && Number(v) <= b.available).map(([l, v]) => (
                <Pressable key={String(l)} onPress={() => { tap(); setAmount(String(v)) }} style={s.quick}><Text style={{ color: t.navy, fontWeight: "700", fontSize: 13 }}>{l}</Text></Pressable>
              ))}
            </View>
            {why ? <Text style={{ color: t.bad, fontSize: 13 }}>{why}</Text> : null}
            {w.bank ? <Text style={{ color: t.sub, fontSize: 13 }}>Về: {[w.bank.bank_name, w.bank.bank_account_number, w.bank.bank_account_name].filter(Boolean).join(" · ")}</Text> : null}
            <Button label="Gửi yêu cầu rút" onPress={confirm} busy={withdraw.isPending} disabled={!ok} />
            <Text style={{ color: t.sub, fontSize: 11, textAlign: "center" }}>Thuế TNCN (nếu có) được giữ lại khi rút.</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
const s = sheet(() => StyleSheet.create({
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.card, borderRadius: 14, paddingVertical: 13 },
  seg: { flexDirection: "row", backgroundColor: t.fill, borderRadius: 12, padding: 3 },
  segItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10 },
  segOn: { backgroundColor: t.card, ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.card, borderRadius: 16, padding: 12, ...shadow },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  none: { color: t.sub, textAlign: "center", paddingVertical: 20 },
  sheet: { backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  grab: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: t.line },
  amount: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 2, borderBottomColor: t.navy },
  quick: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: t.navySoft },
}))
