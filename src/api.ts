import * as SecureStore from "expo-secure-store"
import Constants from "expo-constants"

export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl || "").replace(/\/$/, "")

const TOKEN_KEY = "hub_token"
let token: string | null = null
let onUnauthorized: () => void = () => {}

export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }
export async function loadToken() { token = (await SecureStore.getItemAsync(TOKEN_KEY)) || null; return token }
export async function saveToken(t: string | null) {
  token = t
  if (t) await SecureStore.setItemAsync(TOKEN_KEY, t)
  else await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

/** Ảnh/đường dẫn tương đối của server → URL đầy đủ. */
export const abs = (u?: string | null) => (!u ? "" : /^https?:/.test(u) ? u : `${API_URL}${u.startsWith("/") ? "" : "/"}${u}`)

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  // Backend chỉ trả token trong body khi header này là "zalo" (client không giữ được cookie). App mobile dùng chung đường đó.
  headers["X-Client"] = "zalo"
  if (init.body !== undefined) headers["Content-Type"] = "application/json"
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) })
  } catch {
    throw new ApiError(0, "network", "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.")
  }
  const payload = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & T
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/api/v1/auth/")) onUnauthorized()
    throw new ApiError(res.status, payload.error?.code ?? "error", payload.error?.message ?? res.statusText)
  }
  return payload
}
