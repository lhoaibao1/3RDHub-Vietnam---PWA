import { useState } from "react"
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useAuth } from "../src/auth"
import { API_URL } from "../src/api"
import { Button, c } from "../src/ui"

export default function Login() {
  const { login, login2fa } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [ticket, setTicket] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("")
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : "Đăng nhập không được") } finally { setBusy(false) }
  }
  const submit = () => run(async () => {
    if (ticket) return login2fa(ticket, code.trim())
    const r = await login(email.trim(), password)
    if (!r.done) setTicket(r.ticket)
  })

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
      <Text style={s.brand}>3RDHub Vietnam</Text>
      <Text style={s.sub}>Dành cho Publisher</Text>
      {ticket ? (
        <>
          <Text style={s.hint}>Nhập mã xác thực 2 bước (hoặc mã khôi phục).</Text>
          <TextInput style={s.input} placeholder="Mã 6 số" keyboardType="number-pad" autoFocus value={code} onChangeText={setCode} />
        </>
      ) : (
        <>
          <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
          <TextInput style={s.input} placeholder="Mật khẩu" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        </>
      )}
      {error ? <Text style={s.err}>{error}</Text> : null}
      <Button label={ticket ? "Xác nhận" : "Đăng nhập"} onPress={submit} busy={busy} disabled={ticket ? !code : !email || !password} />
      {ticket ? <Pressable onPress={() => { setTicket(""); setCode("") }}><Text style={s.link}>Quay lại</Text></Pressable> : (
        <View style={{ gap: 12, alignItems: "center" }}>
          <Pressable onPress={() => Linking.openURL(`${API_URL}/forgot-password`)}><Text style={s.link}>Quên mật khẩu?</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(`${API_URL}/signup`)}><Text style={s.link}>Chưa có tài khoản? Đăng ký</Text></Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, gap: 14, backgroundColor: c.bg },
  brand: { fontSize: 28, fontWeight: "800", color: c.brand, textAlign: "center" },
  sub: { color: c.sub, textAlign: "center", marginBottom: 12 },
  hint: { color: c.sub },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 14, fontSize: 16 },
  err: { color: c.bad },
  link: { color: c.brand, textAlign: "center", fontWeight: "600" },
})
