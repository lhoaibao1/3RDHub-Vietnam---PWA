import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { Image, type ImageStyle } from "expo-image"
import type { StyleProp } from "react-native"
import * as SecureStore from "expo-secure-store"
import { abs, API_URL } from "./api"

// Thương hiệu lấy từ API công khai GET /api/v1/appearance (chủ đổi ở Cài đặt → Giao diện), không nằm trong code.
type Appearance = {
  product_name?: string; tagline?: string; accent?: string
  logo_url?: string; topbar_logo_url?: string; sidebar_logo_url?: string; sidebar_mark_url?: string
  app?: { icon_url?: string; splash_url?: string; short_name?: string }
}
export type Brand = { name: string; tagline: string; logo: string; mark: string; ready: boolean }
const FALLBACK: Brand = { name: "3RDVN Hub", tagline: "Dành cho Publisher", logo: "", mark: "", ready: false }
const KEY = "brand_v1"
const Ctx = createContext<Brand>(FALLBACK)
export const useBrand = () => useContext(Ctx)

type Kit = { name?: string; tagline?: string; logo?: { full?: string; wide?: string; mark?: string }; icon?: { "512"?: string } }
const fromKit = (k: Kit): Brand => ({ name: k.name || FALLBACK.name, tagline: k.tagline || FALLBACK.tagline, logo: abs(k.logo?.wide || k.logo?.full), mark: abs(k.logo?.mark || k.icon?.["512"]), ready: true })
const pick = (a: Appearance): Brand => ({
  name: a.product_name || FALLBACK.name,
  tagline: FALLBACK.tagline,
  // Logo ngang: ưu tiên ảnh khởi động của app, rồi logo chính, logo thanh trên, logo sidebar.
  logo: abs(a.app?.splash_url || a.logo_url || a.topbar_logo_url || a.sidebar_logo_url),
  mark: abs(a.app?.icon_url || a.sidebar_mark_url),
  ready: true,
})

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>(FALLBACK)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try { const c = await SecureStore.getItemAsync(KEY); if (c && alive) { const j = JSON.parse(c) as { kit?: Kit; app?: Appearance }; setBrand(j.kit ? fromKit(j.kit) : pick(j as Appearance)) } } catch {}
      const get = async <T,>(path: string) => { const r = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } }); if (!r.ok) throw new Error(String(r.status)); return ((await r.json()) as { data?: T }).data }
      try {
        // GET /api/v1/brand: bộ nhận diện công khai (logo, icon, màu; đổi trên web là app tự nhận). Chưa có thì dùng /appearance.
        const kit = await get<Kit>("/api/v1/brand").catch(() => undefined)
        if (kit?.logo && alive) { setBrand(fromKit(kit)); void SecureStore.setItemAsync(KEY, JSON.stringify({ kit })).catch(() => {}) }
        else { const a = await get<Appearance>("/api/v1/appearance"); if (a && alive) { setBrand(pick(a)); void SecureStore.setItemAsync(KEY, JSON.stringify(a)).catch(() => {}) } }
      } catch { if (alive) setBrand((b) => ({ ...b, ready: true })) }
    })()
    return () => { alive = false }
  }, [])
  return <Ctx.Provider value={useMemo(() => brand, [brand])}>{children}</Ctx.Provider>
}

/** Logo ngang của hệ thống: từ API, chưa có thì dùng bản dự phòng trong máy. */
export function BrandLogo({ width, height, style }: { width: number; height: number; style?: StyleProp<ImageStyle> }) {
  const { logo } = useBrand()
  return <Image source={logo ? { uri: logo } : require("../assets/logo.png")} placeholder={require("../assets/logo.png")} style={[{ width, height }, style]} contentFit="contain" transition={200} />
}
