import { useEffect, useRef, useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { CameraView, useCameraPermissions } from "expo-camera"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, upload } from "../src/api"
import { TopBar, tap } from "../src/chrome"
import { Hero } from "../src/detail"
import { Field, Notice } from "../src/form"
import { KYC_STATE } from "../src/hooks"
import { Button, Card, Loading, t } from "../src/ui"
import { Text } from "../src/text"

// eKYC ngay trong app (owner, 2026-11-14: "làm luôn ekyc trong app"), dùng đúng API của trang eKYC trên web:
//   POST /tenant/account/kyc/handoff → {url: …?token=X}   POST /ekyc/open {token} → {session}
//   (header X-KYC-Token: session)  POST /ekyc/challenge → {id, steps[5], seconds}
//   POST /ekyc/submit multipart: front, back, portrait, step_<i> (bước quay trái / phải), qr HOẶC id_number + full_name
//   + date_of_birth + gender + address + issue_date (yyyy-mm-dd), challenge_id, timings (JSON, ms từ lúc bắt đầu).
// Khác bản web: app KHÔNG tự nhận diện động tác (Expo Go không có thư viện nhận diện khuôn mặt); người dùng làm theo
// hướng dẫn rồi bấm nút, ảnh quay trái / phải và ảnh chân dung được gửi để Admin đối chiếu khi duyệt.

type Own = { status: string; note?: string; full_name?: string; id_number?: string }
type Shot = { uri: string }
const ACTION: Record<string, { text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  left: { text: "Quay mặt sang TRÁI", icon: "arrow-back-circle" }, right: { text: "Quay mặt sang PHẢI", icon: "arrow-forward-circle" },
  up: { text: "Ngẩng mặt LÊN", icon: "arrow-up-circle" }, down: { text: "Cúi mặt XUỐNG", icon: "arrow-down-circle" },
  blink: { text: "CHỚP MẮT 2 lần", icon: "eye" }, smile: { text: "MỈM CƯỜI", icon: "happy" }, mouth: { text: "HÁ MIỆNG", icon: "ellipse" },
}
const ymd = (v: string) => { const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); return m ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` : "" }
const fail = (e: unknown) => {
  const m = e instanceof Error ? e.message : ""
  if (e instanceof ApiError && e.code === "kyc_not_required") return "Tài khoản của bạn hiện không cần định danh."
  if (/already approved/.test(m)) return "Bạn đã được duyệt định danh rồi."
  if (/expired|session has ended|kyc_link/.test(m)) return "Phiên định danh đã hết hạn, hãy làm lại từ đầu."
  if (/human pace|incomplete/.test(m)) return "Bước kiểm tra khuôn mặt chưa đạt, hãy làm lại chậm rãi theo hướng dẫn."
  if (/6 MB/.test(m)) return "Ảnh quá lớn, hãy chụp lại."
  if (/12 digits/.test(m)) return "Cần số CCCD đủ 12 số và họ tên."
  if (/yyyy-mm-dd/.test(m)) return "Ngày sinh / ngày cấp chưa đúng dạng dd/mm/yyyy."
  if (e instanceof ApiError && e.status === 429) return "Bạn thử quá nhiều lần, đợi một lúc rồi làm lại."
  return m || "Chưa gửi được, thử lại sau."
}
const file = (uri: string, name: string) => ({ uri, name: `${name}.jpg`, type: "image/jpeg" }) as never

type Stage = "intro" | "front" | "back" | "info" | "face" | "sending" | "done"

export default function Ekyc() {
  const router = useRouter()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const cam = useRef<CameraView>(null)
  const [perm, askPerm] = useCameraPermissions()
  const own = useQuery({ queryKey: ["own-kyc"], queryFn: () => api<{ data: Own }>("/api/v1/tenant/account/kyc").then((r) => r.data) })
  const [stage, setStage] = useState<Stage>("intro")
  const [session, setSession] = useState("")
  const [front, setFront] = useState<Shot | null>(null)
  const [back, setBack] = useState<Shot | null>(null)
  const [qr, setQr] = useState("")
  const [scan, setScan] = useState(false)
  const [f, setF] = useState({ id: "", name: "", dob: "", gender: "", address: "", issued: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  // kiểm tra khuôn mặt
  const [ch, setCh] = useState<{ id: string; steps: string[] } | null>(null)
  const [idx, setIdx] = useState(0)
  const started = useRef(0), stepAt = useRef(0)
  const timings = useRef<number[]>([]), shots = useRef<Record<number, string>>({})
  const [wait, setWait] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const kyc = session ? { "X-KYC-Token": session } : undefined

  const snap = async () => (await cam.current?.takePictureAsync({ quality: 0.6 }))?.uri

  const begin = async () => {
    setBusy(true); setError("")
    try {
      // Bản web PWA: dùng luôn trang eKYC của web (có tự nhận diện khuôn mặt), không chụp trong app.
      if (Platform.OS === "web") {
        const w = await api<{ data: { url: string } }>("/api/v1/tenant/account/kyc/handoff", { method: "POST", body: {} })
        globalThis.location?.assign(w.data.url)
        return
      }
      if (!perm?.granted && !(await askPerm()).granted) { setError("Cần cho phép dùng camera để chụp giấy tờ và khuôn mặt. Bật trong Cài đặt của máy rồi thử lại."); return }
      const h = await api<{ data: { url: string } }>("/api/v1/tenant/account/kyc/handoff", { method: "POST", body: {} })
      const token = (h.data.url.match(/[?&]token=([^&]+)/) ?? [])[1]
      if (!token) throw new Error("Máy chủ không trả về phiên định danh.")
      const o = await api<{ data: { session: string } }>("/api/v1/ekyc/open", { method: "POST", body: { token: decodeURIComponent(token) } })
      setSession(o.data.session); setStage("front")
    } catch (e) { setError(fail(e)) } finally { setBusy(false) }
  }
  const takeCard = async (side: "front" | "back") => {
    tap(); setBusy(true)
    try {
      const uri = await snap()
      if (!uri) return
      if (side === "front") { setFront({ uri }); setStage("back") } else { setBack({ uri }); setStage("info") }
    } catch { setError("Chưa chụp được, thử lại.") } finally { setBusy(false) }
  }
  const startFace = async () => {
    if (!qr && (!/^\d{12}$/.test(f.id.trim()) || !f.name.trim())) { setError("Nhập số CCCD đủ 12 số và họ tên, hoặc quét mã QR trên thẻ."); return }
    if (!qr && ((f.dob && !ymd(f.dob)) || (f.issued && !ymd(f.issued)))) { setError("Ngày sinh / ngày cấp nhập theo dạng dd/mm/yyyy."); return }
    setBusy(true); setError("")
    try {
      const c = await api<{ data: { id: string; steps: string[] } }>("/api/v1/ekyc/challenge", { method: "POST", headers: kyc })
      timings.current = []; shots.current = {}; setIdx(0); setCh(c.data); setStage("face")
      started.current = Date.now(); stepAt.current = Date.now()
    } catch (e) { setError(fail(e)) } finally { setBusy(false) }
  }
  // Mỗi bước phải cách nhau tối thiểu (server từ chối nếu nhanh hơn nhịp người): khoá nút 1,2 giây.
  useEffect(() => {
    if (stage !== "face") return
    setWait(true)
    const id = setTimeout(() => setWait(false), 1200)
    return () => clearTimeout(id)
  }, [stage, idx])
  const doneStep = async () => {
    if (!ch || wait || busy) return
    tap(); setBusy(true)
    try {
      const last = idx >= ch.steps.length // bước cuối: ảnh chân dung nhìn thẳng
      const action = ch.steps[idx]
      const needPhoto = last || action === "left" || action === "right"
      const uri = needPhoto ? await snap() : undefined
      if (needPhoto && !uri) { setError("Chưa chụp được, thử lại."); return }
      if (!last) {
        timings.current.push(Date.now() - started.current)
        if (uri) shots.current[idx] = uri
        setIdx(idx + 1)
        return
      }
      await send(uri!)
    } finally { setBusy(false) }
  }
  const send = async (portrait: string) => {
    if (!ch || !front || !back) return
    setStage("sending"); setError("")
    try {
      const form = new FormData()
      form.append("front", file(front.uri, "front")); form.append("back", file(back.uri, "back")); form.append("portrait", file(portrait, "portrait"))
      for (const [i, uri] of Object.entries(shots.current)) form.append(`step_${i}`, file(uri, `step_${i}`))
      form.append("challenge_id", ch.id)
      form.append("timings", JSON.stringify(timings.current))
      if (qr) form.append("qr", qr)
      else {
        form.append("id_number", f.id.trim()); form.append("full_name", f.name.trim().toUpperCase()); form.append("date_of_birth", ymd(f.dob))
        form.append("gender", f.gender.trim()); form.append("address", f.address.trim()); form.append("issue_date", ymd(f.issued))
      }
      await upload("/api/v1/ekyc/submit", form, kyc)
      void qc.invalidateQueries({ queryKey: ["own-kyc"] }); void qc.invalidateQueries({ queryKey: ["wallet"] })
      setStage("done")
    } catch (e) { setError(fail(e)); setStage("info") }
  }
  const onQr = (data: string) => {
    const parts = data.split("|")
    if (parts.length < 7 || !/^\d{12}$/.test(parts[0]!.trim())) return
    const d = (s: string) => (s && s.length === 8 ? `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}` : "")
    tap(); setQr(data); setScan(false)
    setF({ id: parts[0]!.trim(), name: parts[2] ?? "", dob: d(parts[3] ?? ""), gender: parts[4] ?? "", address: parts[5] ?? "", issued: d(parts[6] ?? "") })
  }

  // ---- màn hình camera chụp giấy tờ ----
  if (stage === "front" || stage === "back") return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" />
      <View style={[s.camTop, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => setStage(stage === "front" ? "intro" : "front")} hitSlop={10}><Ionicons name="chevron-back" size={26} color="#fff" /></Pressable>
        <Text style={s.camTitle}>{stage === "front" ? "Mặt TRƯỚC CCCD" : "Mặt SAU CCCD"}</Text>
        <Text style={{ color: "#fff" }}>{stage === "front" ? "1/4" : "2/4"}</Text>
      </View>
      <View style={s.frame} pointerEvents="none" />
      <View style={[s.camBottom, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={s.camHint}>Đặt thẻ nằm gọn trong khung, đủ sáng, không loá, rõ chữ.</Text>
        <Pressable onPress={() => takeCard(stage)} disabled={busy} style={s.shutter}><View style={s.shutterIn} /></Pressable>
      </View>
    </View>
  )
  // ---- quét mã QR trên thẻ ----
  if (scan) return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={(e) => onQr(e.data)} />
      <View style={[s.camTop, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => setScan(false)} hitSlop={10}><Ionicons name="close" size={26} color="#fff" /></Pressable>
        <Text style={s.camTitle}>Quét mã QR trên CCCD</Text><View style={{ width: 26 }} />
      </View>
      <View style={[s.frame, { aspectRatio: 1, width: "60%" }]} pointerEvents="none" />
      <View style={[s.camBottom, { paddingBottom: insets.bottom + 30 }]}><Text style={s.camHint}>Mã QR nằm ở góc trên bên phải mặt trước thẻ CCCD gắn chip.</Text></View>
    </View>
  )
  // ---- kiểm tra khuôn mặt ----
  if (stage === "face" && ch) {
    const last = idx >= ch.steps.length
    const a = last ? { text: "Nhìn THẲNG vào camera", icon: "person-circle" as const } : ACTION[ch.steps[idx]!] ?? { text: ch.steps[idx]!, icon: "ellipse" as const }
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" />
        <View style={[s.camTop, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => setStage("info")} hitSlop={10}><Ionicons name="close" size={26} color="#fff" /></Pressable>
          <Text style={s.camTitle}>Kiểm tra khuôn mặt</Text>
          <Text style={{ color: "#fff" }}>{Math.min(idx + 1, ch.steps.length + 1)}/{ch.steps.length + 1}</Text>
        </View>
        <View style={s.oval} pointerEvents="none" />
        <View style={[s.camBottom, { paddingBottom: insets.bottom + 20 }]}>
          <View style={{ flexDirection: "row", gap: 6 }}>{[...ch.steps, "end"].map((_, i) => <View key={i} style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: i < idx ? t.ok : i === idx ? t.gold : "rgba(255,255,255,0.35)" }} />)}</View>
          <Ionicons name={a.icon} size={44} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" }}>{a.text}</Text>
          <Text style={s.camHint}>Giữ mặt trong khung, làm xong động tác rồi bấm nút.</Text>
          <Pressable onPress={doneStep} disabled={wait || busy} style={[s.faceBtn, (wait || busy) && { opacity: 0.4 }]}>
            <Text style={{ color: t.navy, fontWeight: "800", fontSize: 16 }}>{last ? "Chụp và gửi hồ sơ" : "Đã làm xong"}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const st = KYC_STATE[own.data?.status ?? "none"] ?? KYC_STATE.none!
  const approved = own.data?.status === "approved"
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Định danh eKYC" />
      {stage === "sending" ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}><Loading rows={0} /><Text style={{ color: t.sub, position: "absolute" }}>Đang gửi hồ sơ, đừng tắt app…</Text></View>
      : stage === "done" ? (
        <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: t.okSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="shield-checkmark" size={42} color={t.ok} /></View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>Đã gửi hồ sơ định danh</Text>
          <Text style={{ color: t.sub, textAlign: "center", lineHeight: 21 }}>Quản trị viên sẽ đối chiếu ảnh và duyệt. Bạn sẽ nhận thông báo khi có kết quả.</Text>
          <View style={{ alignSelf: "stretch" }}><Button label="Xong" onPress={() => router.back()} /></View>
        </View>
      ) : stage === "info" ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", gap: 10 }}>
              {([["Mặt trước", front, "front"], ["Mặt sau", back, "back"]] as const).map(([l, x, k]) => (
                <Pressable key={k} onPress={() => setStage(k)} style={{ flex: 1, gap: 4 }}>
                  <Image source={x ? { uri: x.uri } : undefined} style={{ height: 100, borderRadius: 12, backgroundColor: t.line }} contentFit="cover" />
                  <Text style={{ color: t.sub, fontSize: 12, textAlign: "center" }}>{l} · chụp lại</Text>
                </Pressable>
              ))}
            </View>
            <Button label={qr ? "Đã quét mã QR ✓ (quét lại)" : "Quét mã QR trên thẻ để tự điền"} kind="ghost" icon="qr-code-outline" onPress={() => setScan(true)} />
            <Card style={{ gap: 12 }}>
              <Text style={{ color: t.sub, fontSize: 13 }}>{qr ? "Thông tin đọc từ mã QR của thẻ (không sửa được). Sai thì quét lại." : "Nhập đúng như trên thẻ. Quét mã QR ở trên sẽ nhanh và chính xác hơn."}</Text>
              <Field icon="id-card-outline" label="Số CCCD (12 số) *" value={f.id} onChangeText={set("id")} keyboardType="number-pad" editable={!qr} maxLength={12} />
              <Field icon="person-outline" label="Họ và tên *" value={f.name} onChangeText={set("name")} autoCapitalize="characters" editable={!qr} />
              <Field icon="gift-outline" label="Ngày sinh" placeholder="dd/mm/yyyy" value={f.dob} onChangeText={set("dob")} keyboardType="numbers-and-punctuation" editable={!qr} />
              <Field icon="male-female-outline" label="Giới tính" placeholder="Nam / Nữ" value={f.gender} onChangeText={set("gender")} editable={!qr} />
              <Field icon="location-outline" label="Nơi thường trú" value={f.address} onChangeText={set("address")} multiline editable={!qr} />
              <Field icon="calendar-outline" label="Ngày cấp" placeholder="dd/mm/yyyy" value={f.issued} onChangeText={set("issued")} keyboardType="numbers-and-punctuation" editable={!qr} />
              {error ? <Notice text={error} /> : null}
              <Button label="Tiếp tục: kiểm tra khuôn mặt" icon="scan-outline" onPress={startFace} busy={busy} />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <Hero>
            <Ionicons name="shield-checkmark-outline" size={34} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Định danh tài khoản</Text>
            <Text style={{ color: "#C9D6F5", lineHeight: 20 }}>Cần định danh để rút tiền. Chuẩn bị CCCD gắn chip, làm ở nơi đủ sáng, mất khoảng 2 phút.</Text>
            {own.data ? <View style={{ flexDirection: "row" }}><View style={{ backgroundColor: t.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: st.color, fontWeight: "700", fontSize: 12 }}>Trạng thái: {st.label}</Text></View></View> : null}
          </Hero>
          {own.data?.note && own.data.status === "rejected" ? <Notice text={`Lý do bị từ chối: ${own.data.note}`} /> : null}
          {own.data?.status === "pending" ? <Notice tone="warn" text="Hồ sơ của bạn đang chờ duyệt. Gửi lại sẽ thay hồ sơ cũ." /> : null}
          <Card style={{ gap: 14 }}>
            {[["card-outline", "Chụp mặt trước và mặt sau CCCD"], ["qr-code-outline", "Quét mã QR trên thẻ (hoặc nhập tay thông tin)"], ["scan-outline", "Kiểm tra khuôn mặt: làm 5 động tác theo hướng dẫn"], ["send-outline", "Gửi hồ sơ, chờ quản trị viên duyệt"]].map(([icon, text], i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon as never} size={18} color={t.navy} /></View>
                <Text style={{ flex: 1, color: t.text }}>{i + 1}. {text}</Text>
              </View>
            ))}
          </Card>
          {error ? <Notice text={error} /> : null}
          {approved ? <Notice tone="ok" text="Tài khoản của bạn đã được định danh. Muốn làm lại cần quản trị viên yêu cầu." /> : <Button label={own.data?.status === "rejected" || own.data?.status === "pending" ? "Làm lại định danh" : "Bắt đầu định danh"} icon="camera-outline" onPress={() => { Alert.alert("Bắt đầu định danh", "App sẽ dùng camera để chụp giấy tờ và khuôn mặt của bạn.", [{ text: "Hủy", style: "cancel" }, { text: "Bắt đầu", onPress: () => void begin() }]) }} busy={busy} />}
        </ScrollView>
      )}
    </View>
  )
}
const s = StyleSheet.create({
  camTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "rgba(0,0,0,0.45)" },
  camTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  frame: { position: "absolute", top: "28%", alignSelf: "center", width: "88%", aspectRatio: 1.586, borderRadius: 14, borderWidth: 3, borderColor: t.card },
  oval: { position: "absolute", top: "14%", alignSelf: "center", width: "68%", aspectRatio: 0.76, borderRadius: 999, borderWidth: 3, borderColor: t.card },
  camBottom: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", gap: 12, paddingTop: 16, paddingHorizontal: 20, backgroundColor: "rgba(0,0,0,0.55)" },
  camHint: { color: "#E5E7EB", textAlign: "center", fontSize: 13 },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: t.card, alignItems: "center", justifyContent: "center" },
  shutterIn: { width: 58, height: 58, borderRadius: 29, backgroundColor: t.card },
  faceBtn: { alignSelf: "stretch", backgroundColor: t.card, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
})
