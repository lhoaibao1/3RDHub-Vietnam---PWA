import { Share } from "react-native"
import * as Clipboard from "expo-clipboard"
import { Alert } from "react-native"

/** Chia sẻ một đoạn chữ / link. Trình duyệt không có bảng chia sẻ (Chrome máy tính, một số Android) thì Share.share
 *  của react-native-web báo lỗi: chép vào bộ nhớ tạm và báo cho người dùng thay vì im lặng. Người dùng tự đóng bảng
 *  chia sẻ (AbortError) thì không làm gì. */
export async function share(message: string) {
  try { await Share.share({ message }) } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return
    await Clipboard.setStringAsync(message).catch(() => {})
    Alert.alert("Đã sao chép", "Máy này không mở được bảng chia sẻ, nội dung đã được chép để bạn dán vào Zalo / Messenger.")
  }
}
