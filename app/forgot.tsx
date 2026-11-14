import { useState } from "react"
import { View } from "react-native"
import { Text } from "../src/text"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { api, ApiError } from "../src/api"
import { TopBar } from "../src/chrome"
import { Field, Notice } from "../src/form"
import { Button, Card, t } from "../src/ui"

// Quên mật khẩu ngay trong app: POST /auth/password/forgot {email}; server gửi email có link đặt lại (mở trên web).
export default function Forgot() {
  const router = useRouter()
  const { email: initial } = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(initial ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const submit = async () => {
    setBusy(true); setError("")
    try { await api("/api/v1/auth/password/forgot", { method: "POST", body: { email: email.trim() } }); setDone(true) }
    catch (e) { setError(e instanceof ApiError && e.code === "reset_disabled" ? "Hệ thống chưa bật đặt lại mật khẩu qua email. Vui lòng liên hệ hỗ trợ." : e instanceof ApiError && e.status === 429 ? "Bạn thử quá nhiều lần, đợi vài phút rồi thử lại." : /email is invalid/i.test(e instanceof Error ? e.message : "") ? "Email không hợp lệ." : e instanceof Error ? e.message : "Chưa gửi được.") }
    finally { setBusy(false) }
  }
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Quên mật khẩu" />
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ alignItems: "center", gap: 10, marginVertical: 10 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: t.navySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={done ? "mail-open-outline" : "key-outline"} size={36} color={t.navy} /></View>
          <Text style={{ fontSize: 20, fontWeight: "900", color: t.text }}>{done ? "Đã gửi email" : "Đặt lại mật khẩu"}</Text>
          <Text style={{ color: t.sub, textAlign: "center", lineHeight: 20 }}>{done ? `Nếu ${email.trim()} có tài khoản, bạn sẽ nhận được email kèm link đặt mật khẩu mới trong vài phút. Kiểm tra cả mục Spam.` : "Nhập email đăng ký, chúng tôi sẽ gửi link để bạn đặt mật khẩu mới."}</Text>
        </View>
        {done ? <Button label="Về màn đăng nhập" onPress={() => router.replace("/login")} /> : (
          <Card style={{ gap: 12 }}>
            <Field icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoFocus />
            {error ? <Notice text={error} /> : null}
            <Button label="Gửi link đặt lại" onPress={submit} busy={busy} disabled={!/\S+@\S+\.\S+/.test(email)} />
          </Card>
        )}
      </View>
    </View>
  )
}
