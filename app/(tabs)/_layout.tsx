import { NativeTabs } from "expo-router/native-tabs"
import { useUnread } from "../../src/hooks"
import { t } from "../../src/theme"

// Thanh tab gốc của iOS: kính Liquid Glass trên iOS 26+, thu nhỏ khi cuộn xuống (owner, 2026-11-14: "hiệu ứng iOS27").
export default function TabsLayout() {
  const unread = useUnread()
  const n = unread.data || 0
  return (
    <NativeTabs tintColor={t.navy} minimizeBehavior="onScrollDown" labelStyle={{ fontWeight: "600" }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabs.Trigger.Label>Trang chủ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="campaigns">
        <NativeTabs.Trigger.Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
        <NativeTabs.Trigger.Label>Chiến dịch</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <NativeTabs.Trigger.Label>Đơn hàng</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <NativeTabs.Trigger.Icon sf={{ default: "wallet.bifold", selected: "wallet.bifold.fill" }} />
        <NativeTabs.Trigger.Label>Ví</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <NativeTabs.Trigger.Label>Tôi</NativeTabs.Trigger.Label>
        {n > 0 ? <NativeTabs.Trigger.Badge>{String(Math.min(n, 99))}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
