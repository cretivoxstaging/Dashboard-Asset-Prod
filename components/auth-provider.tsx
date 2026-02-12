"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

type AuthUser = {
  email: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = "ticket-sales-dashboard:user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          (data && typeof data.error === "string" && data.error) ||
          "Gagal masuk. Silakan coba lagi."
        throw new Error(message)
      }

      const nextUser: AuthUser = {
        email: (data && data.user && typeof data.user.email === "string"
          ? data.user.email
          : email) as string,
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth hanya bisa dipakai di dalam AuthProvider.")
  }
  return context
}

