import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

function normalizeRegisterError(data) {
  if (!data) return 'Registration failed. Please try again.'

  const root = data.errors || data.error || data.detail || data
  if (typeof root === 'string') return root

  if (Array.isArray(root)) {
    return root.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean).join(' ')
  }

  if (typeof root === 'object') {
    const messages = Object.entries(root).flatMap(([field, value]) => {
      if (typeof value === 'string') return `${field}: ${value}`
      if (Array.isArray(value)) return value.map((msg) => `${field}: ${msg}`)
      return []
    })
    if (messages.length) return messages.join(' ')
  }

  return 'Registration failed. Please try again.'
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
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
      await api.post('/api/auth/register/', form)
      navigate('/login')
    } catch (err) {
      setError(normalizeRegisterError(err.response?.data))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="ui-shell ui-auth-shell">
      <div className="ui-auth-grid">
        <section className="ui-auth-hero hidden md:block">
          <p className="ui-kicker !text-white/70">Build Your Space</p>
          <h1 className="ui-title max-w-md !text-white">Create an account for a more thoughtful daily check-in flow.</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/78">
            Your account keeps conversations, journal entries, and mood history in one place so the experience feels coherent over time.
          </p>
          <div className="mt-10 rounded-3xl border border-white/12 bg-white/10 p-5">
            <p className="text-sm font-semibold">What you get</p>
            <div className="mt-4 grid gap-3 text-sm text-white/78">
              <p>Private conversation threads with empathetic AI responses.</p>
              <p>Emotion-tagged journaling and insight generation.</p>
              <p>Dashboard views for mood patterns and weekly reflection.</p>
            </div>
          </div>
        </section>

        <section className="ui-card flex w-full flex-col justify-center p-6 sm:p-8">
          <p className="ui-kicker">Create Account</p>
          <h1 className="ui-section-title mb-2">Start using Exhale</h1>
          <p className="ui-subtitle mb-6">Set up your account and begin building a healthier reflection habit.</p>

          {error && <p className="ui-alert-error mb-4">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
                <input
                  name="username"
                  placeholder="Choose a username"
                  value={form.username}
                  onChange={handleChange}
                  className="ui-input"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  className="ui-input"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="Create a password"
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
              {isLoading ? 'Registering...' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--brand-500)] transition-colors hover:text-[var(--brand-600)]">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
