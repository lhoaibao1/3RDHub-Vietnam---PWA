import { StyleSheet, Text as RNText, TextInput, type TextProps } from "react-native"

// Chữ dùng font hệ thống của Apple (San Francisco) (owner, 2026-11-14: "dùng font apple"). Chỉ hạ độ đậm 900 xuống
// 800 để tiêu đề và số tiền đỡ nặng nề.
export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) as { fontWeight?: string | number } | undefined
  return <RNText {...rest} style={String(flat?.fontWeight) === "900" ? [style, { fontWeight: "800" }] : style} />
}
export { TextInput }
