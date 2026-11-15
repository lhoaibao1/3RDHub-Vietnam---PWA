import { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { api, upload } from "../../src/api"
import { appendPhotos, PhotoStrip, pickPhotos, type Picked } from "../../src/photos"
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
  const [photos, setPhotos] = useState<Picked[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const amount = Number(f.amount.replace(/\D/g, "")) || 0
  const badDate = !!f.date.trim() && !toYMD(f.date)
  const submit = async () => {
    setBusy(true); setError("")
    try {
      const made = await api<{ data: { id: string } }>("/api/v1/lost-orders", { method: "POST", body: { order_code: f.order.trim(), customer_phone: f.phone.replace(/\s/g, ""), campaign_name: f.camp, occurred_at: toYMD(f.date), sale_amount: amount, description: f.desc.trim() } })
      if (photos.length) {
        const form = new FormData()
        appendPhotos(form, "file", photos)
        await upload(`/api/v1/lost-orders/${made.data.id}/files`, form).catch(() => Alert.alert("Phiếu đã gửi, nhưng ảnh chưa tải lên được", "Mở phiếu trong danh sách để thêm ảnh lại."))
      }
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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
            <View style={{ gap: 8 }}>
              <Text style={{ color: t.text, fontWeight: "700", fontSize: 13 }}>Ảnh bằng chứng ({photos.length}/8)</Text>
              <PhotoStrip urls={photos.map((p) => p.uri)} onRemove={(i) => setPhotos((a) => a.filter((_, k) => k !== i))} />
              {photos.length < 8 ? <Button label="Thêm ảnh" kind="ghost" icon="image-outline" onPress={() => void pickPhotos(8 - photos.length).then((a) => setPhotos((old) => [...old, ...a].slice(0, 8)))} /> : null}
            </View>
            {error ? <Notice text={error} /> : null}
            <Button label="Gửi phiếu" onPress={submit} busy={busy} disabled={!f.order.trim() || badDate} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <PickerSheet open={pick} title="Chiến dịch" options={opts} value={f.camp} onPick={set("camp")} onClose={() => setPick(false)} />
    </View>
  )
}
