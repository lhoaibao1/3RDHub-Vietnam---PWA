import { Platform } from "react-native"
import * as SecureStoreNative from "expo-secure-store"

// Trình duyệt (chỉ dùng khi chụp màn hình kiểm tra) không có SecureStore: dùng localStorage.
const SecureStore = Platform.OS === "web"
  ? { getItemAsync: async (k: string) => globalThis.localStorage?.getItem(k) ?? null, setItemAsync: async (k: string, v: string) => { globalThis.localStorage?.setItem(k, v) }, deleteItemAsync: async (k: string) => { globalThis.localStorage?.removeItem(k) } }
  : SecureStoreNative
import Constants from "expo-constants"

export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl || "").replace(/\/$/, "")
export const PROJECT_ID: string | undefined = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId

const TOKEN_KEY = "hub_token"
/** Kho lưu nhỏ của app (Keychain trên máy, localStorage trên web). */
export const store = SecureStore
let token: string | null = null
let tenantId: string | null = null
let onUnauthorized: () => void = () => {}
export const setTenant = (id: string | null) => { tenantId = id }

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

/** Đường dẫn tương đối của server → URL đầy đủ. */
export const abs = (u?: string | null) => (!u ? "" : /^https?:/.test(u) ? u : `${API_URL}${u.startsWith("/") ? "" : "/"}${u}`)
/** Nguồn ảnh cho expo-image: ảnh avatar cần Bearer, ảnh chiến dịch là public. */
export const img = (u?: string | null) => (u ? { uri: abs(u), headers: token ? { Authorization: `Bearer ${token}` } : undefined } : undefined)

async function call<T>(path: string, init: { method?: string; body?: unknown; form?: FormData; headers?: Record<string, string> }): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...init.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  // Backend chỉ trả token trong body khi header này là "zalo" (client không giữ được cookie). App mobile dùng chung đường đó.
  headers["X-Client"] = "zalo"
  if (tenantId) headers["X-Tenant-ID"] = tenantId // chỉ cần khi người dùng thuộc nhiều đơn vị
  if (init.body !== undefined) headers["Content-Type"] = "application/json"
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method: init.method ?? "GET", headers, body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)) })
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
export const api = <T,>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => call<T>(path, init)
export const upload = <T,>(path: string, form: FormData, headers?: Record<string, string>) => call<T>(path, { method: "POST", form, headers })
