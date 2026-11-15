import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Text, TextInput } from "../src/text"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { QuickPrefs } from "../src/quickprefs"
import { useAuth } from "../src/auth"
import { bioCredentials, bioEnabled, bioInfo, enableBio, type Bio } from "../src/biometric"
import { openPrivacy, openTerms } from "../src/links"
import { tap } from "../src/chrome"
import { BrandLogo } from "../src/brand"
import { fetchProviders, oauthSignIn, providerName, type Provider } from "../src/oauth"
import { Button, t } from "../src/ui"
import { shadow } from "../src/theme"
import { sheet } from "../src/theme"

const H = Dimensions.get("window").height

function ProviderButton({ p, busy, onPress }: { p: Provider; busy: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [s.prov, pressed && { backgroundColor: t.bg }, busy && { opacity: 0.6 }]}>
      {busy ? <ActivityIndicator color={t.navy} /> : <Ionicons name={p === "google" ? "logo-google" : "logo-microsoft"} size={18} color={p === "google" ? "#EA4335" : "#00A4EF"} />}
      <Text style={{ fontWeight: "700", color: t.text }}>Tiếp tục với {providerName[p]}</Text>
    </Pressable>
  )
}

export default function Login() {
  const { login, login2fa, loginWithToken } = useAuth()
  const router = useRouter()
  const [bio, setBio] = useState<Bio | null>(null)
  const [bioOn, setBioOn] = useState(false)
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [ticket, setTicket] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState<"" | "pass" | "bio" | Provider>("")
  const [error, setError] = useState("")
  const [providers, setProviders] = useState<Provider[]>([])
  const rise = useRef(new Animated.Value(40)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([Animated.spring(rise, { toValue: 0, friction: 8, useNativeDriver: true }), Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true })]).start()
    void fetchProviders().then((p) => setProviders((["google", "microsoft"] as Provider[]).filter((k) => p[k])))
    void (async () => {
      const b = await bioInfo(), on = b.available && (await bioEnabled())
      setBio(b); setBioOn(on)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rise, fade])

  const withBio = async () => {
    setBusy("bio"); setError("")
    try {
      const c = await bioCredentials()
      if (!c) return
      const r = await login(c.email, c.password)
      if (!r.done) { setEmail(c.email); setTicket(r.ticket) }
    } catch (e) { setError(e instanceof Error ? `${e.message}. Hãy đăng nhập bằng mật khẩu (có thể mật khẩu đã đổi).` : "Đăng nhập không được") } finally { setBusy("") }
  }
  // Đăng nhập bằng mật khẩu xong: mời bật Face ID / vân tay cho lần sau.
  const offerBio = (mail: string, pw: string) => {
    if (!bio?.available || bioOn) return
    Alert.alert(`Đăng nhập nhanh bằng ${bio.label}?`, `Lần sau chỉ cần ${bio.label}, không phải gõ mật khẩu.`, [
      { text: "Để sau", style: "cancel" },
      { text: "Bật", onPress: () => void enableBio(mail, pw) },
    ])
  }

  const submit = async () => {
    setBusy("pass"); setError("")
    try {
      if (ticket) await login2fa(ticket, code.trim())
      else { const r = await login(email.trim(), password); if (!r.done) setTicket(r.ticket); else offerBio(email.trim(), password) }
    } catch (e) { setError(e instanceof Error ? e.message : "Đăng nhập không được") } finally { setBusy("") }
  }
  const social = async (p: Provider) => {
    tap(); setBusy(p); setError("")
    try {
      const token = await oauthSignIn(p)
      if (token) await loginWithToken(token)
    } catch (e) { setError(e instanceof Error ? e.message : "Đăng nhập không được") } finally { setBusy("") }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient colors={[t.brand, t.brand2]} style={[s.top, { height: H * 0.42 }]}>
        <View style={[s.ring, { width: 260, height: 260, top: -80, right: -90 }]} />
        <View style={[s.ring, { width: 180, height: 180, top: 90, left: -70, borderColor: "rgba(255,106,43,0.35)" }]} />
        <View style={[s.dot, { top: 70, right: 60 }]} />
        <View style={[s.dot, { top: 150, right: 130, width: 8, height: 8, backgroundColor: "rgba(255,255,255,0.4)" }]} />
        <View style={{ position: "absolute", right: 16, top: insets.top + 8, zIndex: 5 }}><QuickPrefs /></View>
        <View style={{ paddingTop: insets.top + 36, paddingHorizontal: 28 }}>
          <Text style={s.hello}>Chào mừng trở lại 👋</Text>
          <Text style={s.sub}>Theo dõi chiến dịch, đơn hàng và hoa hồng của bạn mọi lúc.</Text>
        </View>
      </LinearGradient>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: H * 0.24, paddingHorizontal: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <Animated.View style={[s.card, { opacity: fade, transform: [{ translateY: rise }] }]}>
            <BrandLogo width={230} height={44} style={{ alignSelf: "center", marginBottom: 6 }} />
            {ticket ? (
              <>
                <Text style={{ color: t.sub, textAlign: "center" }}>Nhập mã xác thực 2 bước (hoặc mã khôi phục).</Text>
                <View style={s.field}><Ionicons name="shield-checkmark-outline" size={18} color={t.sub} /><TextInput style={s.input} placeholder="Mã 6 số" placeholderTextColor={t.sub} keyboardType="number-pad" autoFocus value={code} onChangeText={setCode} /></View>
              </>
            ) : (
              <>
                <View style={s.field}><Ionicons name="mail-outline" size={18} color={t.sub} /><TextInput style={s.input} placeholder="Email" placeholderTextColor={t.sub} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} /></View>
                <View style={s.field}>
                  <Ionicons name="lock-closed-outline" size={18} color={t.sub} />
                  <TextInput style={s.input} placeholder="Mật khẩu" placeholderTextColor={t.sub} secureTextEntry={!show} autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
                  <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={t.sub} /></Pressable>
                </View>
                <Pressable onPress={() => { tap(); router.push({ pathname: "/forgot", params: { email: email.trim() } }) }} style={{ alignSelf: "flex-end" }}><Text style={s.link}>Quên mật khẩu?</Text></Pressable>
              </>
            )}
            {error ? <View style={s.err}><Ionicons name="alert-circle" size={16} color={t.bad} /><Text style={{ color: t.bad, flex: 1 }}>{error}</Text></View> : null}
            <Button label={ticket ? "Xác nhận" : "Đăng nhập"} onPress={submit} busy={busy === "pass"} disabled={!!busy || (ticket ? !code : !email || !password)} />
            {!ticket && bioOn && bio ? (
              <Pressable onPress={() => { tap(); void withBio() }} disabled={!!busy} style={({ pressed }) => [s.prov, { borderColor: t.navy }, pressed && { backgroundColor: t.navySoft }]}>
                {busy === "bio" ? <ActivityIndicator color={t.navy} /> : <Ionicons name={bio.icon} size={20} color={t.navy} />}
                <Text style={{ fontWeight: "800", color: t.navy }}>Đăng nhập bằng {bio.label}</Text>
              </Pressable>
            ) : null}
            {ticket ? <Pressable onPress={() => { setTicket(""); setCode("") }}><Text style={[s.link, { textAlign: "center" }]}>Quay lại</Text></Pressable> : providers.length ? (
              <>
                <View style={s.or}><View style={s.orLine} /><Text style={{ color: t.sub, fontSize: 12 }}>hoặc</Text><View style={s.orLine} /></View>
                {providers.map((p) => <ProviderButton key={p} p={p} busy={busy === p} onPress={() => social(p)} />)}
                {busy === "google" || busy === "microsoft" ? <Text style={{ color: t.sub, fontSize: 12, textAlign: "center" }}>Hoàn tất đăng nhập trong trình duyệt, app sẽ tự vào tài khoản.</Text> : null}
              </>
            ) : null}
          </Animated.View>
          {!ticket ? (
            <Pressable onPress={() => { tap(); router.push("/signup") }} style={{ alignItems: "center", marginTop: 22 }}>
              <Text style={{ color: t.sub }}>Chưa có tài khoản? <Text style={{ color: t.gold, fontWeight: "800" }}>Đăng ký Publisher</Text></Text>
            </Pressable>
          ) : null}
          <Text style={{ color: t.sub, fontSize: 12, textAlign: "center", marginTop: 18, lineHeight: 18 }}>Khi đăng nhập, bạn đồng ý với <Text onPress={openTerms} style={{ color: t.navy2, fontWeight: "700" }}>Điều khoản sử dụng</Text> và <Text onPress={openPrivacy} style={{ color: t.navy2, fontWeight: "700" }}>Chính sách bảo mật</Text>.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
const s = sheet(() => StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, top: 0, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.12)" },
  dot: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: t.gold },
  hello: { color: "#fff", fontSize: 28, fontWeight: "900" },
  sub: { color: "#C9D6F5", marginTop: 6, lineHeight: 20, maxWidth: 300 },
  card: { backgroundColor: t.card, borderRadius: 24, padding: 20, gap: 12, ...shadow, shadowOpacity: 0.14, shadowRadius: 24 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.bg, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: t.line },
  input: { flex: 1, minWidth: 0, paddingVertical: 14, fontSize: 16, color: t.text },
  link: { color: t.navy2, fontWeight: "700" },
  err: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: t.badSoft, borderRadius: 10, padding: 10 },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: t.line },
  prov: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: t.line, borderRadius: 14, paddingVertical: 13 },
}))
