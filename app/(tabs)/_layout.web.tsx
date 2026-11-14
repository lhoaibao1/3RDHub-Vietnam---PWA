import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import type { ColorValue } from "react-native"
import { useUnread } from "../../src/hooks"
import { t } from "../../src/theme"

// Bản web PWA: thanh tab vẽ bằng JS ở đáy (NativeTabs chỉ có trên iOS / Android). Tìm kiếm mở từ nút kính lúp ở
// Trang chủ (/find), nên tab search bị ẩn ở đây.
export default function TabsLayoutWeb() {
  const n = useUnread().data || 0
  const icon = (on: keyof typeof Ionicons.glyphMap, off: keyof typeof Ionicons.glyphMap) =>
    ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <Ionicons name={focused ? on : off} color={color as string} size={size} />
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.navy, tabBarInactiveTintColor: t.sub, sceneStyle: { backgroundColor: t.bg }, tabBarLabelStyle: { fontWeight: "600", fontSize: 11 }, tabBarStyle: { position: "absolute", left: 12, right: 12, bottom: 10, height: 62, borderRadius: 31, borderTopWidth: 0, backgroundColor: "rgba(255,255,255,0.86)", backdropFilter: "blur(18px) saturate(180%)", boxShadow: "0 8px 30px rgba(11,42,111,0.18)", paddingBottom: 6, paddingTop: 6 } as never }}>
      <Tabs.Screen name="index" options={{ title: "Trang chủ", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="campaigns" options={{ title: "Chiến dịch", tabBarIcon: icon("megaphone", "megaphone-outline") }} />
      <Tabs.Screen name="orders" options={{ title: "Đơn hàng", tabBarIcon: icon("receipt", "receipt-outline") }} />
      <Tabs.Screen name="wallet" options={{ title: "Ví", tabBarIcon: icon("wallet", "wallet-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Tôi", tabBarIcon: icon("person-circle", "person-circle-outline"), tabBarBadge: n > 0 ? Math.min(n, 99) : undefined }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  )
}
