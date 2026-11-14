import { useEffect, useState } from "react"

/** Phân trang tải dần: hiện `size` mục đầu, cuộn tới cuối hoặc bấm "Xem thêm" thì hiện thêm. Đổi bộ lọc là về trang đầu. */
export function usePaged<T>(rows: T[], size = 20, resetKey: unknown = rows) {
  const [shown, setShown] = useState(size)
  useEffect(() => { setShown(size) }, [resetKey, size])
  return {
    page: rows.slice(0, shown),
    shown: Math.min(shown, rows.length),
    total: rows.length,
    more: () => setShown((n) => (n < rows.length ? n + size : n)),
  }
}
