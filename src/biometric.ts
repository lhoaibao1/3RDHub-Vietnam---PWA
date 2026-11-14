import { Platform } from "react-native"
import * as LocalAuthentication from "expo-local-authentication"
import * as SecureStore from "expo-secure-store"

// Đăng nhập nhanh bằng Face ID / vân tay (owner, 2026-11-14). Passkey thật (WebAuthn) cần bản app build riêng; trong
// Expo Go ta khoá email + mật khẩu trong Keychain của máy và chỉ mở ra sau khi Face ID / vân tay xác nhận.
const K = { on: "bio_on", email: "bio_email", pass: "bio_pass" }
export type Bio = { available: boolean; label: string; icon: "scan-outline" | "finger-print-outline" }

export async function bioInfo(): Promise<Bio> {
  const none: Bio = { available: false, label: "sinh trắc học", icon: "finger-print-outline" }
  if (Platform.OS === "web") return none
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return none
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    return { available: true, label: face ? "Face ID" : "vân tay", icon: face ? "scan-outline" : "finger-print-outline" }
  } catch { return none }
}
export async function bioEnabled() {
  if (Platform.OS === "web") return false
  try { return (await SecureStore.getItemAsync(K.on)) === "1" } catch { return false }
}
export async function enableBio(email: string, password: string) {
  await SecureStore.setItemAsync(K.email, email)
  await SecureStore.setItemAsync(K.pass, password)
  await SecureStore.setItemAsync(K.on, "1")
}
export async function disableBio() {
  for (const k of Object.values(K)) await SecureStore.deleteItemAsync(k).catch(() => {})
}
/** Hỏi Face ID / vân tay; đúng thì trả email + mật khẩu đã lưu. */
export async function bioCredentials(): Promise<{ email: string; password: string } | null> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Đăng nhập 3RDHub Vietnam", cancelLabel: "Hủy", disableDeviceFallback: false })
  if (!r.success) return null
  const email = await SecureStore.getItemAsync(K.email), password = await SecureStore.getItemAsync(K.pass)
  return email && password ? { email, password } : null
}
/** Chỉ hỏi Face ID / vân tay (để xác nhận chủ máy khi bật tính năng). */
export async function confirmBio() {
  try { return (await LocalAuthentication.authenticateAsync({ promptMessage: "Xác nhận để bật đăng nhập nhanh", cancelLabel: "Hủy" })).success } catch { return false }
}
