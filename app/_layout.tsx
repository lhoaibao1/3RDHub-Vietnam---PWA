import { useEffect } from "react"
import { Slot, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "../src/auth"
import { Loading } from "../src/ui"

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function Gate() {
  const { ready, user } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const inLogin = segments[0] === "login"
  useEffect(() => {
    if (!ready) return
    if (!user && !inLogin) router.replace("/login")
    else if (user && inLogin) router.replace("/")
  }, [ready, user, inLogin, router])
  return ready ? <Slot /> : <Loading />
}

export default function Root() {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  )
}
