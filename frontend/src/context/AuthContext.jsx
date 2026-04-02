import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('access'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.get('/api/auth/me/')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = (access, refresh) => {
    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)
    setToken(access)
  }

  const logout = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setToken(null)
    setUser(null)
  }

  const fetchUser = async () => {
    if (token) {
      const res = await api.get('/api/auth/me/')
      setUser(res.data)
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}