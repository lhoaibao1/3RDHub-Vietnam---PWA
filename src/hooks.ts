import { useQuery } from "@tanstack/react-query"
import { api } from "./api"

export type Me = { role_name?: string; role_code?: string; scope?: string; can_refer?: boolean; me?: { rd_code?: string; name?: string; team_lead_name?: string; team_lead_phone?: string; am_name?: string; am_phone?: string; team_size?: number }; permissions?: Record<string, boolean> | string[]; tenant?: { name?: string } }
export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api<{ data: Me }>("/api/v1/tenant/context").then((r) => r.data), staleTime: 5 * 60_000 })
export const useUnread = () => useQuery({ queryKey: ["unread"], queryFn: () => api<{ data: { count: number } }>("/api/v1/tenant/notifications/unread").then((r) => r.data.count), refetchInterval: 30_000 })

export type Campaign = {
  id: string; name: string; status?: string; participants?: number; position?: number; created_at?: string; rating?: { avg: number; count: number }
  offer?: { banner_url?: string; thumb_url?: string; category?: string; badge?: string; highlights?: string[]; commission_rates?: import("./format").OfferRate[] }
}
export const useCampaigns = () => useQuery({ queryKey: ["campaigns"], queryFn: () => api<{ data: Campaign[] }>("/api/v1/campaigns").then((r) => r.data.filter((c) => c.status !== "archived")) })
export const useJoined = () => useQuery({ queryKey: ["joined"], queryFn: () => api<{ data: string[] }>("/api/v1/campaigns-joined").then((r) => r.data ?? []) })

export type OrderStatus = { key: string; label: string; base: string; color: string }
export const STATUS_HEX: Record<string, string> = { blue: "#2563eb", sky: "#0284c7", teal: "#0d9488", green: "#16a34a", amber: "#d97706", orange: "#ea580c", red: "#dc2626", pink: "#db2777", violet: "#7c3aed", indigo: "#4f46e5", gray: "#6b7280" }
export const useStatuses = () => useQuery({ queryKey: ["order-statuses"], queryFn: () => api<{ data: { statuses: OrderStatus[] } }>("/api/v1/tenant/order-statuses").then((r) => r.data.statuses ?? []), staleTime: 10 * 60_000 })

/** Quyền trong đơn vị (GET /tenant/context → permissions: map quyền → bật/tắt). */
export function useCan() {
  const me = useMe()
  const p = me.data?.permissions ?? {}
  return (perm: string) => (Array.isArray(p) ? p.includes(perm) : !!p[perm])
}

export type Order = {
  id: string; campaign_id?: string; project_id?: string; publisher_id?: string; external_order_id?: string
  status: string; sale_amount?: number; advertiser_payout?: number; publisher_commission: number
  created_at: string; updated_at?: string; approved_on?: string; campaign_name?: string
  partner_order_id?: string; tl_commission?: number; am_commission?: number
  /** Trường của đối tác (server đã che theo quyền): product = loại sản phẩm (NTB / Topup / Xsell…). */
  fields?: Record<string, string>
}
/** Mã đơn như bản web: mã của đối tác trước, rồi tới mã đơn. */
export const orderCode = (o: Order) => o.partner_order_id || o.external_order_id || ""
/** Đơn còn tính hoa hồng: không phải đơn bị từ chối / hủy. Mọi phép cộng hoa hồng trong app đều bỏ hai loại này. */
export const countsForCommission = (o: Order) => o.status !== "rejected" && o.status !== "cancelled"
export const commissionOf = (rows: Order[]) => rows.filter(countsForCommission).reduce((a, o) => a + (o.publisher_commission || 0), 0)
/** Toàn bộ đơn trong phạm vi của tôi (không kèm ?limit nên không bị cắt 50; tên chiến dịch ghép ở app). */
export const useOrders = () => useQuery({ queryKey: ["orders-all"], queryFn: () => api<{ data: Order[] }>("/api/v1/conversions").then((r) => r.data ?? []), staleTime: 60_000 })

export const ORDER_STATUS: Record<string, { label: string; color: string; soft: string }> = {
  pending: { label: "Chờ xử lý", color: "#B45309", soft: "#FDF0DC" },
  hold: { label: "Tạm giữ", color: "#7C3AED", soft: "#EFE7FD" },
  approved: { label: "Đã duyệt", color: "#15803D", soft: "#E3F5E8" },
  paid: { label: "Đã trả", color: "#0F766E", soft: "#DDF4F1" },
  rejected: { label: "Từ chối", color: "#B91C1C", soft: "#FBE6E6" },
  cancelled: { label: "Đã hủy", color: "#6B7280", soft: "#EEF0F5" },
}
export const orderStatus = (s: string) => ORDER_STATUS[s] ?? { label: s, color: "#6B7280", soft: "#EEF0F5" }

export type Member = {
  id: string; name: string; email?: string; status?: string; phone?: string; avatar_url?: string; rd_code?: string; uid_code?: string
  role?: string; role_code?: string; team?: string; region?: string; channel?: string; kyc_status?: string; login_status?: string
  manager_name?: string; team_lead_name?: string; am_name?: string; hod_name?: string; created_at?: string
  bank_name?: string; bank_account_number?: string; bank_account_name?: string; address?: string
}
/** Thành viên trong nhánh của tôi; chỉ gọi khi có quyền publishers.read (thành viên thường sẽ bị 403). */
export function useMembers() {
  const can = useCan()
  const on = can("publishers.read")
  return { on, ...useQuery({ queryKey: ["members"], queryFn: () => api<{ data: Member[] }>("/api/v1/publishers").then((r) => r.data ?? []), enabled: on, staleTime: 5 * 60_000 }) }
}
export const useMemberships = () => useQuery({ queryKey: ["memberships"], queryFn: () => api<{ data: Record<string, string> }>("/api/v1/campaigns-membership").then((r) => r.data ?? {}) })

/** Trạng thái eKYC của thành viên: [nhãn, màu chữ, màu nền]. */
export const KYC: Record<string, [string, string, string]> = {
  approved: ["Đã eKYC", "#15803D", "#E3F5E8"], verified: ["Đã eKYC", "#15803D", "#E3F5E8"], pending: ["Chờ duyệt eKYC", "#B45309", "#FDF0DC"],
  submitted: ["Chờ duyệt eKYC", "#B45309", "#FDF0DC"], rejected: ["eKYC bị từ chối", "#B91C1C", "#FBE6E6"], exempt: ["Miễn eKYC", "#0F766E", "#DDF4F1"], none: ["Chưa eKYC", "#6B7280", "#EEF0F5"],
}
export const kycOf = (k?: string) => KYC[k || "none"] ?? [k || "Chưa eKYC", "#6B7280", "#EEF0F5"]

/** Trạng thái hồ sơ thành viên ở backend: approved (bình thường), pending (chờ duyệt), disabled (đã khoá). */
export const memberState = (s?: string): { label: string; tone: "warn" | "bad" } | null =>
  !s || s === "approved" || s === "active" ? null : s === "pending" ? { label: "Chờ duyệt", tone: "warn" } : { label: "Ngừng hoạt động", tone: "bad" }

// ---- Báo đơn thất lạc (GET/POST /lost-orders, quyền leads.read) ----
export type LostStep = { status?: string; label?: string; by?: string; at?: string; note?: string }
export type LostTicket = {
  id: string; code: string; order_code: string; customer_phone?: string; campaign_name?: string; occurred_at?: string; sale_amount?: number
  description?: string; status: string; status_label?: string; created_at: string; updated_at?: string; publisher_id?: string
  reporter_name?: string; reporter_code?: string; history?: LostStep[]; files?: string[]
}
export const LOST_STATUS: Record<string, { label: string; color: string; soft: string }> = {
  received: { label: "3RD tiếp nhận", color: "#B45309", soft: "#FDF0DC" },
  adv_confirmed: { label: "ADV xác nhận", color: "#2563EB", soft: "#E3ECFD" },
  recorded: { label: "Ghi nhận thành công", color: "#15803D", soft: "#E3F5E8" },
  rejected: { label: "Đã từ chối", color: "#B91C1C", soft: "#FBE6E6" },
}
export const lostStatus = (x: { status: string; status_label?: string }) => LOST_STATUS[x.status] ?? { label: x.status_label || x.status, color: "#6B7280", soft: "#EEF0F5" }
export function useLost() {
  const can = useCan()
  const on = can("leads.read") || can("lost_orders.manage")
  return { on, ...useQuery({ queryKey: ["lost"], queryFn: () => api<{ data: LostTicket[] }>("/api/v1/lost-orders").then((r) => r.data ?? []), enabled: on }) }
}

// ---- Duyệt định danh (GET /tenant/kyc, chỉ Admin / Sale Admin: quyền publishers.manage + phạm vi cả đơn vị) ----
export type KycRow = {
  kyc: { user_id: string; status: string; id_number?: string; old_id_number?: string; full_name?: string; date_of_birth?: string; gender?: string; address?: string; issue_date?: string; issue_place?: string; note?: string; submitted_at?: number; reviewed_at?: number; device?: string; ip?: string }
  email?: string; display_name?: string; rd_code?: string; uid_code?: string
}
export const KYC_STATE: Record<string, { label: string; color: string; soft: string }> = {
  pending: { label: "Chờ duyệt", color: "#B45309", soft: "#FDF0DC" },
  approved: { label: "Đã duyệt", color: "#15803D", soft: "#E3F5E8" },
  rejected: { label: "Từ chối", color: "#B91C1C", soft: "#FBE6E6" },
  requested: { label: "Yêu cầu làm lại", color: "#2563EB", soft: "#E3ECFD" },
  none: { label: "Chưa gửi", color: "#6B7280", soft: "#EEF0F5" },
}
export function useKycAdmin() {
  const can = useCan(), me = useMe()
  const on = can("publishers.manage") && me.data?.scope === "TENANT"
  return { on, ...useQuery({ queryKey: ["kyc-admin"], queryFn: () => api<{ data: KycRow[] }>("/api/v1/tenant/kyc").then((r) => r.data ?? []), enabled: on }) }
}
