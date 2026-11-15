import { Platform, Pressable as RNPressable, StyleSheet, type PressableProps, type ViewStyle } from "react-native"
import { t } from "./theme"

// Nút bấm dùng chung cho cả app (thay Pressable của react-native).
// Android (owner, 2026-11-15: Android theo Material 3): gợn sóng (ripple) khi chạm thay cho hiệu ứng thu nhỏ / mờ của iOS.
//  - Nút có khung riêng (nền, bo góc, padding, flex…) → gợn sóng trong khung, theo bo góc.
//  - Nút chỉ bọc một icon / mặt kính tròn (không style riêng) → gợn sóng tròn tràn ra ngoài như nút icon Material.
//  - Không có con (nền mờ phía sau bottom sheet) → không gợn sóng.
//  - Truyền android_ripple (kể cả null) để tự quyết.
// iOS / web: giữ nguyên Pressable gốc.
const framed = (st: ViewStyle) =>
  st.backgroundColor != null || st.borderRadius != null || st.padding != null || st.paddingVertical != null ||
  st.paddingHorizontal != null || st.flex != null || st.width != null || st.minWidth != null || st.borderBottomWidth != null

export function Pressable(props: PressableProps) {
  if (Platform.OS !== "android" || props.android_ripple !== undefined || props.children == null) return <RNPressable {...props} />
  const raw = typeof props.style === "function" ? props.style({ pressed: false }) : props.style
  const box = framed(StyleSheet.flatten(raw) || {})
  return (
    <RNPressable
      {...props}
      // Ripple thay phản hồi lúc nhấn: style dạng hàm luôn nhận pressed=false (bỏ thu nhỏ / làm mờ kiểu iOS).
      style={raw}
      android_ripple={props.disabled ? undefined : box ? { color: t.ripple, foreground: true } : { color: t.ripple, borderless: true }}
    />
  )
}
