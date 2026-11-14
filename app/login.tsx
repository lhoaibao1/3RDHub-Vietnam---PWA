import { useState } from "react"
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "../src/auth"
import { API_URL } from "../src/api"
import { Button, t } from "../src/ui"
import { shadow } from "../src/theme"

export default function Login() {
  const { login, login2fa } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [ticket, setTicket] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const submit = async () => {
    setBusy(true); setError("")
    try {
      if (ticket) await login2fa(ticket, code.trim())
      else { const r = await login(email.trim(), password); if (!r.done) setTicket(r.ticket) }
    } catch (e) { setError(e instanceof Error ? e.message : "Đăng nhập không được") } finally { setBusy(false) }
  }

  return (
    <LinearGradient colors={["#FFFFFF", "#EEF2FB", "#E3EAF8"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          <Image source={require("../assets/logo.png")} style={{ width: 230, height: 103, alignSelf: "center" }} contentFit="contain" />
          <Text style={s.title}>Chào mừng trở lại</Text>
          <Text style={s.sub}>Đăng nhập để theo dõi chiến dịch, đơn hàng và hoa hồng của bạn.</Text>
          <View style={s.card}>
            {ticket ? (
              <>
                <Text style={{ color: t.sub }}>Nhập mã xác thực 2 bước (hoặc mã khôi phục).</Text>
                <View style={s.field}><Ionicons name="shield-checkmark-outline" size={18} color={t.sub} /><TextInput style={s.input} placeholder="Mã 6 số" keyboardType="number-pad" autoFocus value={code} onChangeText={setCode} /></View>
              </>
            ) : (
              <>
                <View style={s.field}><Ionicons name="mail-outline" size={18} color={t.sub} /><TextInput style={s.input} placeholder="Email" placeholderTextColor={t.sub} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} /></View>
                <View style={s.field}>
                  <Ionicons name="lock-closed-outline" size={18} color={t.sub} />
                  <TextInput style={s.input} placeholder="Mật khẩu" placeholderTextColor={t.sub} secureTextEntry={!show} autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
                  <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={t.sub} /></Pressable>
                </View>
              </>
            )}
            {error ? <Text style={{ color: t.bad }}>{error}</Text> : null}
            <Button label={ticket ? "Xác nhận" : "Đăng nhập"} onPress={submit} busy={busy} disabled={ticket ? !code : !email || !password} />
            {ticket ? <Pressable onPress={() => { setTicket(""); setCode("") }}><Text style={s.link}>Quay lại</Text></Pressable> : (
              <Pressable onPress={() => Linking.openURL(`${API_URL}/forgot-password`)}><Text style={s.link}>Quên mật khẩu?</Text></Pressable>
            )}
          </View>
          {!ticket ? (
            <Pressable onPress={() => Linking.openURL(`${API_URL}/signup`)} style={{ alignItems: "center", gap: 6 }}>
              <Image source={require("../assets/mascot-wave.png")} style={{ width: 54, height: 57 }} contentFit="contain" />
              <Text style={{ color: t.sub }}>Chưa có tài khoản? <Text style={{ color: t.navy, fontWeight: "800" }}>Đăng ký Publisher</Text></Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 14 },
  title: { fontSize: 26, fontWeight: "800", color: t.navy, textAlign: "center", marginTop: 8 },
  sub: { color: t.sub, textAlign: "center", marginBottom: 6, lineHeight: 20 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 18, gap: 12, ...shadow },
  field: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.bg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: t.line },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: t.text },
  link: { color: t.navy2, textAlign: "center", fontWeight: "700" },
})
