import { NativeTabs } from "expo-router/native-tabs"
import { useUnread } from "../../src/hooks"
import { t } from "../../src/theme"
import { L } from "../../src/i18n"

// disableAutomaticContentInsets: NativeTabs mặc định ÉP ScrollView đầu tiên của mỗi tab tự chừa vùng an toàn (và bỏ qua
// contentInsetAdjustmentBehavior của màn), trong khi các màn đã tự chừa bằng insets → bị hụt hai lần ở Trang chủ
// (owner, 2026-11-14: "nó hụt xuống cả khúc"). Tắt đi; mỗi màn tự lo: trên = insets.top, dưới = paddingBottom 110.
// Thanh tab gốc của iOS: kính Liquid Glass trên iOS 26+. Không bật thu nhỏ khi cuộn (minimizeBehavior): nó gắn thanh tab
// vào danh sách đang cuộn và bị nghi làm các tab cuộn theo nhau (owner, 2026-11-15).
export default function TabsLayout() {
  const unread = useUnread()
  const n = unread.data || 0
  return (
    <NativeTabs tintColor={t.navy} labelStyle={{ fontWeight: "600" }}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>{L("Trang chủ")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="campaigns" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} md="campaign" />
        <NativeTabs.Trigger.Label>{L("Chiến dịch")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} md="receipt_long" />
        <NativeTabs.Trigger.Label>{L("Đơn hàng")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "wallet.bifold", selected: "wallet.bifold.fill" }} md="account_balance_wallet" />
        <NativeTabs.Trigger.Label>{L("Ví")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
        <NativeTabs.Trigger.Label>{L("Tôi")}</NativeTabs.Trigger.Label>
        {n > 0 ? <NativeTabs.Trigger.Badge>{String(Math.min(n, 99))}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
