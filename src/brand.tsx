import { createContext, useContext, type ReactNode } from "react"
import { Image, type ImageStyle } from "expo-image"
import type { StyleProp } from "react-native"

// Logo của app là file nằm trong app (assets/logo.png, do chủ gửi). Không lấy logo từ server nữa: ảnh logo/splash trên
// server là hình cũ (robot mascot) nên đè lên logo mới. Muốn đổi logo thì thay assets/logo.png.
export type Brand = { name: string; tagline: string; ready: boolean }
const BRAND: Brand = { name: "3RDHub Vietnam", tagline: "Dành cho Publisher", ready: true }
const Ctx = createContext<Brand>(BRAND)
export const useBrand = () => useContext(Ctx)
export const BrandProvider = ({ children }: { children: ReactNode }) => <Ctx.Provider value={BRAND}>{children}</Ctx.Provider>

/** light: bản chữ trắng tách nền, đặt trên nền xanh đậm. */
export function BrandLogo({ width, height, style, light }: { width: number; height: number; style?: StyleProp<ImageStyle>; light?: boolean }) {
  return <Image source={light ? require("../assets/logo-white.png") : require("../assets/logo.png")} style={[{ width, height }, style]} contentFit="contain" />
}
