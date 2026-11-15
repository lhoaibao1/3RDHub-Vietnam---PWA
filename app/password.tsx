import { useState } from "react"
import { Alert, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { api } from "../src/api"
import { bioEnabled, enableBio } from "../src/biometric"
import { useAuth } from "../src/auth"
import { TopBar } from "../src/chrome"
import { Field, Notice } from "../src/form"
import { Button, Card, t } from "../src/ui"

// Đổi mật khẩu: POST /tenant/account/password {current_password, new_password}.
export default function Password() {
  const router = useRouter()
  const { user } = useAuth()
  const [cur, setCur] = useState("")
  const [next, setNext] = useState("")
  const [again, setAgain] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const ok = cur && next.length >= 8 && next === again
  const submit = async () => {
    setBusy(true); setError("")
    try {
      await api("/api/v1/tenant/account/password", { method: "POST", body: { current_password: cur, new_password: next } })
      if (user?.email && (await bioEnabled())) await enableBio(user.email, next) // Face ID dùng mật khẩu mới
      Alert.alert("Đã đổi mật khẩu", "Lần sau hãy đăng nhập bằng mật khẩu mới.")
      router.back()
    } catch (e) { setError(e instanceof Error ? (/current|wrong|invalid/i.test(e.message) ? "Mật khẩu hiện tại không đúng." : e.message) : "Chưa đổi được.") }
    finally { setBusy(false) }
  }
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Đổi mật khẩu" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <Field icon="lock-closed-outline" label="Mật khẩu hiện tại" value={cur} onChangeText={setCur} secure autoComplete="current-password" />
          <Field icon="key-outline" label="Mật khẩu mới" placeholder="Ít nhất 8 ký tự" value={next} onChangeText={setNext} secure autoComplete="new-password" error={next && next.length < 8 ? "Mật khẩu cần từ 8 ký tự." : ""} />
          <Field icon="key-outline" label="Nhập lại mật khẩu mới" value={again} onChangeText={setAgain} secure autoComplete="new-password" error={again && again !== next ? "Không khớp với mật khẩu mới." : ""} />
          {error ? <Notice text={error} /> : null}
          <Button label="Lưu mật khẩu mới" onPress={submit} busy={busy} disabled={!ok} />
        </Card>
      </ScrollView>
    </View>
  )
}
