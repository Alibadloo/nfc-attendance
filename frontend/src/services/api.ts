import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then(r => r.data)

// Dashboard
export const getDashboard = () =>
  api.get('/visits/dashboard').then(r => r.data)

// Users
export const getUsers = () => api.get('/users/').then(r => r.data)
export const createUser = (data: any) => api.post('/users/', data).then(r => r.data)
export const updateUser = (id: number, data: any) => api.put(`/users/${id}`, data).then(r => r.data)
export const deleteUser = (id: number) => api.delete(`/users/${id}`).then(r => r.data)

// Checkpoints
export const getCheckpoints = () => api.get('/checkpoints/').then(r => r.data)
export const createCheckpoint = (data: any) => api.post('/checkpoints/', data).then(r => r.data)
export const updateCheckpoint = (id: number, data: any) => api.put(`/checkpoints/${id}`, data).then(r => r.data)
export const deleteCheckpoint = (id: number) => api.delete(`/checkpoints/${id}`).then(r => r.data)

// NFC Tags
export const getNfcTags = () => api.get('/nfc-tags/').then(r => r.data)
export const createNfcTag = (data: any) => api.post('/nfc-tags/', data).then(r => r.data)

// Visits
export const getVisits = (params?: any) => api.get('/visits/', { params }).then(r => r.data)
export const createVisit = (data: any) => api.post('/visits/', data).then(r => r.data)
export const syncVisits = (records: any[]) => api.post('/visits/sync', { records }).then(r => r.data)
export const uploadImage = (visitId: number, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/visits/${visitId}/image`, fd).then(r => r.data)
}

// Reports
export const getSummary = (params?: any) => api.get('/reports/summary', { params }).then(r => r.data)
export const downloadExcel = (params?: any) => api.get('/reports/excel', { params, responseType: 'blob' }).then(r => r.data)
export const downloadPdf = (params?: any) => api.get('/reports/pdf', { params, responseType: 'blob' }).then(r => r.data)
