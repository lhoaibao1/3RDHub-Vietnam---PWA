import { useEffect, useRef, useState } from "react"
import { Animated, Easing, StyleSheet, View } from "react-native"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SplashScreen from "expo-splash-screen"
import * as Notifications from "expo-notifications"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "../src/auth"
import { api } from "../src/api"
import { BrandLogo, BrandProvider, useBrand } from "../src/brand"
import { registerPush, setBadge } from "../src/push"
import { useUnread } from "../src/hooks"
import { useAutoUpdate } from "../src/autoupdate"
import { t } from "../src/theme"
import { FetchBar } from "../src/fetchbar"

void SplashScreen.preventAutoHideAsync().catch(() => {})
const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

/** Màn hình mở app: logo hiện dần + tagline, giữ tối thiểu ~1,6s rồi mờ đi. */
function BrandSplash({ done }: { done: boolean }) {
  const fade = useRef(new Animated.Value(0)).current
  const pop = useRef(new Animated.Value(0.88)).current
  const out = useRef(new Animated.Value(1)).current
  const [gone, setGone] = useState(false)
  const [minTime, setMinTime] = useState(false)
  const brand = useBrand()
  const [late, setLate] = useState(false)
  const run = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const a = Animated.loop(Animated.timing(run, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }))
    const b = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1.04, duration: 700, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true })]))
    a.start(); b.start()
    return () => { a.stop(); b.stop() }
  }, [run, pulse])
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {})
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start()
    const id = setTimeout(() => setMinTime(true), 1600)
    const id2 = setTimeout(() => setLate(true), 2500)
    return () => { clearTimeout(id); clearTimeout(id2) }
  }, [fade, pop])
  useEffect(() => {
    if (done && minTime && (brand.ready || late)) Animated.timing(out, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setGone(true))
  }, [done, minTime, brand.ready, late, out])
  if (gone) return null
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.splash, { opacity: out }]}>
      <Animated.View style={{ opacity: fade, transform: [{ scale: Animated.multiply(pop, pulse) }], alignItems: "center" }}>
        <BrandLogo width={290} height={55} />
      </Animated.View>
      <Animated.View style={[s.track, { opacity: fade }]}>
        <Animated.View style={[s.run, { transform: [{ translateX: run.interpolate({ inputRange: [0, 1], outputRange: [-70, 180] }) }] }]} />
      </Animated.View>
      <Animated.Text style={[s.tag, { opacity: fade }]}>{brand.tagline}</Animated.Text>
    </Animated.View>
  )
}

function Gate() {
  const { ready, user } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const qc = useQueryClient()
  const inLogin = ["login", "signup", "forgot"].includes(String(segments[0] ?? ""))
  const unread = useUnread()
  useAutoUpdate()

  useEffect(() => {
    if (!ready) return
    if (!user && !inLogin) router.replace("/login")
    else if (user && inLogin) router.replace("/")
  }, [ready, user, inLogin, router])

  // Sau khi đăng nhập: bật thông báo đẩy.
  useEffect(() => { if (user) void registerPush(true) }, [user])
  useEffect(() => { if (user && unread.data != null) setBadge(unread.data) }, [user, unread.data])
  // Có thông báo mới khi app đang mở: hiện ngay trên máy (push từ server cần backend mới, xem push_mobile.go).
  const seen = useRef<number | null>(null)
  useEffect(() => {
    const n = unread.data
    if (!user || n == null) return
    const before = seen.current
    seen.current = n
    if (before == null || n <= before) return
    void api<{ data: { title: string; body: string; link: string; read_at: string | null }[] }>("/api/v1/tenant/notifications").then((r) => {
      const fresh = r.data.filter((x) => !x.read_at).slice(0, n - before)
      for (const x of fresh) void Notifications.scheduleNotificationAsync({ content: { title: x.title, body: x.body, data: { link: x.link } }, trigger: null })
      void qc.invalidateQueries({ queryKey: ["notes"] })
    }).catch(() => {})
  }, [user, unread.data, qc])

  // Bấm vào thông báo → mở màn Thông báo.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => { void qc.invalidateQueries({ queryKey: ["notes"] }); router.push("/notifications") })
    return () => sub.remove()
  }, [router, qc])

  return (
    <View style={{ flex: 1 }}>
      {ready ? (
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", gestureEnabled: true, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="login" options={{ animation: "fade" }} />
        </Stack>
      ) : null}
      <FetchBar />
      <BrandSplash done={ready} />
    </View>
  )
}

export default function Root() {
  return (
    <QueryClientProvider client={client}>
      <BrandProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Gate />
        </AuthProvider>
      </BrandProvider>
    </QueryClientProvider>
  )
}
const s = StyleSheet.create({
  splash: { backgroundColor: "#fff", alignItems: "center", justifyContent: "center", zIndex: 99 },
  tag: { position: "absolute", bottom: 56, color: t.gold, fontWeight: "700", letterSpacing: 1 },
  track: { width: 180, height: 4, borderRadius: 2, backgroundColor: t.navySoft, overflow: "hidden", marginTop: 34 },
  run: { width: 70, height: 4, borderRadius: 2, backgroundColor: t.gold },
})
