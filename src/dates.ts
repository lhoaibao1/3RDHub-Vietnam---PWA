// Khoảng thời gian của bộ lọc. Giá trị là một chuỗi: một khoá có sẵn ("today", "yesterday", "7d"…) hoặc khoảng tự
// chọn dạng "c:2026-11-01:2026-11-10" (từ ngày – đến ngày, tính cả hai đầu).
export type RangeKey = "all" | "today" | "yesterday" | "7d" | "30d" | "month" | "lastmonth"
export const RANGES: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Hôm nay" }, { value: "yesterday", label: "Hôm qua" }, { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" }, { value: "month", label: "Tháng này" }, { value: "lastmonth", label: "Tháng trước" },
  { value: "all", label: "Mọi thời gian" },
]
const DAY = 86400000
const p2 = (n: number) => String(n).padStart(2, "0")
export const ymdOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const dmy = (ymd: string) => ymd.split("-").reverse().join("/")
const at = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(y!, (m ?? 1) - 1, d ?? 1).getTime() }
export const customRange = (from: string, to: string) => `c:${from}:${to}`
export const isCustom = (k: string) => k.startsWith("c:")

/** [từ, đến) theo giờ máy; null = mọi thời gian. */
export function rangeOf(k: string): [number, number] | null {
  if (isCustom(k)) { const [, a, b] = k.split(":"); return a && b ? [at(a), at(b) + DAY] : null }
  const now = new Date()
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  switch (k) {
    case "today": return [d0, d0 + DAY]
    case "yesterday": return [d0 - DAY, d0]
    case "7d": return [d0 - 6 * DAY, d0 + DAY]
    case "30d": return [d0 - 29 * DAY, d0 + DAY]
    case "month": return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), d0 + DAY]
    case "lastmonth": return [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime()]
  }
  return null
}
/** Ngày đầu và ngày cuối (yyyy-mm-dd, tính cả hai đầu) để gửi cho API dashboard; "all" lấy 365 ngày. */
export function rangeDays(k: string): { from: string; to: string } {
  const w = rangeOf(k) ?? [Date.now() - 364 * DAY, Date.now() + DAY]
  return { from: ymdOf(new Date(w[0])), to: ymdOf(new Date(w[1] - 1)) }
}
export function rangeLabel(k: string): string {
  if (isCustom(k)) { const [, a, b] = k.split(":"); return a === b ? dmy(a ?? "") : `${dmy(a ?? "").slice(0, 5)} – ${dmy(b ?? "")}` }
  return RANGES.find((r) => r.value === k)?.label ?? k
}
