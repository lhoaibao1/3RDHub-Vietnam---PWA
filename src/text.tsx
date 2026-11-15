import { Children, type ReactNode } from "react"
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from "react-native"
import { L, lang } from "./i18n"

// Chữ dùng font hệ thống của Apple (San Francisco) (owner, 2026-11-14: "dùng font apple"). Hạ độ đậm 900 xuống 800
// để tiêu đề và số tiền đỡ nặng nề. Khi ngôn ngữ là English, chữ tĩnh bên trong được dịch qua L() (src/i18n.ts).
const tr = (c: ReactNode): ReactNode => (typeof c === "string" ? L(c) : Array.isArray(c) ? c.map((x) => (typeof x === "string" ? L(x) : x)) : c)

export function Text({ style, children, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) as { fontWeight?: string | number } | undefined
  const kids = lang === "en" ? (Array.isArray(children) ? Children.map(children, tr) : tr(children)) : children
  return <RNText {...rest} style={String(flat?.fontWeight) === "900" ? [style, { fontWeight: "800" }] : style}>{kids}</RNText>
}
export function TextInput({ placeholder, ...rest }: TextInputProps) {
  return <RNTextInput {...rest} placeholder={L(placeholder) ?? undefined} />
}
