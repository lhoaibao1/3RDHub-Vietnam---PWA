import { useEffect, useRef, useState } from "react"
import { Animated, Easing, StyleSheet, View } from "react-native"
import { Slot, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SplashScreen from "expo-splash-screen"
import * as Notifications from "expo-notifications"
import { Image } from "expo-image"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "../src/auth"
import { BrandLogo, BrandProvider, useBrand } from "../src/brand"
import { registerPush, setBadge } from "../src/push"
import { useUnread } from "../src/hooks"
import { t } from "../src/theme"

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
      <Animated.View style={{ opacity: fade, transform: [{ scale: pop }], alignItems: "center", gap: 18 }}>
        <BrandLogo width={260} height={117} />
        <Image source={require("../assets/mascot-wave.png")} style={{ width: 74, height: 78 }} contentFit="contain" />
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
  const inLogin = segments[0] === "login"
  const unread = useUnread()

  useEffect(() => {
    if (!ready) return
    if (!user && !inLogin) router.replace("/login")
    else if (user && inLogin) router.replace("/")
  }, [ready, user, inLogin, router])

  // Sau khi đăng nhập: bật thông báo đẩy.
  useEffect(() => { if (user) void registerPush(true) }, [user])
  useEffect(() => { if (user && unread.data != null) setBadge(unread.data) }, [user, unread.data])

  // Bấm vào thông báo → mở màn Thông báo.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => { void qc.invalidateQueries({ queryKey: ["notes"] }); router.push("/notifications") })
    return () => sub.remove()
  }, [router, qc])

  return (
    <View style={{ flex: 1 }}>
      {ready ? <Slot /> : null}
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
})
