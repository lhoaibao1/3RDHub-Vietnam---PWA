import { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { api } from "../../src/api"
import { useCampaigns } from "../../src/hooks"
import { num } from "../../src/format"
import { TopBar } from "../../src/chrome"
import { Field, Notice } from "../../src/form"
import { FilterButton, PickerSheet } from "../../src/sheet"
import { Button, Card, t } from "../../src/ui"
import { Text } from "../../src/text"

// Báo đơn thất lạc: POST /lost-orders {order_code*, customer_phone, campaign_name, occurred_at (yyyy-mm-dd), sale_amount, description}.
const toYMD = (v: string) => { const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); return m ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` : "" }

export default function LostNew() {
  const router = useRouter()
  const qc = useQueryClient()
  const camps = useCampaigns()
  const [f, setF] = useState({ order: "", camp: "", phone: "", date: "", amount: "", desc: "" })
  const [pick, setPick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const amount = Number(f.amount.replace(/\D/g, "")) || 0
  const badDate = !!f.date.trim() && !toYMD(f.date)
  const submit = async () => {
    setBusy(true); setError("")
    try {
      await api("/api/v1/lost-orders", { method: "POST", body: { order_code: f.order.trim(), customer_phone: f.phone.replace(/\s/g, ""), campaign_name: f.camp, occurred_at: toYMD(f.date), sale_amount: amount, description: f.desc.trim() } })
      await qc.invalidateQueries({ queryKey: ["lost"] })
      Alert.alert("Đã gửi phiếu", "3RD đã tiếp nhận, bạn theo dõi tiến độ trong danh sách phiếu.")
      router.back()
    } catch (e) { setError(e instanceof Error ? (/order_code/.test(e.message) ? "Vui lòng nhập mã đơn." : e.message) : "Chưa gửi được.") } finally { setBusy(false) }
  }
  const opts = [{ value: "", label: "Chưa rõ chiến dịch" }, ...(camps.data ?? []).map((c) => ({ value: c.name, label: c.name, sub: c.offer?.category })).sort((a, b) => a.label.localeCompare(b.label, "vi"))]
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Báo đơn thất lạc" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Notice tone="warn" text="Dùng khi khách đã hoàn tất (giải ngân / mở thẻ…) mà hệ thống chưa ghi nhận đơn. Điền càng đủ thì đối soát càng nhanh." />
          <Card style={{ gap: 12 }}>
            <Field icon="pricetag-outline" label="Mã đơn / mã hồ sơ *" placeholder="Mã đối tác cấp cho khách" value={f.order} onChangeText={set("order")} autoCapitalize="characters" autoCorrect={false} />
            <View style={{ gap: 6 }}>
              <Text style={{ color: t.text, fontWeight: "700", fontSize: 13 }}>Chiến dịch</Text>
              <View style={{ flexDirection: "row" }}><FilterButton label="Chọn chiến dịch" value={f.camp} active={!!f.camp} onPress={() => setPick(true)} /></View>
            </View>
            <Field icon="call-outline" label="SĐT khách hàng" placeholder="09xx xxx xxx" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
            <Field icon="calendar-outline" label="Ngày phát sinh" placeholder="dd/mm/yyyy" value={f.date} onChangeText={set("date")} keyboardType="numbers-and-punctuation" error={badDate ? "Nhập theo dạng dd/mm/yyyy, ví dụ 05/11/2026." : ""} />
            <Field icon="cash-outline" label="Giá trị đơn (đ)" placeholder="0" value={amount ? num(amount) : ""} onChangeText={set("amount")} keyboardType="number-pad" />
            <Field icon="chatbox-ellipses-outline" label="Mô tả" placeholder="Khách làm gì, lúc nào, qua link nào…" value={f.desc} onChangeText={set("desc")} multiline />
            {error ? <Notice text={error} /> : null}
            <Button label="Gửi phiếu" onPress={submit} busy={busy} disabled={!f.order.trim() || badDate} />
          </Card>
          <Text style={{ color: t.sub, fontSize: 12, textAlign: "center" }}>Ảnh bằng chứng có thể đính kèm sau trên bản web.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <PickerSheet open={pick} title="Chiến dịch" options={opts} value={f.camp} onPick={set("camp")} onClose={() => setPick(false)} />
    </View>
  )
}
