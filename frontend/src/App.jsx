import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/shared/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import JournalPage from './pages/JournalPage'
import OnboardingPage from './pages/OnboardingPage'
import { ErrorBoundary } from "./components/shared/ErrorBoundary";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/register" element={<RegisterPage />} />
          
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <OnboardingPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ChatPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DashboardPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/journal"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <JournalPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}