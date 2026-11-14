export const vnd = (n?: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(n || 0))}đ`
export const num = (n?: number) => new Intl.NumberFormat("vi-VN").format(n || 0)
export const compact = (n?: number) => {
  const v = n || 0
  return v >= 1e9 ? `${(v / 1e9).toFixed(1)} tỷ` : v >= 1e6 ? `${(v / 1e6).toFixed(1)} tr` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(Math.round(v))
}
const p2 = (n: number) => String(n).padStart(2, "0")
export const when = (iso?: string) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? `${p2(d.getHours())}:${p2(d.getMinutes())} ${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}` : ""
}
export const day = (iso?: string) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}` : ""
}
export const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const initials = (s?: string) => (s || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
/** Nội dung HTML của admin → chữ thuần xuống dòng. */
export function plain(html?: string) {
  return (html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|ul|ol)>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim()
}
export type OfferRate = { label?: string; channel?: string; kind?: string; rate_bps?: number; amount_minor?: number; note?: string }
export const rateText = (r: OfferRate) => (r.kind === "fixed" ? vnd(r.amount_minor) : `${((r.rate_bps || 0) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`)
/** Tiền dạng gọn cho ô nhỏ: 10,57 tr · 1,2 tỷ · 950.000đ. */
export const vndShort = (n?: number) => {
  const v = Math.round(n || 0)
  const f = (x: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
  return Math.abs(v) >= 1e9 ? `${f(v / 1e9)} tỷ` : Math.abs(v) >= 1e6 ? `${f(v / 1e6)} tr` : vnd(v)
}
