import { useEffect, useState } from "react"
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { WebView } from "react-native-webview"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { abs, api, ApiError, img } from "../src/api"
import { TopBar, tap } from "../src/chrome"
import { Chip2, Hero, InfoGroup, InfoRow } from "../src/detail"
import { Field, Notice } from "../src/form"
import { when } from "../src/format"
import { Button, Card, ErrorBox, Loading, t } from "../src/ui"
import { Text } from "../src/text"

// Ký hợp đồng dịch vụ ngay trong app (owner, 2026-11-15), dùng API của trang ký trên web:
//   GET /contract → hợp đồng hiện tại ({status: "none"} nếu chưa được yêu cầu)   GET /contract/file → file PDF (Bearer)
//   POST /contract/handoff → {url: …?token=X}   POST /econtract/open {token} → {session}
//   (header X-Contract-Token: session)  POST /econtract/otp → gửi mã về email   POST /econtract/sign {code, agree: true}
type Contract = {
  status: string; number?: string; version?: number; requested_at?: string; missing?: string[]
  signed_at?: string; signed_name?: string; signed_email?: string; approved_at?: string; close_reason?: string; company_signed?: boolean
}
const STATE: Record<string, { label: string; color: string; hint: string }> = {
  none: { label: "Chưa có hợp đồng", color: "#6B7280", hint: "Bạn chưa được yêu cầu ký hợp đồng. Khi có, app sẽ báo ở đây." },
  requested: { label: "Chờ bạn ký", color: "#B45309", hint: "Đọc hợp đồng rồi ký bằng mã gửi về email của bạn." },
  signed: { label: "Đã ký, chờ duyệt", color: "#2563EB", hint: "Bạn đã ký. Công ty đang kiểm tra và ký xác nhận." },
  approved: { label: "Đã hoàn tất", color: "#15803D", hint: "Hợp đồng đã có hiệu lực." },
  closed: { label: "Đã đóng", color: "#6B7280", hint: "Hợp đồng này đã được đóng." },
  cancelled: { label: "Đã hủy", color: "#6B7280", hint: "Yêu cầu ký hợp đồng đã được hủy." },
}

export default function ContractScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const q = useQuery({ queryKey: ["contract"], queryFn: () => api<{ data: Contract }>("/api/v1/contract").then((r) => r.data) })
  const [view, setView] = useState(false)
  const [session, setSession] = useState("")
  const [mail, setMail] = useState("")
  const [code, setCode] = useState("")
  const [agree, setAgree] = useState(false)
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState<"" | "start" | "otp" | "sign">("")
  const [error, setError] = useState("")
  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])
  const head = session ? { "X-Contract-Token": session } : undefined
  const msg = (e: unknown) => (e instanceof Error ? e.message : "Chưa làm được, thử lại sau.")

  const openFile = async () => {
    tap()
    if (Platform.OS !== "web") { setView(true); return }
    // Web: tải file kèm token rồi mở ở tab mới.
    try {
      const src = img("/api/v1/contract/file")!
      const blob = await (await fetch(src.uri, { headers: src.headers })).blob()
      globalThis.open?.(URL.createObjectURL(blob), "_blank")
    } catch { void Linking.openURL(abs("/account/contract")) }
  }
  const sendCode = async (s = session) => {
    setBusy("otp"); setError("")
    try {
      const r = await api<{ data: { email?: string; wait?: number } }>("/api/v1/econtract/otp", { method: "POST", headers: { "X-Contract-Token": s } })
      setMail(r.data.email ?? ""); setWait(r.data.wait ?? 60)
    } catch (e) { setError(msg(e)) } finally { setBusy("") }
  }
  const start = async () => {
    setBusy("start"); setError("")
    try {
      const h = await api<{ data: { url: string } }>("/api/v1/contract/handoff", { method: "POST", body: {} })
      const token = (h.data.url.match(/[?&]token=([^&]+)/) ?? [])[1]
      if (!token) throw new Error("Máy chủ không trả về phiên ký.")
      const o = await api<{ data: { session: string } }>("/api/v1/econtract/open", { method: "POST", body: { token: decodeURIComponent(token) } })
      setSession(o.data.session)
      await sendCode(o.data.session)
    } catch (e) { setError(e instanceof ApiError && e.code === "incomplete" ? `${e.message}. Bổ sung trong hồ sơ (bản web) rồi quay lại ký.` : msg(e)) } finally { setBusy("") }
  }
  const sign = async () => {
    setBusy("sign"); setError("")
    try {
      await api("/api/v1/econtract/sign", { method: "POST", body: { code: code.trim(), agree: true }, headers: head })
      setSession(""); setCode(""); setAgree(false)
      await qc.invalidateQueries({ queryKey: ["contract"] }); void qc.invalidateQueries({ queryKey: ["account"] }); void qc.invalidateQueries({ queryKey: ["wallet"] })
      Alert.alert("Đã ký hợp đồng", "Công ty sẽ kiểm tra và ký xác nhận. Bạn sẽ nhận thông báo khi hoàn tất.")
    } catch (e) { setError(msg(e)) } finally { setBusy("") }
  }

  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Hợp đồng" /><Loading rows={2} /></View>
  if (q.isError) return <View style={{ flex: 1 }}><TopBar title="Hợp đồng" /><ErrorBox error={q.error} retry={() => q.refetch()} /></View>
  const c = q.data, st = STATE[c.status] ?? { label: c.status, color: "#6B7280", hint: "" }
  const has = c.status !== "none"
  const file = img("/api/v1/contract/file")
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Hợp đồng" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Hero>
          <Ionicons name="document-text-outline" size={32} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Hợp đồng dịch vụ</Text>
          {c.number ? <Text style={{ color: "#C9D6F5" }}>Số {c.number}</Text> : null}
          <View style={{ flexDirection: "row" }}><Chip2 label={st.label} color={st.color} bg="#fff" /></View>
          <Text style={{ color: "#C9D6F5", lineHeight: 20 }}>{st.hint}</Text>
        </Hero>

        {has ? <Button label="Xem nội dung hợp đồng" kind="ghost" icon="eye-outline" onPress={() => void openFile()} /> : null}

        {c.status === "requested" && c.missing?.length ? <Notice tone="warn" text={`Hồ sơ còn thiếu: ${c.missing.join(", ")}. Bổ sung trong hồ sơ (bản web) rồi quay lại ký.`} /> : null}

        {c.status === "requested" ? (
          <Card style={{ gap: 12 }}>
            <Text style={{ fontWeight: "800", color: t.text, fontSize: 16 }}>Ký hợp đồng</Text>
            {!session ? (
              <>
                <Text style={{ color: t.sub, lineHeight: 20 }}>Bấm nút dưới, hệ thống gửi mã xác nhận về email đăng ký của bạn. Nhập mã để ký điện tử.</Text>
                {error ? <Notice text={error} /> : null}
                <Button label="Bắt đầu ký" icon="create-outline" onPress={start} busy={busy === "start" || busy === "otp"} />
              </>
            ) : (
              <>
                <Text style={{ color: t.sub, lineHeight: 20 }}>Đã gửi mã tới {mail || "email của bạn"}. Mã có hiệu lực trong vài phút.</Text>
                <Field icon="keypad-outline" label="Mã xác nhận" placeholder="Nhập mã trong email" value={code} onChangeText={setCode} keyboardType="number-pad" autoFocus />
                <Pressable onPress={() => { tap(); setAgree((v) => !v) }} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <Ionicons name={agree ? "checkbox" : "square-outline"} size={22} color={agree ? t.navy : t.sub} />
                  <Text style={{ flex: 1, color: t.text, lineHeight: 20 }}>Tôi đã đọc và đồng ý với toàn bộ nội dung hợp đồng.</Text>
                </Pressable>
                {error ? <Notice text={error} /> : null}
                <Button label="Ký hợp đồng" icon="checkmark-circle-outline" onPress={sign} busy={busy === "sign"} disabled={!code.trim() || !agree} />
                <Pressable onPress={() => void sendCode()} disabled={wait > 0 || busy === "otp"} style={{ alignItems: "center" }}>
                  <Text style={{ color: wait > 0 ? t.sub : t.navy2, fontWeight: "700" }}>{wait > 0 ? `Gửi lại mã sau ${wait} giây` : "Gửi lại mã"}</Text>
                </Pressable>
              </>
            )}
          </Card>
        ) : null}

        {has ? (
          <InfoGroup title="Thông tin">
            <InfoRow first icon="time-outline" color="#B45309" label="Ngày yêu cầu ký" value={c.requested_at ? when(c.requested_at) : ""} />
            {c.signed_at ? <InfoRow icon="create-outline" color="#2563EB" label="Bạn ký lúc" value={when(c.signed_at)} sub={[c.signed_name, c.signed_email].filter(Boolean).join(" · ")} /> : null}
            {c.approved_at ? <InfoRow icon="checkmark-done-outline" color="#15803D" label="Công ty duyệt lúc" value={when(c.approved_at)} /> : null}
            {c.close_reason ? <InfoRow icon="information-circle-outline" color="#6B7280" label="Lý do đóng" value={c.close_reason} /> : null}
          </InfoGroup>
        ) : <Button label="Quay lại" kind="ghost" onPress={() => router.back()} />}
      </ScrollView>

      {Platform.OS !== "web" ? (
        <Modal visible={view} animationType="slide" onRequestClose={() => setView(false)}>
          <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>Nội dung hợp đồng</Text>
              <Pressable onPress={() => setView(false)} hitSlop={12}><Ionicons name="close" size={24} color={t.text} /></Pressable>
            </View>
            {file ? <WebView source={{ uri: file.uri, headers: file.headers }} style={{ flex: 1 }} startInLoadingState /> : null}
          </View>
        </Modal>
      ) : null}
    </View>
  )
}
