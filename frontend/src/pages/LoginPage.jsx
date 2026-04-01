import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Welcome back</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg mb-4">
            {error}
          </p>
        )}

        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          No account?{' '}
          <Link to="/register" className="text-blue-500 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}