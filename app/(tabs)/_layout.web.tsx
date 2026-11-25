import { Tabs } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import type { ColorValue } from "react-native"
import { useUnread } from "../../src/hooks"
import { t } from "../../src/theme"
import { L } from "../../src/i18n"

// Bản web PWA: thanh tab vẽ bằng JS ở đáy (NativeTabs chỉ có trên iOS / Android). Cao 68 để không cắt chữ dưới icon,
// đáy nhích lên trên vạch Home của iPhone khi cài ra màn hình chính (safe-area-inset-bottom).
export default function TabsLayoutWeb() {
  const n = useUnread().data || 0
  const bottom = useSafeAreaInsets().bottom
  const icon = (on: keyof typeof Ionicons.glyphMap, off: keyof typeof Ionicons.glyphMap) =>
    ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <Ionicons name={focused ? on : off} color={color as string} size={size} />
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: t.navy, tabBarInactiveTintColor: t.sub, sceneStyle: { backgroundColor: t.bg }, tabBarLabelStyle: { fontWeight: "600", fontSize: 11, lineHeight: 14, flexShrink: 0 }, tabBarItemStyle: { height: 60, paddingVertical: 4 }, tabBarStyle: { position: "absolute", left: 12, right: 12, bottom: Math.max(10, bottom), height: 68, borderRadius: 34, borderTopWidth: 0, backgroundColor: t.dark ? "rgba(20,28,48,0.88)" : "rgba(255,255,255,0.86)", backdropFilter: "blur(18px) saturate(180%)", boxShadow: "0 8px 30px rgba(11,42,111,0.18)", paddingBottom: 4, paddingTop: 4 } as never }}>
      <Tabs.Screen name="index" options={{ title: L("Trang chủ"), tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="campaigns" options={{ title: L("Chiến dịch"), tabBarIcon: icon("megaphone", "megaphone-outline") }} />
      <Tabs.Screen name="orders" options={{ title: L("Đơn hàng"), tabBarIcon: icon("receipt", "receipt-outline") }} />
      <Tabs.Screen name="wallet" options={{ title: L("Ví"), tabBarIcon: icon("wallet", "wallet-outline") }} />
      <Tabs.Screen name="account" options={{ title: L("Tôi"), tabBarIcon: icon("person-circle", "person-circle-outline"), tabBarBadge: n > 0 ? Math.min(n, 99) : undefined }} />
    </Tabs>
  )
}
