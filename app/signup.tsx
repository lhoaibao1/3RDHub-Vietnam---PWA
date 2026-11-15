import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native"
import { Pressable } from "../src/press"
import { Text } from "../src/text"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { api, ApiError } from "../src/api"
import { BrandLogo } from "../src/brand"
import { TopBar, tap } from "../src/chrome"
import { Field, Notice } from "../src/form"
import { openPrivacy, openTerms } from "../src/links"
import { Button, Card, t } from "../src/ui"

// Đăng ký Publisher ngay trong app: POST /auth/signup {email, password, display_name, phone, referral_code} → 202, rồi
// người dùng bấm link xác nhận trong email (giống web).
const msg = (e: unknown) => {
  if (!(e instanceof Error)) return "Chưa đăng ký được, thử lại sau."
  if (e instanceof ApiError && e.code === "signup_disabled") return "Hệ thống đang tạm đóng đăng ký mới. Vui lòng liên hệ hỗ trợ."
  const m = e.message
  if (/email is invalid/i.test(m)) return "Email không hợp lệ."
  if (/name is required/i.test(m)) return "Vui lòng nhập họ tên (tối đa 100 ký tự)."
  if (/password must be/i.test(m)) return "Mật khẩu cần từ 8 ký tự."
  if (/phone/i.test(m)) return "Số điện thoại không hợp lệ."
  if (/referral/i.test(m)) return "Không tìm thấy mã giới thiệu này."
  if (e instanceof ApiError && e.status === 429) return "Bạn thử quá nhiều lần, đợi vài phút rồi thử lại."
  return m
}

export default function Signup() {
  const router = useRouter()
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", confirm: "", ref: "" })
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const mismatch = !!f.confirm && f.confirm !== f.password
  const ok = f.name.trim() && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 8 && !mismatch && agree

  const submit = async () => {
    setBusy(true); setError("")
    try {
      await api("/api/v1/auth/signup", { method: "POST", body: { email: f.email.trim(), password: f.password, display_name: f.name.trim(), phone: f.phone.replace(/\s/g, ""), referral_code: f.ref.trim() } })
      setDone(true)
    } catch (e) { setError(msg(e)) } finally { setBusy(false) }
  }

  if (done) return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Đăng ký" />
      <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: t.okSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="mail-unread-outline" size={40} color={t.ok} /></View>
        <Text style={{ fontSize: 22, fontWeight: "900", color: t.text, textAlign: "center" }}>Kiểm tra email của bạn</Text>
        <Text style={{ color: t.sub, textAlign: "center", lineHeight: 21 }}>Chúng tôi đã gửi link xác nhận tới <Text style={{ fontWeight: "800", color: t.text }}>{f.email.trim()}</Text>. Bấm vào link đó để kích hoạt tài khoản, rồi quay lại đăng nhập.</Text>
        <View style={{ alignSelf: "stretch", marginTop: 8 }}><Button label="Về màn đăng nhập" onPress={() => router.replace("/login")} /></View>
      </View>
    </View>
  )
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Đăng ký Publisher" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <BrandLogo width={200} height={38} style={{ alignSelf: "center", marginVertical: 6 }} />
          <Card style={{ gap: 12 }}>
            <Field icon="person-outline" label="Họ và tên" placeholder="Nguyễn Văn A" value={f.name} onChangeText={set("name")} autoComplete="name" />
            <Field icon="mail-outline" label="Email" placeholder="ban@example.com" value={f.email} onChangeText={set("email")} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field icon="call-outline" label="Số điện thoại" placeholder="09xx xxx xxx" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" />
            <Field icon="lock-closed-outline" label="Mật khẩu" placeholder="Ít nhất 8 ký tự" value={f.password} onChangeText={set("password")} secure autoComplete="new-password" error={f.password && f.password.length < 8 ? "Mật khẩu cần từ 8 ký tự." : ""} />
            <Field icon="lock-closed-outline" label="Nhập lại mật khẩu" value={f.confirm} onChangeText={set("confirm")} secure autoComplete="new-password" error={mismatch ? "Mật khẩu nhập lại không khớp." : ""} />
            <Field icon="gift-outline" label="Mã giới thiệu (nếu có)" placeholder="RDxxxx" value={f.ref} onChangeText={set("ref")} autoCapitalize="characters" />
            <Pressable onPress={() => { tap(); setAgree((v) => !v) }} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Ionicons name={agree ? "checkbox" : "square-outline"} size={22} color={agree ? t.navy : t.sub} />
              <Text style={{ flex: 1, color: t.text, lineHeight: 20 }}>Tôi đồng ý với <Text onPress={openTerms} style={{ color: t.navy2, fontWeight: "800" }}>Điều khoản sử dụng</Text> và <Text onPress={openPrivacy} style={{ color: t.navy2, fontWeight: "800" }}>Chính sách bảo mật</Text>.</Text>
            </Pressable>
            {error ? <Notice text={error} /> : null}
            <Button label="Tạo tài khoản" onPress={submit} busy={busy} disabled={!ok} />
          </Card>
          <Pressable onPress={() => router.replace("/login")} style={{ alignItems: "center" }}><Text style={{ color: t.sub }}>Đã có tài khoản? <Text style={{ color: t.navy, fontWeight: "800" }}>Đăng nhập</Text></Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
