import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { Wifi } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success('خوش آمدید')
      navigate('/')
    } catch {
      toast.error('نام کاربری یا رمز عبور اشتباه است')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
            <Wifi size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">سامانه پایش حضور</h1>
          <p className="text-blue-200 text-sm mt-1">مبتنی بر NFC</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5 text-center">ورود به سیستم</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">نام کاربری</label>
              <input
                className="input"
                placeholder="نام کاربری خود را وارد کنید"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required autoFocus
              />
            </div>
            <div>
              <label className="label">رمز عبور</label>
              <input
                type="password"
                className="input"
                placeholder="رمز عبور خود را وارد کنید"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'در حال ورود...' : 'ورود'}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-4">کاربر پیش‌فرض: admin / admin1234</p>
        </div>
      </div>
    </div>
  )
}
