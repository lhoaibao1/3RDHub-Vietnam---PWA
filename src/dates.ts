export type RangeKey = "all" | "today" | "7d" | "30d" | "month" | "lastmonth"
export const RANGES: { value: RangeKey; label: string }[] = [
  { value: "all", label: "Mọi thời gian" }, { value: "today", label: "Hôm nay" }, { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" }, { value: "month", label: "Tháng này" }, { value: "lastmonth", label: "Tháng trước" },
]
/** [từ, đến) theo giờ máy (Việt Nam). */
export function rangeOf(k: RangeKey): [number, number] | null {
  const now = new Date()
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = 86400000
  switch (k) {
    case "today": return [d0.getTime(), d0.getTime() + day]
    case "7d": return [d0.getTime() - 6 * day, d0.getTime() + day]
    case "30d": return [d0.getTime() - 29 * day, d0.getTime() + day]
    case "month": return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), d0.getTime() + day]
    case "lastmonth": return [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime()]
  }
  return null
}
