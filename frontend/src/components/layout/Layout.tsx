import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, MapPin, ClipboardList, BarChart2, LogOut, Wifi, WifiOff, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard, adminOnly: false },
  { to: '/visits', label: 'بازدیدها', icon: ClipboardList, adminOnly: false },
  { to: '/checkpoints', label: 'نقاط بازرسی', icon: MapPin, adminOnly: true },
  { to: '/users', label: 'کاربران', icon: Users, adminOnly: true },
  { to: '/reports', label: 'گزارش‌ها', icon: BarChart2, adminOnly: true },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [online, setOnline] = useState(navigator.onLine)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }
  const visible = navItems.filter(n => !n.adminOnly || user?.role === 'admin')

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">NFC</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">پایش حضور</p>
            <p className="text-xs text-slate-400">سامانه بازرسی</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 space-y-3">
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${online ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? 'آنلاین' : 'آفلاین'}
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
            {user?.full_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400">{user?.role === 'admin' ? 'مدیر' : 'کارشناس'}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-l border-slate-100 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 bg-white h-full shadow-xl ml-auto">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-slate-800 text-sm">سامانه پایش حضور</span>
          <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
