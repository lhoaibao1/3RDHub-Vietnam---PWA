import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native"
import { Text } from "./text"
import { useFocusEffect, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import * as Haptics from "expo-haptics"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { t, sheet } from "./theme"

/** Rung nhẹ khi chạm (iOS). */
export const tap = () => { if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => {}) }

const liquid = Platform.OS === "ios" && (() => { try { return isLiquidGlassAvailable() } catch { return false } })()

/** Nền kính: Liquid Glass thật trên iOS 26+, kính mờ (blur) trên iOS cũ, nền mờ trên Android / web.
 *  clear: kính trong đặt trên nền tối (đầu Trang chủ), chữ / icon bên trong màu trắng. */
export function Glass({ children, style, interactive, clear }: { children?: ReactNode; style?: StyleProp<ViewStyle>; interactive?: boolean; clear?: boolean }) {
  if (liquid) return <GlassView glassEffectStyle={clear ? "clear" : "regular"} colorScheme={t.dark ? "dark" : "light"} isInteractive={interactive} style={style}>{children}</GlassView>
  if (Platform.OS === "ios") return <BlurView intensity={clear ? 35 : 60} tint={clear || t.dark ? "systemUltraThinMaterialDark" : "systemChromeMaterialLight"} style={[style, { overflow: "hidden" }]}>{children}</BlurView>
  return <View style={[style, clear ? { backgroundColor: "rgba(255,255,255,0.16)" } : { backgroundColor: t.dark ? "rgba(30,41,68,0.92)" : "rgba(255,255,255,0.92)", borderWidth: StyleSheet.hairlineWidth, borderColor: t.line }]}>{children}</View>
}

/** Nút tròn kính (quay lại, hành động trên thanh tiêu đề). */
export function GlassButton({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress() }} hitSlop={8} accessibilityLabel={label} style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }]}>
      <Glass interactive style={s.round}><Ionicons name={icon} size={20} color={t.navy} /></Glass>
    </Pressable>
  )
}

/** Thanh tiêu đề màn phụ: nút quay lại tròn bên trái, tiêu đề nhỏ ở giữa, hành động bên phải.
 *  overlay: nổi trên ảnh (chi tiết chiến dịch), không chiếm chỗ, chưa hiện tiêu đề. */
export function TopBar({ title, right, overlay }: { title?: string; right?: ReactNode; overlay?: boolean }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"))
  return (
    <View style={[s.bar, { paddingTop: insets.top + 4 }, overlay ? s.overlay : { backgroundColor: t.bg }]}>
      <GlassButton icon="chevron-back" onPress={back} label="Quay lại" />
      <Text style={[s.title, overlay && { opacity: 0 }]} numberOfLines={1}>{title}</Text>
      <View style={{ minWidth: 40, alignItems: "flex-end" }}>{right}</View>
    </View>
  )
}

/** Tiêu đề lớn kiểu iOS cho các tab chính. Bên phải mặc định là nút kính lúp mở màn Tìm kiếm (/find)
 *  (owner, 2026-11-15: tìm kiếm nằm trên tiêu đề, không phải một tab). */
export function LargeTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  return (
    <View style={[s.large, { paddingTop: insets.top + 10 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.largeText}>{title}</Text>
        {sub ? <Text style={{ color: t.sub, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right ?? <GlassButton icon="search" label="Tìm kiếm" onPress={() => router.push("/find")} />}
    </View>
  )
}

/** Mỗi tab giữ vị trí cuộn của riêng mình (owner, 2026-11-15: cuộn ở tab này thì tab khác cũng bị cuộn theo).
 *  Ghi lại vị trí khi tab đang hiện, và mỗi lần tab được mở lại thì đặt đúng về vị trí đó, nên dù thanh tab gốc có
 *  kéo các danh sách theo nhau thì tab vẫn về chỗ của nó. Gắn {...keep} vào ScrollView / FlatList của tab. */
export function useOwnScroll() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null)
  const y = useRef(0), shown = useRef(false)
  useFocusEffect(useCallback(() => {
    shown.current = false
    const put = () => { const n = ref.current; if (n?.scrollToOffset) n.scrollToOffset({ offset: y.current, animated: false }); else n?.scrollTo?.({ y: y.current, animated: false }) }
    put()
    const a = setTimeout(() => { put(); shown.current = true }, 60)
    return () => { clearTimeout(a); shown.current = false }
  }, []))
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { if (shown.current) y.current = Math.max(0, e.nativeEvent.contentOffset.y) }
  return { ref, onScroll, scrollEventThrottle: 32 }
}

/** Phân trang có số: chia danh sách thành trang, đổi bộ lọc là về trang 1. */
export function usePager<T>(rows: T[], size = 20, resetKey: unknown = undefined) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  useEffect(() => { setPage(1) }, [resetKey])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  return { page, pages, size, total: rows.length, rows: rows.slice((page - 1) * size, page * size), setPage }
}

export function Pager({ page, pages, total, size, unit = "mục", onPage }: { page: number; pages: number; total: number; size: number; unit?: string; onPage: (p: number) => void }) {
  if (total === 0) return null
  const from = (page - 1) * size + 1, to = Math.min(total, page * size)
  // 1 … 4 5 6 … 12
  const nums: (number | "…")[] = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p)
    else if (nums[nums.length - 1] !== "…") nums.push("…")
  }
  const go = (p: number) => { if (p >= 1 && p <= pages && p !== page) { tap(); onPage(p) } }
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 14 }}>
      {pages > 1 ? (
        <Glass style={s.pager}>
          <Pressable onPress={() => go(page - 1)} disabled={page === 1} style={[s.pbtn, page === 1 && { opacity: 0.3 }]}><Ionicons name="chevron-back" size={16} color={t.navy} /></Pressable>
          {nums.map((n, i) => n === "…" ? <Text key={`e${i}`} style={{ color: t.sub, paddingHorizontal: 4 }}>…</Text> : (
            <Pressable key={n} onPress={() => go(n)} style={[s.pnum, n === page && s.pnumOn]}><Text style={{ color: n === page ? "#fff" : t.text, fontWeight: "800", fontSize: 13 }}>{n}</Text></Pressable>
          ))}
          <Pressable onPress={() => go(page + 1)} disabled={page === pages} style={[s.pbtn, page === pages && { opacity: 0.3 }]}><Ionicons name="chevron-forward" size={16} color={t.navy} /></Pressable>
        </Glass>
      ) : null}
      <Text style={{ color: t.sub, fontSize: 12 }}>{from}–{to} trên {total} {unit}{pages > 1 ? ` · Trang ${page}/${pages}` : ""}</Text>
    </View>
  )
}

const s = sheet(() => StyleSheet.create({
  round: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  bar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  overlay: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 20 },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: t.text },
  large: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 6, backgroundColor: t.bg },
  largeText: { fontSize: 32, fontWeight: "900", color: t.text, letterSpacing: -0.5 },
  pager: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 22, padding: 4, overflow: "hidden" },
  pbtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pnum: { minWidth: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  pnumOn: { backgroundColor: t.solid },
}))
