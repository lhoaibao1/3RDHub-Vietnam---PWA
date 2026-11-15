import { Alert, ScrollView, View } from "react-native"
import { Text } from "../src/text"
import { TopBar } from "../src/chrome"
import * as ImagePicker from "expo-image-picker"
import { useMutation, useQuery } from "@tanstack/react-query"
import { api, upload } from "../src/api"
import { useAuth } from "../src/auth"
import { useRouter } from "expo-router"
import { Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Avatar, ErrorBox, Loading, t } from "../src/ui"
import { Chip2, Hero, InfoGroup, InfoRow } from "../src/detail"
import { useMe } from "../src/hooks"
import { day } from "../src/format"

type Acc = { id_number?: string; date_of_birth?: string; email: string; display_name?: string; phone?: string; bank_name?: string; bank_account_number?: string; bank_account_name?: string; address?: string; tax_code?: string; contract_signed?: boolean }

export default function Profile() {
  const { user, patchUser } = useAuth()
  const router = useRouter()
  const me = useMe()
  const q = useQuery({ queryKey: ["account"], queryFn: () => api<{ data: Acc }>("/api/v1/tenant/account").then((r) => r.data) })
  const pick = useMutation({
    mutationFn: async () => {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 })
      if (r.canceled) return null
      const a = r.assets[0]!
      const form = new FormData()
      form.append("file", { uri: a.uri, name: "avatar.jpg", type: a.mimeType || "image/jpeg" } as never)
      return (await upload<{ data: { avatar_url: string } }>("/api/v1/tenant/account/avatar", form)).data.avatar_url
    },
    onSuccess: (url) => { if (url) patchUser({ avatar_url: url }) },
    onError: (e: Error) => Alert.alert("Không đổi được ảnh", e.message),
  })
  const remove = useMutation({
    mutationFn: () => api("/api/v1/tenant/account/avatar", { method: "DELETE" }),
    onSuccess: () => patchUser({ avatar_url: "" }),
  })
  if (q.isPending) return <View style={{ flex: 1 }}><TopBar title="Thông tin cá nhân" /><Loading rows={3} /></View>
  if (q.isError) return <View style={{ flex: 1 }}><TopBar title="Thông tin cá nhân" /><ErrorBox error={q.error} retry={() => q.refetch()} /></View>
  const a = q.data
  const name = a.display_name || a.email
  const photo = () => Alert.alert("Ảnh đại diện", undefined, [
    { text: "Chọn ảnh mới", onPress: () => pick.mutate() },
    ...(user?.avatar_url ? [{ text: "Xoá ảnh", style: "destructive" as const, onPress: () => remove.mutate() }] : []),
    { text: "Hủy", style: "cancel" as const },
  ])
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Thông tin cá nhân" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Hero style={{ alignItems: "center" }}>
          <Pressable onPress={photo} style={{ padding: 4, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.25)" }}>
            <Avatar url={user?.avatar_url} name={name} size={92} />
            <View style={{ position: "absolute", right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: t.gold, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: t.card }}>
              <Ionicons name={pick.isPending || remove.isPending ? "hourglass-outline" : "camera"} size={15} color="#fff" />
            </View>
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }} numberOfLines={1}>{name}</Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {me.data?.role_name ? <Chip2 label={me.data.role_name} bg={t.gold} /> : null}
            {me.data?.me?.rd_code ? <Chip2 label={`Mã ${me.data.me.rd_code}`} /> : null}
            <Chip2 label={a.contract_signed ? "Đã ký hợp đồng" : "Chưa ký hợp đồng"} />
          </View>
        </Hero>
        <InfoGroup title="Liên hệ">
          <InfoRow first icon="mail-outline" color="#2563EB" label="Email" value={a.email} copy />
          <InfoRow icon="call-outline" color="#15803D" label="Số điện thoại" value={a.phone} copy={!!a.phone} />
          <InfoRow icon="location-outline" color="#B45309" label="Địa chỉ" value={a.address} />
        </InfoGroup>
        <InfoGroup title="Giấy tờ">
          <InfoRow first icon="id-card-outline" color="#7C3AED" label="Số CCCD" value={a.id_number} />
          <InfoRow icon="gift-outline" color="#DB2777" label="Ngày sinh" value={a.date_of_birth ? (day(a.date_of_birth) || a.date_of_birth) : ""} />
          <InfoRow icon="document-text-outline" color="#0F766E" label="Mã số thuế" value={a.tax_code} />
        </InfoGroup>
        <InfoGroup title="Tài khoản nhận tiền">
          <InfoRow first icon="business-outline" color={t.navy2} label="Ngân hàng" value={a.bank_name} />
          <InfoRow icon="card-outline" color={t.gold} label="Số tài khoản" value={a.bank_account_number} />
          <InfoRow icon="person-outline" color="#475569" label="Chủ tài khoản" value={a.bank_account_name} />
        </InfoGroup>
        <InfoGroup title="Bảo mật">
          <InfoRow first icon="key-outline" color="#7C3AED" label="Mật khẩu" value="Đổi mật khẩu" onPress={() => router.push("/password")} />
        </InfoGroup>
        <Text style={{ color: t.sub, textAlign: "center", fontSize: 12 }}>Để sửa thông tin cá nhân hoặc tài khoản nhận tiền, vui lòng dùng bản web.</Text>
      </ScrollView>
    </View>
  )
}
