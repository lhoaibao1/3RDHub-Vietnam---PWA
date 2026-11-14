import * as WebBrowser from "expo-web-browser"
import * as Crypto from "expo-crypto"
import { api, ApiError, API_URL } from "./api"

export type Provider = "google" | "microsoft"
export const providerName: Record<Provider, string> = { google: "Google", microsoft: "Microsoft" }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const ERR: Record<string, string> = {
  no_account: "Tài khoản này chưa gắn với thành viên 3RDHub Vietnam. Hãy đăng nhập bằng email, hoặc nhắn hỗ trợ.",
  disabled: "Đăng nhập bằng tài khoản này đang tắt.",
}

/** Đăng nhập Google / Microsoft cho app (dùng lại luồng của Zalo Mini App ở backend, không cần sửa server):
 *  mở trình duyệt tới /auth/oauth/{provider}/start?mini=<mã ngẫu nhiên>, rồi hỏi /auth/oauth/mini/<mã> tới khi có token. */
export async function oauthSignIn(provider: Provider): Promise<string | null> {
  const code = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, "")
  let closedAt = 0
  void WebBrowser.openBrowserAsync(`${API_URL}/api/v1/auth/oauth/${provider}/start?mini=${code}`, { dismissButtonStyle: "close", presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET })
    .then(() => { closedAt = Date.now() })
  const until = Date.now() + 10 * 60_000
  try {
    while (Date.now() < until) {
      await sleep(1500)
      try {
        const r = await api<{ data: { token?: string; error?: string } }>(`/api/v1/auth/oauth/mini/${code}`)
        if (r.data.token) return r.data.token
        throw new Error(ERR[r.data.error ?? ""] ?? "Chưa đăng nhập được, thử lại sau.")
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e
        // Người dùng đã đóng trình duyệt mà chưa xong: chờ thêm chút rồi thôi.
        if (closedAt && Date.now() - closedAt > 5000) return null
      }
    }
    return null
  } finally {
    void Promise.resolve().then(() => WebBrowser.dismissBrowser()).catch(() => {})
  }
}

export const fetchProviders = async () => {
  try { return (await api<{ data: Record<string, boolean> }>("/api/v1/auth/oauth/providers")).data } catch { return {} }
}
