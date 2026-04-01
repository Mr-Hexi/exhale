import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access')
    return token ? { token } : null
  })

  const login = (access, refresh) => {
    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)
    setUser({ token: access })
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}