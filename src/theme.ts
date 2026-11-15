import { Appearance } from "react-native"
import { bumpPrefs, darkNow, onPrefs, prefs } from "./prefs"

// Bảng màu sáng / tối. `t` và `shadow` là object cố định, đổi giao diện thì ghi đè giá trị tại chỗ; style viết bằng
// sheet(() => StyleSheet.create({...})) được tính lại theo giao diện mới, root layout dựng lại cây giao diện.
// navy: màu thương hiệu dùng làm chữ / icon / nút trên nền thường (ở nền tối là xanh sáng cho đọc được).
// solid: nền của nút / mục đang chọn (chữ trắng bên trong).
// brand / brand2: xanh navy gốc cho các khối gradient (chữ trắng bên trong), giống nhau ở cả hai giao diện.
const light = {
  navy: "#0B2A6F", navy2: "#1B3F94", navySoft: "#E8EDF9", solid: "#0B2A6F",
  gold: "#FF6A2B", goldSoft: "#FFEDE4",
  bg: "#F4F6FB", card: "#FFFFFF", text: "#0F1B3D", sub: "#6B7690", line: "#E4E8F1", fill: "#E7EBF4",
  ok: "#15803D", okSoft: "#E3F5E8", warn: "#B45309", warnSoft: "#FDF0DC", bad: "#B91C1C", badSoft: "#FBE6E6",
}
const dark: typeof light = {
  navy: "#8FB0FF", navy2: "#6F97F5", navySoft: "#1C2A4A", solid: "#2F5FD0",
  gold: "#FF7A45", goldSoft: "#3A2218",
  bg: "#0A1020", card: "#141C30", text: "#E9EDF7", sub: "#94A0B8", line: "#273350", fill: "#1B2540",
  ok: "#4ADE80", okSoft: "#12301F", warn: "#FBBF24", warnSoft: "#33270E", bad: "#F87171", badSoft: "#3A1A1A",
}
export const t = { ...light, brand: "#0B2A6F", brand2: "#1B3F94", radius: 16, dark: false }
export const shadow = { shadowColor: "#0B2A6F", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }

function apply() {
  const d = darkNow()
  Object.assign(t, d ? dark : light, { dark: d })
  Object.assign(shadow, { shadowColor: d ? "#000" : "#0B2A6F", shadowOpacity: d ? 0.3 : 0.08 })
}
apply()
onPrefs(apply)
// "Theo máy": máy đổi sáng/tối thì app đổi theo.
Appearance.addChangeListener(() => { if (prefs.theme === "system") bumpPrefs() })

/** Style phụ thuộc giao diện: tính lại khi đổi sáng/tối. Dùng: const s = sheet(() => StyleSheet.create({...})). */
export function sheet<T extends object>(make: () => T): T {
  let v = -1, cur = {} as T
  const get = () => { if (v !== prefs.version) { cur = make(); v = prefs.version } return cur }
  return new Proxy({} as T, { get: (_, k) => get()[k as keyof T] })
}
