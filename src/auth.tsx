import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { api, loadToken, saveToken, setTenant, setUnauthorizedHandler } from "./api"
import { unregisterPush } from "./push"

type Me = { user: User; memberships?: { tenant_id: string; status: string; tenant_status: string }[] }
export type User = { id: string; email: string; display_name?: string; avatar_url?: string }
type LoginResult = { done: true } | { done: false; ticket: string }
type Ctx = {
  ready: boolean
  user: User | null
  login: (email: string, password: string) => Promise<LoginResult>
  login2fa: (ticket: string, code: string) => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  logout: () => Promise<void>
  patchUser: (p: Partial<User>) => void
}
const AuthCtx = createContext<Ctx>(null as never)
export const useAuth = () => useContext(AuthCtx)

type LoginData = { user?: User; token?: string; two_factor?: boolean; ticket?: string }

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const reset = useCallback(async () => { await saveToken(null); setTenant(null); setUser(null); qc.clear() }, [qc])
  // Một đơn vị thì server tự nhận; nhiều đơn vị thì phải gửi X-Tenant-ID (lấy đơn vị đang hoạt động đầu tiên).
  const adopt = useCallback((me: Me) => {
    const act = (me.memberships ?? []).filter((m) => m.status === "active" && m.tenant_status === "active")
    setTenant(act.length > 1 ? act[0]!.tenant_id : null)
    setUser(me.user)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => { void reset() })
    ;(async () => {
      if (await loadToken()) {
        try { adopt((await api<{ data: Me }>("/api/v1/auth/me")).data) } catch { await saveToken(null) }
      }
      setReady(true)
    })()
  }, [reset, adopt])

  const finish = async (d: LoginData) => {
    if (!d.token || !d.user) throw new Error("Máy chủ không trả về phiên đăng nhập.")
    await saveToken(d.token)
    try { adopt((await api<{ data: Me }>("/api/v1/auth/me")).data) } catch { setUser(d.user) }
  }

  const value = useMemo<Ctx>(() => ({
    ready, user,
    async login(email, password) {
      const { data } = await api<{ data: LoginData }>("/api/v1/auth/login", { method: "POST", body: { email, password } })
      if (data.two_factor && data.ticket) return { done: false, ticket: data.ticket }
      await finish(data)
      return { done: true }
    },
    async login2fa(ticket, code) {
      const { data } = await api<{ data: LoginData }>("/api/v1/auth/login/2fa", { method: "POST", body: { ticket, code } })
      await finish(data)
    },
    async loginWithToken(token) {
      await saveToken(token)
      try { adopt((await api<{ data: Me }>("/api/v1/auth/me")).data) } catch (e) { await saveToken(null); throw e }
    },
    async logout() {
      await unregisterPush()
      try { await api("/api/v1/auth/logout", { method: "POST" }) } catch {}
      await reset()
    },
    patchUser: (p) => setUser((u) => (u ? { ...u, ...p } : u)),
  }), [ready, user, reset])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
