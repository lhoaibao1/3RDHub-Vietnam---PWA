import { Alert, type AlertButton } from "react-native"
import { prefs } from "./prefs"
import { EN } from "./en"

// Tiếng Anh: giao diện viết bằng tiếng Việt ngay trong code; khi chọn English, mọi chuỗi đi qua L() và được tra trong
// bảng src/en.ts (khoá là đúng câu tiếng Việt). Component Text / TextInput của app (src/text.tsx) tự gọi L() cho chữ
// tĩnh, nên màn hình không phải sửa. Câu nào chưa có trong bảng thì hiện nguyên tiếng Việt.
export const lang = prefs.lang
const en = lang === "en"

export function L(s: string): string
export function L(s: string | undefined | null): string | undefined | null
export function L(s: string | undefined | null) {
  if (!en || !s) return s
  const hit = EN[s]
  if (hit !== undefined) return hit
  const core = s.trim()
  if (core === s || !core) return s
  const mid = EN[core]
  return mid === undefined ? s : s.replace(core, mid)
}

// Hộp thoại hệ thống (Alert) trên điện thoại: dịch tiêu đề, nội dung, chữ trên nút.
if (en) {
  const native = Alert.alert.bind(Alert)
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[], ...rest: never[]) =>
    native(L(title), L(message) ?? undefined, buttons?.map((b) => ({ ...b, text: L(b.text) ?? undefined })), ...rest)
}
