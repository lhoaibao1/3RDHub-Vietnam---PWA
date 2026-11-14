import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import type { ColorValue } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useUnread } from "../../src/hooks"
import { t } from "../../src/theme"

export default function TabsLayout() {
  const unread = useUnread()
  const insets = useSafeAreaInsets()
  const n = unread.data || 0
  const icon = (on: keyof typeof Ionicons.glyphMap, off: keyof typeof Ionicons.glyphMap) =>
    ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <Ionicons name={focused ? on : off} color={color as string} size={size} />
  return (
    <Tabs screenOptions={{ animation: "shift", tabBarActiveTintColor: t.navy, tabBarInactiveTintColor: t.sub, headerTitleAlign: "left", headerTitleStyle: { fontWeight: "900", fontSize: 22, color: t.navy }, headerShadowVisible: false, headerStyle: { backgroundColor: t.bg, height: insets.top + 46 }, sceneStyle: { backgroundColor: t.bg }, tabBarLabelStyle: { fontWeight: "600", fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ title: "Trang chủ", headerShown: false, tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="campaigns" options={{ title: "Chiến dịch", tabBarIcon: icon("megaphone", "megaphone-outline") }} />
      <Tabs.Screen name="orders" options={{ title: "Đơn hàng", tabBarIcon: icon("receipt", "receipt-outline") }} />
      <Tabs.Screen name="wallet" options={{ title: "Ví", tabBarIcon: icon("wallet", "wallet-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Tôi", headerShown: false, tabBarIcon: icon("person", "person-outline"), tabBarBadge: n > 0 ? n : undefined }} />
    </Tabs>
  )
}
