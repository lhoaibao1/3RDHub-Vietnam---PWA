import { useState } from "react"
import { Alert, Modal, Pressable, ScrollView, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Image } from "expo-image"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api, img } from "../../src/api"
import { KYC_STATE, useKycAdmin } from "../../src/hooks"
import { Button, Empty, Loading, t } from "../../src/ui"
import { TopBar, tap } from "../../src/chrome"
import { Chip2, Hero, InfoGroup, InfoRow } from "../../src/detail"
import { Notice } from "../../src/form"
import { Text } from "../../src/text"
import { unix } from "./index"
import { prompt } from "../../src/prompt"

const SIDES = [["front", "Mặt trước"], ["back", "Mặt sau"], ["portrait", "Chân dung"]] as const

export default function KycDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const q = useKycAdmin()
  const [zoom, setZoom] = useState("")
  const review = useMutation({
    mutationFn: (v: { decision: "approved" | "rejected"; note: string }) => api(`/api/v1/tenant/kyc/${id}/review`, { method: "POST", body: v }),
    onSuccess: async (_d, v) => { await qc.invalidateQueries({ queryKey: ["kyc-admin"] }); void qc.invalidateQueries({ queryKey: ["members"] }); Alert.alert(v.decision === "approved" ? "Đã duyệt định danh" : "Đã từ chối"); router.back() },
    onError: (e: Error) => Alert.alert("Chưa lưu được", /say why/.test(e.message) ? "Cần ghi lý do từ chối." : e.message),
  })
  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Hồ sơ định danh" /><Loading rows={3} /></View>
  const x = q.data?.find((r) => r.kyc.user_id === id)
  if (!x) return <View style={{ flex: 1 }}><TopBar title="Hồ sơ định danh" /><Empty text="Không tìm thấy hồ sơ này." icon="id-card-outline" /></View>
  const k = x.kyc, st = KYC_STATE[k.status] ?? KYC_STATE.none!
  const src = (side: string) => img(`/api/v1/tenant/kyc/${id}/${side}`)
  const approve = () => Alert.alert("Duyệt định danh", `Xác nhận giấy tờ của ${k.full_name || x.display_name} hợp lệ?`, [{ text: "Hủy", style: "cancel" }, { text: "Duyệt", onPress: () => review.mutate({ decision: "approved", note: "" }) }])
  const reject = () => void prompt({ title: "Từ chối định danh", message: "Ghi lý do để thành viên biết cần làm lại gì:", ok: "Từ chối" }).then((note) => { if (note === null) return; if (note.trim()) review.mutate({ decision: "rejected", note: note.trim() }); else Alert.alert("Cần ghi lý do từ chối") })
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Hồ sơ định danh" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 130 }}>
        <Hero>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{k.full_name || x.display_name || x.email}</Text>
          <Text style={{ color: "#C9D6F5" }}>{[x.rd_code, x.email].filter(Boolean).join(" · ")}</Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <Chip2 label={st.label} color={st.color} bg="#fff" />
            {k.submitted_at ? <Chip2 label={`Gửi ${unix(k.submitted_at)}`} /> : null}
          </View>
        </Hero>
        {k.note ? <Notice tone={k.status === "rejected" ? "bad" : "warn"} text={`Ghi chú: ${k.note}`} /> : null}
        <View style={{ gap: 8 }}>
          <Text style={{ color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 6 }}>Ảnh giấy tờ (chạm để phóng to)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {SIDES.map(([side, label]) => (
              <Pressable key={side} onPress={() => { tap(); setZoom(side) }} style={{ gap: 4 }}>
                <Image source={src(side)} style={{ width: 220, height: 140, borderRadius: 14, backgroundColor: t.line }} contentFit="cover" transition={150} />
                <Text style={{ color: t.sub, fontSize: 12, textAlign: "center" }}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <InfoGroup title="Thông tin trên giấy tờ">
          <InfoRow first icon="person-outline" color="#2563EB" label="Họ tên" value={k.full_name} />
          <InfoRow icon="id-card-outline" color="#7C3AED" label="Số CCCD" value={k.id_number} sub={k.old_id_number ? `Số cũ: ${k.old_id_number}` : undefined} copy={!!k.id_number} />
          <InfoRow icon="gift-outline" color="#DB2777" label="Ngày sinh" value={k.date_of_birth} />
          <InfoRow icon="male-female-outline" color="#0F766E" label="Giới tính" value={k.gender} />
          <InfoRow icon="location-outline" color="#B45309" label="Địa chỉ" value={k.address} />
          <InfoRow icon="calendar-outline" color="#475569" label="Ngày cấp · Nơi cấp" value={[k.issue_date, k.issue_place].filter(Boolean).join(" · ")} />
        </InfoGroup>
        <InfoGroup title="Thiết bị gửi">
          <InfoRow first icon="phone-portrait-outline" color="#6B7280" label="Thiết bị" value={k.device} />
          <InfoRow icon="globe-outline" color="#6B7280" label="IP" value={k.ip} />
          {k.reviewed_at ? <InfoRow icon="checkmark-done-outline" color="#15803D" label="Đã xét lúc" value={unix(k.reviewed_at)} /> : null}
        </InfoGroup>
      </ScrollView>
      {k.status === "pending" ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, padding: 16, paddingBottom: 28, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: t.line }}>
          <View style={{ flex: 1 }}><Button label="Từ chối" kind="ghost" onPress={reject} disabled={review.isPending} /></View>
          <View style={{ flex: 1.4 }}><Button label="Duyệt" icon="checkmark-circle-outline" onPress={approve} busy={review.isPending} /></View>
        </View>
      ) : null}
      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom("")}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" }} onPress={() => setZoom("")}>
          {zoom ? <Image source={src(zoom)} style={{ width: "100%", height: "80%" }} contentFit="contain" /> : null}
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 12 }}>Chạm để đóng</Text>
        </Pressable>
      </Modal>
    </View>
  )
}
