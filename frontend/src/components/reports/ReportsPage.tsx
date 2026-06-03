import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSummary, downloadExcel, downloadPdf, getUsers, getCheckpoints } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FileSpreadsheet, FileText, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = { ok: '#16a34a', issue: '#d97706', critical: '#dc2626' }
const STATUS_LABELS: Record<string, string> = { ok: 'سالم', issue: 'مشکل‌دار', critical: 'بحرانی' }

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({ user_id: '', checkpoint_id: '', date_from: '', date_to: '' })
  const [exporting, setExporting] = useState<string | null>(null)

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { data: checkpoints = [] } = useQuery({ queryKey: ['checkpoints'], queryFn: getCheckpoints })

  const params: any = {}
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to

  const { data: summary, isLoading } = useQuery({ queryKey: ['summary', params], queryFn: () => getSummary(params) })

  const handleExcel = async () => {
    setExporting('excel')
    try {
      const blob = await downloadExcel(params)
      downloadBlob(blob, 'visits_report.xlsx')
      toast.success('فایل Excel دانلود شد')
    } catch { toast.error('خطا در دانلود') } finally { setExporting(null) }
  }

  const handlePdf = async () => {
    setExporting('pdf')
    try {
      const blob = await downloadPdf(params)
      downloadBlob(blob, 'visits_report.pdf')
      toast.success('فایل PDF دانلود شد')
    } catch { toast.error('خطا در دانلود') } finally { setExporting(null) }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">گزارش‌ها</h1>

      {/* Filter + Export bar */}
      <div className="card py-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-sm font-medium text-slate-600">
            <Filter size={15} /> فیلتر:
          </div>
          <div>
            <label className="label text-xs">از تاریخ</label>
            <input type="date" className="input text-sm" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">تا تاریخ</label>
            <input type="date" className="input text-sm" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </div>
          <div className="flex gap-2 mr-auto">
            <button onClick={handleExcel} disabled={!!exporting}
              className="btn-secondary flex items-center gap-2 text-sm text-green-700 border-green-200 hover:bg-green-50">
              <FileSpreadsheet size={15} />
              {exporting === 'excel' ? 'دانلود...' : 'Excel'}
            </button>
            <button onClick={handlePdf} disabled={!!exporting}
              className="btn-secondary flex items-center gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50">
              <FileText size={15} />
              {exporting === 'pdf' ? 'دانلود...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">در حال بارگذاری...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* By user */}
          {summary?.by_user?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">بازدید به تفکیک کارشناس</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={summary.by_user} layout="vertical" margin={{ right: 30 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" name="تعداد" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By checkpoint */}
          {summary?.by_checkpoint?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">بازدید به تفکیک نقطه</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={summary.by_checkpoint} layout="vertical" margin={{ right: 30 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" name="تعداد" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By status */}
          {summary?.by_status?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">توزیع وضعیت بازدیدها</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={summary.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={85}
                    label={({ status, count }) => `${STATUS_LABELS[status] || status}: ${count}`}>
                    {summary.by_status.map((entry: any, i: number) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, STATUS_LABELS[n as string] || n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary table */}
          {summary?.by_user?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">جدول خلاصه</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-right py-2 text-slate-600 font-medium">کارشناس</th>
                      <th className="text-center py-2 text-slate-600 font-medium">تعداد بازدید</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {summary.by_user.map((r: any) => (
                      <tr key={r.name} className="hover:bg-slate-50">
                        <td className="py-2">{r.name}</td>
                        <td className="py-2 text-center font-semibold text-blue-600">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
