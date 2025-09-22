import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AuthContextValue = {
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }){
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  const login = async (email: string, password: string) => {
    const body = new URLSearchParams()
    body.set('username', email)
    body.set('password', password)
    const res = await fetch('/auth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!res.ok) throw new Error('Login failed')
    const data = await res.json()
    setToken(data.access_token)
  }

  const logout = () => setToken(null)

  const authFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {})
    if (token) headers.set('Authorization', 'Bearer ' + token)
    return fetch(input, { ...init, headers })
  }

  const value = useMemo<AuthContextValue>(() => ({ token, login, logout, authFetch }), [token])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(){
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

