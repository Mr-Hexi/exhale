import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4efe8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-500)] border-t-transparent"></div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (user && !user.age_range && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (user && user.age_range && location.pathname === '/onboarding') {
    return <Navigate to="/chat" replace />
  }

  return children
}