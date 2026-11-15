import { isDark } from "./prefs"

// Bảng màu sáng / tối. Chọn một lần lúc nạp app (src/prefs.ts); đổi giao diện thì app nạp lại.
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
export const t = { ...(isDark ? dark : light), brand: "#0B2A6F", brand2: "#1B3F94", radius: 16, dark: isDark }
export const shadow = { shadowColor: isDark ? "#000" : "#0B2A6F", shadowOpacity: isDark ? 0.3 : 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 } as const
