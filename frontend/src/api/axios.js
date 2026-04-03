import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

const AUTH_PATHS_TO_SKIP_REFRESH = [
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/token/refresh/',
]

function shouldSkipRefresh(url = '') {
  return AUTH_PATHS_TO_SKIP_REFRESH.some((path) => url.includes(path))
}

// Request interceptor - attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - silent token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !shouldSkipRefresh(originalRequest?.url)
    ) {
      originalRequest._retry = true

      try {
        const refresh = localStorage.getItem('refresh')
        if (!refresh) {
          throw new Error('No refresh token available')
        }

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
