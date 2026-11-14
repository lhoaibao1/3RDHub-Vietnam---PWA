import { Alert, Linking, ScrollView, Text, View } from "react-native"
import { useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import Constants from "expo-constants"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "../../src/auth"
import { API_URL } from "../../src/api"
import { useMe, useUnread } from "../../src/hooks"
import { Avatar, Button, Card, Pill, Row, t } from "../../src/ui"

export default function Account() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const me = useMe()
  const unread = useUnread()
  const name = user?.display_name || user?.email || ""
  const code = me.data?.me?.rd_code
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 30 }}>
      <LinearGradient colors={[t.navy, t.navy2]} style={{ paddingTop: insets.top + 24, paddingBottom: 28, alignItems: "center", gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <Avatar url={user?.avatar_url} name={name} size={84} />
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>{name}</Text>
        {user?.display_name ? <Text style={{ color: "#C9D6F5" }}>{user.email}</Text> : null}
        {me.data?.role_name ? <Pill label={me.data.role_name} tone="gold" /> : null}
      </LinearGradient>
      <View style={{ padding: 16, gap: 14 }}>
        {code ? (
          <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View><Text style={{ color: t.sub, fontSize: 12 }}>Mã Publisher</Text><Text style={{ fontSize: 20, fontWeight: "900", color: t.navy, letterSpacing: 1 }}>{code}</Text></View>
            <Button label="Sao chép" kind="ghost" onPress={() => { void Clipboard.setStringAsync(code); Alert.alert("Đã sao chép mã") }} />
          </Card>
        ) : null}
        <Card style={{ paddingVertical: 6 }}>
          <Row icon="person-outline" label="Thông tin cá nhân" onPress={() => router.push("/profile")} />
          <Row icon="link-outline" label="Link giới thiệu của tôi" onPress={() => router.push("/links")} />
          <Row icon="notifications-outline" label="Thông báo" value={(unread.data || 0) > 0 ? `${unread.data} chưa đọc` : ""} onPress={() => router.push("/notifications")} />
          <Row icon="globe-outline" label="Mở bản web" onPress={() => Linking.openURL(API_URL)} />
        </Card>
        <Button label="Đăng xuất" kind="ghost" icon="log-out-outline" onPress={() => Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [{ text: "Hủy", style: "cancel" }, { text: "Đăng xuất", style: "destructive", onPress: () => void logout() }])} />
        <Text style={{ color: t.sub, textAlign: "center", fontSize: 12 }}>3RDVN Hub · v{Constants.expoConfig?.version}</Text>
        <Text selectable style={{ color: t.sub, textAlign: "center", fontSize: 12 }}>Bản cập nhật: {(process.env.EXPO_PUBLIC_BUILD_SHA || "chạy thử trên máy").slice(0, 7)}{process.env.EXPO_PUBLIC_BUILD_AT ? ` · ${new Date(process.env.EXPO_PUBLIC_BUILD_AT).toLocaleString("vi-VN")}` : ""}</Text>
      </View>
    </ScrollView>
  )
}
