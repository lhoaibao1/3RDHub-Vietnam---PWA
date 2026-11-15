import { useState } from "react"
import { Modal, Pressable, ScrollView, View } from "react-native"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"
import { img } from "./api"
import { tap } from "./chrome"
import { Text } from "./text"
import { t } from "./theme"

export type Picked = { uri: string; type: string; name: string; blob?: Blob }
/** Chọn nhiều ảnh từ thư viện (đã nén vừa phải để tải lên nhanh). */
export async function pickPhotos(max = 8): Promise<Picked[]> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: max, quality: 0.7 })
  if (r.canceled) return []
  return r.assets.slice(0, max).map((a, i) => ({ uri: a.uri, type: a.mimeType || "image/jpeg", name: a.fileName || `anh-${i + 1}.jpg`, blob: (a as { file?: Blob }).file }))
}
export function appendPhotos(form: FormData, field: string, photos: Picked[]) {
  for (const p of photos) {
    // Web: FormData cần Blob thật; điện thoại: object {uri, name, type}.
    form.append(field, (p.blob ?? { uri: p.uri, name: p.name, type: p.type }) as never)
  }
}

/** Dải ảnh nhỏ; chạm để xem lớn. `urls` là đường dẫn của server (tự gắn Bearer) hoặc uri ảnh trong máy. */
export function PhotoStrip({ urls, onRemove }: { urls: string[]; onRemove?: (i: number) => void }) {
  const [zoom, setZoom] = useState(-1)
  const src = (u: string) => (/^(file|content|blob|data|ph):/.test(u) ? { uri: u } : img(u))
  if (!urls.length) return null
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {urls.map((u, i) => (
          <Pressable key={u + i} onPress={() => { tap(); setZoom(i) }}>
            <Image source={src(u)} style={{ width: 110, height: 110, borderRadius: 14, backgroundColor: t.line }} contentFit="cover" transition={150} />
            {onRemove ? <Pressable onPress={() => onRemove(i)} hitSlop={8} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={15} color="#fff" /></Pressable> : null}
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={zoom >= 0} transparent animationType="fade" onRequestClose={() => setZoom(-1)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)", justifyContent: "center" }} onPress={() => setZoom(-1)}>
          {zoom >= 0 ? <Image source={src(urls[zoom]!)} style={{ width: "100%", height: "82%" }} contentFit="contain" /> : null}
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 12 }}>{zoom + 1}/{urls.length} · Chạm để đóng</Text>
        </Pressable>
      </Modal>
    </>
  )
}
