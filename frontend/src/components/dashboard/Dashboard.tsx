import { useQuery } from '@tanstack/react-query'
import { getDashboard, getSummary } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Eye, Users, MapPin, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const STATUS_COLORS = { ok: '#16a34a', issue: '#d97706', critical: '#dc2626' }
const STATUS_LABELS: Record<string, string> = { ok: 'سالم', issue: 'مشکل‌دار', critical: 'بحرانی' }

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    enabled: isAdmin,
    refetchInterval: 60000,
  })

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: () => getSummary(),
    enabled: isAdmin,
  })

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">خوش آمدید، {user?.full_name}</h1>
        <p className="text-slate-500 text-sm">برای ثبت بازدید به بخش بازدیدها مراجعه کنید.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">داشبورد</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="بازدید امروز" value={stats?.visits_today} color="bg-blue-600" />
        <StatCard icon={Users} label="کارشناسان فعال" value={stats?.active_experts} color="bg-green-600" />
        <StatCard icon={MapPin} label="نقاط بازدید‌نشده" value={stats?.unvisited_checkpoints} color="bg-orange-500" />
        <StatCard icon={Clock} label="در انتظار همگام‌سازی" value={stats?.pending_sync} color="bg-purple-600" />
      </div>

      {stats?.unvisited_checkpoints > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">{stats.unvisited_checkpoints} نقطه بازرسی امروز بازدید نشده است</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visits by user */}
        {summary?.by_user?.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">بازدید به تفکیک کارشناس</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.by_user} layout="vertical" margin={{ right: 30 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By status */}
        {summary?.by_status?.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">وضعیت بازدیدها</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={summary.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${STATUS_LABELS[status] || status}: ${count}`}>
                  {summary.by_status.map((entry: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, STATUS_LABELS[n as string] || n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
