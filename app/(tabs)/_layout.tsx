import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../src/api"
import { c } from "../../src/ui"

export default function TabsLayout() {
  const unread = useQuery({ queryKey: ["unread"], queryFn: () => api<{ data: { count: number } }>("/api/v1/tenant/notifications/unread"), refetchInterval: 60_000 })
  const n = unread.data?.data.count || 0
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: import("react-native").ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.brand, headerTitleAlign: "center" }}>
      <Tabs.Screen name="index" options={{ title: "Tổng quan", tabBarIcon: icon("stats-chart") }} />
      <Tabs.Screen name="campaigns" options={{ title: "Chiến dịch", tabBarIcon: icon("megaphone") }} />
      <Tabs.Screen name="orders" options={{ title: "Đơn hàng", tabBarIcon: icon("receipt") }} />
      <Tabs.Screen name="wallet" options={{ title: "Ví", tabBarIcon: icon("wallet") }} />
      <Tabs.Screen name="account" options={{ title: "Tôi", tabBarIcon: icon("person"), tabBarBadge: n > 0 ? n : undefined }} />
    </Tabs>
  )
}
