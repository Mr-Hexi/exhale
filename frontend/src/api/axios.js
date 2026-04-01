import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — silent token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refresh = localStorage.getItem('refresh')
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/token/refresh/`,
          { refresh }
        )
        const newAccess = res.data.access
        localStorage.setItem('access', newAccess)
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return api(originalRequest)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api