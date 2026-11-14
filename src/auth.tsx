import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { api, loadToken, saveToken, setUnauthorizedHandler } from "./api"

export type User = { id: string; email: string; display_name?: string }
type LoginResult = { done: true } | { done: false; ticket: string }
type Ctx = {
  ready: boolean
  user: User | null
  login: (email: string, password: string) => Promise<LoginResult>
  login2fa: (ticket: string, code: string) => Promise<void>
  logout: () => Promise<void>
}
const AuthCtx = createContext<Ctx>(null as never)
export const useAuth = () => useContext(AuthCtx)

type LoginData = { user?: User; token?: string; two_factor?: boolean; ticket?: string }

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const reset = useCallback(async () => { await saveToken(null); setUser(null); qc.clear() }, [qc])

  useEffect(() => {
    setUnauthorizedHandler(() => { void reset() })
    ;(async () => {
      if (await loadToken()) {
        try { setUser((await api<{ data: { user: User } }>("/api/v1/auth/me")).data.user) } catch { await saveToken(null) }
      }
      setReady(true)
    })()
  }, [reset])

  const finish = async (d: LoginData) => {
    if (!d.token || !d.user) throw new Error("Máy chủ không trả về phiên đăng nhập.")
    await saveToken(d.token)
    setUser(d.user)
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
    async logout() {
      try { await api("/api/v1/auth/logout", { method: "POST" }) } catch {}
      await reset()
    },
  }), [ready, user, reset])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
