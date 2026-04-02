import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/shared/Logo'
import Footer from '../components/shared/Footer'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const res = await api.post('/api/auth/login/', form)
      login(res.data.access, res.data.refresh)
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="ui-shell min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1080px] mx-auto flex pb-6 pt-2">
        <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
      </div>

      <div className="ui-auth-grid flex-grow items-center mx-auto w-full max-w-[1080px]">
        <section className="ui-auth-hero hidden md:block">
          <p className="ui-kicker !text-white/70">Reflective Support</p>
          <h1 className="ui-title max-w-md !text-white">A calmer space to check in with yourself.</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/78">
            Exhale combines empathetic AI conversation, emotion detection, and personal mood tracking in one focused wellness workspace.
          </p>
          <div className="mt-10 grid gap-3">
            <div className="rounded-3xl border border-white/12 bg-white/10 p-4">
              <p className="text-sm font-semibold">Emotion-aware chat</p>
              <p className="mt-1 text-sm text-white/72">Structured support that stays readable during stressful moments.</p>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/10 p-4">
              <p className="text-sm font-semibold">Mood history and journaling</p>
              <p className="mt-1 text-sm text-white/72">A consistent interface for noticing patterns over time.</p>
            </div>
          </div>
        </section>

        <section className="ui-card flex w-full flex-col justify-center p-6 sm:p-8">
          <p className="ui-kicker">Welcome Back</p>
          <h1 className="ui-section-title mb-2">Sign in to continue</h1>
          <p className="ui-subtitle mb-6">Pick up where you left off in chat, journal, and dashboard.</p>

          {error && <p className="ui-alert-error mb-4">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
                <input
                  name="username"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={handleChange}
                  className="ui-input"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className="ui-input"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="ui-btn ui-btn-primary mt-6 w-full"
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            No account?{' '}
            <Link to="/register" className="font-semibold text-[var(--brand-500)] transition-colors hover:text-[var(--brand-600)]">
              Register
            </Link>
          </p>
        </section>
      </div>

      <div className="w-full max-w-[1080px] mx-auto mt-8">
        <Footer className="!bg-[var(--bg-surface-soft)]/20" />
      </div>
    </div>
  )
}
