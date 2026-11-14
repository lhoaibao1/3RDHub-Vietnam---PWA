import { useCallback, useEffect, useState } from "react"
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native"
import { Text } from "../src/text"
import { useFocusEffect, useRouter } from "expo-router"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../src/auth"
import { bioEnabled, bioInfo, confirmBio, disableBio, enableBio, type Bio } from "../src/biometric"
import { TopBar, tap } from "../src/chrome"
import { openPrivacy, openTerms, ZALO_SUPPORT } from "../src/links"
import { registerPush } from "../src/push"
import { t } from "../src/ui"
import { shadow } from "../src/theme"

type RowProps = { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; sub?: string; value?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean }
function SRow({ icon, color, label, sub, value, right, onPress, danger }: RowProps) {
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress() } : undefined} disabled={!onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: t.bg }]}>
      <View style={[s.icon, { backgroundColor: color + "1A" }]}><Ionicons name={icon} size={18} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "700", color: danger ? t.bad : t.text }}>{label}</Text>
        {sub ? <Text style={{ color: t.sub, fontSize: 12, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {value ? <Text style={{ color: t.sub, maxWidth: 150 }} numberOfLines={1}>{value}</Text> : null}
      {right ?? (onPress && !danger ? <Ionicons name="chevron-forward" size={16} color={t.sub} /> : null)}
    </Pressable>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.title}>{title}</Text>
      <View style={s.group}>{children}</View>
    </View>
  )
}

export default function Settings() {
  const router = useRouter()
  const qc = useQueryClient()
  const { logout, user } = useAuth()
  const [bio, setBio] = useState<Bio | null>(null)
  const [bioOn, setBioOn] = useState(false)
  const [push, setPush] = useState<string>("")

  const refresh = useCallback(() => {
    void bioInfo().then(setBio)
    void bioEnabled().then(setBioOn)
    void Notifications.getPermissionsAsync().then((p) => setPush(p.status)).catch(() => setPush("unknown"))
  }, [])
  useEffect(refresh, [refresh])
  useFocusEffect(refresh)

  const toggleBio = (v: boolean) => {
    if (!v) { void disableBio().then(() => setBioOn(false)); return }
    const save = async (pw?: string) => {
      if (!pw || !user?.email) return
      if (!(await confirmBio())) return
      await enableBio(user.email, pw)
      setBioOn(true)
      Alert.alert("Đã bật", `Lần sau bấm "Đăng nhập bằng ${bio?.label}" ở màn đăng nhập.`)
    }
    Alert.prompt(`Bật đăng nhập bằng ${bio?.label}`, "Nhập mật khẩu đăng nhập của bạn để lưu vào máy (khoá bằng " + bio?.label + "). Tài khoản đăng nhập bằng Google/Microsoft chưa có mật khẩu thì không dùng được.", (pw) => void save(pw), "secure-text")
  }
  const askPush = async () => {
    if (push === "denied") { void Linking.openSettings(); return }
    const r = await registerPush(true)
    refresh()
    if (r === "on") Alert.alert("Đã bật thông báo", "Máy này sẽ nhận thông báo đơn hàng, hoa hồng, rút tiền.")
    else if (r === "denied") Alert.alert("Chưa cho phép", "Vào Cài đặt của iPhone → Expo Go → Thông báo để bật.")
  }
  const testPush = () => void Notifications.scheduleNotificationAsync({ content: { title: "3RDHub Vietnam", body: "Thông báo thử: máy này đã nhận được thông báo.", data: { link: "/notifications" } }, trigger: null })
  const clearCache = async () => {
    qc.clear()
    await Image.clearMemoryCache().catch(() => {})
    await Image.clearDiskCache().catch(() => {})
    Alert.alert("Đã xoá bộ nhớ đệm", "Dữ liệu sẽ được tải lại mới.")
  }
  const sha = (process.env.EXPO_PUBLIC_BUILD_SHA || "").slice(0, 7)

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Cài đặt" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }}>
        <Section title="Bảo mật">
          {bio?.available ? (
            <SRow icon={bio.icon} color="#2563EB" label={`Đăng nhập bằng ${bio.label}`} sub={bioOn ? "Đang bật cho máy này" : "Đăng nhập nhanh, không cần gõ mật khẩu"} right={<Switch value={bioOn} onValueChange={toggleBio} trackColor={{ true: t.navy }} />} />
          ) : <SRow icon="finger-print-outline" color="#6B7280" label="Đăng nhập bằng Face ID / vân tay" sub="Máy này chưa cài Face ID hoặc vân tay" />}
          <View style={s.line} />
          <SRow icon="key-outline" color="#7C3AED" label="Đổi mật khẩu" onPress={() => router.push("/password")} />
        </Section>
        <Section title="Thông báo">
          <SRow icon="notifications-outline" color="#D97706" label="Thông báo đẩy" sub={push === "granted" ? "Đang bật" : push === "denied" ? "Đang tắt — chạm để mở Cài đặt iPhone" : "Chưa bật — chạm để bật"} value={push === "granted" ? "Bật" : "Tắt"} onPress={askPush} />
          <View style={s.line} />
          <SRow icon="paper-plane-outline" color="#0F766E" label="Gửi thông báo thử" sub="Kiểm tra máy này có hiện thông báo" onPress={testPush} />
        </Section>
        <Section title="Hỗ trợ & pháp lý">
          <SRow icon="chatbubbles-outline" color="#0068FF" label="Nhóm Zalo hỗ trợ" onPress={() => void Linking.openURL(ZALO_SUPPORT)} />
          <View style={s.line} />
          <SRow icon="document-text-outline" color={t.navy2} label="Điều khoản sử dụng" onPress={openTerms} />
          <View style={s.line} />
          <SRow icon="shield-checkmark-outline" color="#15803D" label="Chính sách bảo mật" onPress={openPrivacy} />
        </Section>
        <Section title="Ứng dụng">
          <SRow icon="information-circle-outline" color={t.navy} label="Phiên bản" value={`v${Constants.expoConfig?.version}${sha ? ` · ${sha}` : ""}`} />
          <View style={s.line} />
          <SRow icon="trash-outline" color="#B45309" label="Xoá bộ nhớ đệm" sub="Tải lại dữ liệu và ảnh mới nhất" onPress={() => void clearCache()} />
        </Section>
        <View style={s.group}>
          <SRow icon="log-out-outline" color={t.bad} label="Đăng xuất" danger onPress={() => Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [{ text: "Hủy", style: "cancel" }, { text: "Đăng xuất", style: "destructive", onPress: () => void logout() }])} />
        </View>
      </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({
  title: { color: t.sub, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 6 },
  group: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  line: { height: StyleSheet.hairlineWidth, backgroundColor: t.line, marginLeft: 60 },
})
