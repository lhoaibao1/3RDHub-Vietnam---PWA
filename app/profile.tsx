import { Alert, ScrollView, Text, View } from "react-native"
import { Stack } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { useMutation, useQuery } from "@tanstack/react-query"
import { api, upload } from "../src/api"
import { useAuth } from "../src/auth"
import { Avatar, Button, Card, ErrorBox, Loading, Row, t } from "../src/ui"

type Acc = { email: string; display_name?: string; phone?: string; bank_name?: string; bank_account_number?: string; bank_account_name?: string; address?: string; tax_code?: string; contract_signed?: boolean }

export default function Profile() {
  const { user, patchUser } = useAuth()
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
  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />
  const a = q.data
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen options={{ title: "Thông tin cá nhân", headerBackTitle: "Quay lại" }} />
      <View style={{ alignItems: "center", gap: 12 }}>
        <Avatar url={user?.avatar_url} name={a.display_name || a.email} size={104} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Đổi ảnh" icon="camera-outline" onPress={() => pick.mutate()} busy={pick.isPending} />
          {user?.avatar_url ? <Button label="Xóa ảnh" kind="ghost" onPress={() => remove.mutate()} busy={remove.isPending} /> : null}
        </View>
      </View>
      <Card style={{ paddingVertical: 6 }}>
        <Row icon="person-outline" label="Họ tên" value={a.display_name} />
        <Row icon="mail-outline" label="Email" value={a.email} />
        <Row icon="call-outline" label="Số điện thoại" value={a.phone} />
        <Row icon="location-outline" label="Địa chỉ" value={a.address} />
        <Row icon="document-text-outline" label="Mã số thuế" value={a.tax_code} />
      </Card>
      <Card style={{ paddingVertical: 6 }}>
        <Row icon="business-outline" label="Ngân hàng" value={a.bank_name} />
        <Row icon="card-outline" label="Số tài khoản" value={a.bank_account_number} />
        <Row icon="id-card-outline" label="Chủ tài khoản" value={a.bank_account_name} />
        <Row icon="ribbon-outline" label="Hợp đồng" value={a.contract_signed ? "Đã ký" : "Chưa ký"} />
      </Card>
      <Text style={{ color: t.sub, textAlign: "center", fontSize: 12 }}>Để sửa thông tin hoặc tài khoản nhận tiền, vui lòng dùng bản web.</Text>
    </ScrollView>
  )
}
