import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVisits, createVisit, syncVisits, getUsers, getCheckpoints } from '../../services/api'
import toast from 'react-hot-toast'
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, XCircle, Camera, Plus, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { format } from 'date-fns'

const STATUS_OPTS = [{ value: 'ok', label: 'سالم' }, { value: 'issue', label: 'مشکل‌دار' }, { value: 'critical', label: 'بحرانی' }]

function StatusBadge({ status }: { status: string }) {
  if (status === 'ok') return <span className="badge-ok flex items-center gap-1"><CheckCircle size={11} /> سالم</span>
  if (status === 'issue') return <span className="badge-issue flex items-center gap-1"><AlertTriangle size={11} /> مشکل‌دار</span>
  return <span className="badge-critical flex items-center gap-1"><XCircle size={11} /> بحرانی</span>
}

const OFFLINE_KEY = 'nfc_offline_queue'
function getQueue(): any[] { try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]') } catch { return [] } }
function saveQueue(q: any[]) { localStorage.setItem(OFFLINE_KEY, JSON.stringify(q)) }

function NewVisitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const online = navigator.onLine
  const [form, setForm] = useState({ nfc_uid_scanned: '', status: 'ok', notes: '' })
  const [simMode, setSimMode] = useState(false)
  const { data: checkpoints = [] } = useQuery({ queryKey: ['checkpoints'], queryFn: getCheckpoints })

  const mutation = useMutation({
    mutationFn: createVisit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] })
      toast.success('بازدید ثبت شد')
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'خطا در ثبت'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nfc_uid_scanned) { toast.error('شناسه NFC الزامی است'); return }
    const record = { ...form, visited_at: new Date().toISOString(), device_id: 'web-panel', local_id: crypto.randomUUID() }
    if (!online) {
      const q = getQueue()
      q.push(record)
      saveQueue(q)
      toast.success('ذخیره در حافظه محلی (آفلاین)')
      onClose()
    } else {
      mutation.mutate(record)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">ثبت بازدید جدید</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!online && (
            <div className="flex items-center gap-2 bg-orange-50 text-orange-700 text-sm px-3 py-2 rounded-lg border border-orange-200">
              <WifiOff size={14} /> حالت آفلاین — در صف ذخیره می‌شود
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">شناسه NFC</label>
              <button type="button" onClick={() => setSimMode(!simMode)} className="text-xs text-blue-600 hover:underline">
                {simMode ? 'دستی' : 'شبیه‌سازی تگ'}
              </button>
            </div>
            {simMode ? (
              <select className="input" value={form.nfc_uid_scanned} onChange={e => setForm(f => ({ ...f, nfc_uid_scanned: e.target.value }))}>
                <option value="">— انتخاب نقطه —</option>
                {checkpoints.filter((cp: any) => cp.nfc_tag).map((cp: any) => (
                  <option key={cp.id} value={cp.nfc_tag.tag_uid}>{cp.name} ({cp.nfc_tag.tag_uid})</option>
                ))}
              </select>
            ) : (
              <input className="input font-mono" placeholder="04:A3:B2:..." value={form.nfc_uid_scanned}
                onChange={e => setForm(f => ({ ...f, nfc_uid_scanned: e.target.value }))} required />
            )}
          </div>
          <div>
            <label className="label">وضعیت بازرسی</label>
            <div className="flex gap-2">
              {STATUS_OPTS.map(s => (
                <button key={s.value} type="button"
                  onClick={() => setForm(f => ({ ...f, status: s.value }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.status === s.value
                    ? s.value === 'ok' ? 'bg-green-600 text-white border-green-600'
                    : s.value === 'issue' ? 'bg-yellow-500 text-white border-yellow-500'
                    : 'bg-red-600 text-white border-red-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">توضیحات (اختیاری)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="توضیحات بازرسی..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'در حال ثبت...' : 'ثبت بازدید'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VisitsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState<any[]>(getQueue)
  const [filters, setFilters] = useState({ user_id: '', checkpoint_id: '', date_from: '', date_to: '' })

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: isAdmin })
  const { data: checkpoints = [] } = useQuery({ queryKey: ['checkpoints'], queryFn: getCheckpoints })

  const params: any = {}
  if (filters.user_id) params.user_id = Number(filters.user_id)
  if (filters.checkpoint_id) params.checkpoint_id = Number(filters.checkpoint_id)
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to

  const { data: visits = [], isLoading } = useQuery({ queryKey: ['visits', params], queryFn: () => getVisits(params) })

  useEffect(() => {
    const on = () => { setOnline(true); syncPending() }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const syncMutation = useMutation({
    mutationFn: syncVisits,
    onSuccess: (result) => {
      const synced = result.synced || []
      const remaining = getQueue().filter((r: any) => !synced.includes(r.local_id))
      saveQueue(remaining)
      setQueue(remaining)
      qc.invalidateQueries({ queryKey: ['visits'] })
      toast.success(`${synced.length} رکورد همگام‌سازی شد`)
    },
    onError: () => toast.error('خطا در همگام‌سازی'),
  })

  const syncPending = () => {
    const q = getQueue()
    if (q.length > 0) syncMutation.mutate(q)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">بازدیدها</h1>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button onClick={syncPending} disabled={!online || syncMutation.isPending}
              className="btn-secondary flex items-center gap-2 text-sm text-orange-600 border-orange-200">
              <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
              همگام‌سازی ({queue.length})
            </button>
          )}
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${online ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? 'آنلاین' : 'آفلاین'}
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> بازدید جدید
          </button>
        </div>
      </div>

      {/* Offline queue notice */}
      {queue.length > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <WifiOff size={16} className="text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">{queue.length} رکورد در صف ارسال است. پس از اتصال به شبکه همگام‌سازی خواهد شد.</p>
        </div>
      )}

      {/* Filters */}
      <div className="card py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isAdmin && (
            <div>
              <label className="label text-xs">کارشناس</label>
              <select className="input text-sm" value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}>
                <option value="">همه</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label text-xs">نقطه بازرسی</label>
            <select className="input text-sm" value={filters.checkpoint_id} onChange={e => setFilters(f => ({ ...f, checkpoint_id: e.target.value }))}>
              <option value="">همه</option>
              {checkpoints.map((cp: any) => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">از تاریخ</label>
            <input type="date" className="input text-sm" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">تا تاریخ</label>
            <input type="date" className="input text-sm" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">در حال بارگذاری...</div>
        ) : visits.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-sm">هیچ بازدیدی ثبت نشده است</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['کارشناس', 'نقطه بازرسی', 'محل', 'تاریخ و ساعت', 'وضعیت', 'توضیحات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-medium text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visits.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{v.user?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{v.checkpoint?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{v.checkpoint?.location || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {format(new Date(v.visited_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{v.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <NewVisitModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
