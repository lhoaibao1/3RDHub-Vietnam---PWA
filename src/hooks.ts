import { useQuery } from "@tanstack/react-query"
import { api } from "./api"

export type Me = { role_name?: string; can_refer?: boolean; me?: { rd_code?: string; name?: string }; permissions?: string[]; tenant?: { name?: string } }
export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api<{ data: Me }>("/api/v1/tenant/context").then((r) => r.data), staleTime: 5 * 60_000 })
export const useUnread = () => useQuery({ queryKey: ["unread"], queryFn: () => api<{ data: { count: number } }>("/api/v1/tenant/notifications/unread").then((r) => r.data.count), refetchInterval: 60_000 })

export type Campaign = {
  id: string; name: string; status?: string; participants?: number; created_at?: string; rating?: { avg: number; count: number }
  offer?: { banner_url?: string; thumb_url?: string; category?: string; badge?: string; highlights?: string[]; commission_rates?: import("./format").OfferRate[] }
}
export const useCampaigns = () => useQuery({ queryKey: ["campaigns"], queryFn: () => api<{ data: Campaign[] }>("/api/v1/campaigns").then((r) => r.data.filter((c) => c.status !== "archived")) })
export const useJoined = () => useQuery({ queryKey: ["joined"], queryFn: () => api<{ data: string[] }>("/api/v1/campaigns-joined").then((r) => r.data ?? []) })

export type OrderStatus = { key: string; label: string; base: string; color: string }
export const STATUS_HEX: Record<string, string> = { blue: "#2563eb", sky: "#0284c7", teal: "#0d9488", green: "#16a34a", amber: "#d97706", orange: "#ea580c", red: "#dc2626", pink: "#db2777", violet: "#7c3aed", indigo: "#4f46e5", gray: "#6b7280" }
export const useStatuses = () => useQuery({ queryKey: ["order-statuses"], queryFn: () => api<{ data: { statuses: OrderStatus[] } }>("/api/v1/tenant/order-statuses").then((r) => r.data.statuses ?? []), staleTime: 10 * 60_000 })
