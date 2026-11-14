import { useEffect } from "react"
import { AppState } from "react-native"
import * as Updates from "expo-updates"

/** Bản app đã cài (TestFlight/App Store) tự tải bản cập nhật mới mỗi khi mở hoặc quay lại app, rồi nạp lại. Không cần cài lại.
 *  Trong Expo Go thì Expo Go tự lấy bản mới nhất lúc mở nên hook này không làm gì. */
export function useAutoUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return
    let busy = false
    const check = async () => {
      if (busy) return
      busy = true
      try {
        const r = await Updates.checkForUpdateAsync()
        if (r.isAvailable) {
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch {} finally { busy = false }
    }
    void check()
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") void check() })
    return () => sub.remove()
  }, [])
}
