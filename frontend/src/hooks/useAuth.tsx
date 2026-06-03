import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as apiLogin } from '../services/api'

interface AuthUser { id: number; username: string; full_name: string; role: 'admin' | 'expert' }
interface AuthCtx { user: AuthUser | null; loading: boolean; login: (u: string, p: string) => Promise<void>; logout: () => void }

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password)
    localStorage.setItem('token', data.access_token)
    const u = { id: data.user_id, username: data.username, full_name: data.full_name, role: data.role }
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
