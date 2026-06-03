import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const ROLES = [{ value: 'admin', label: 'مدیر' }, { value: 'expert', label: 'کارشناس' }]

function UserModal({ user, onClose }: { user?: any; onClose: () => void }) {
  const qc = useQueryClient()
  const isEdit = !!user
  const [form, setForm] = useState({
    username: user?.username || '',
    full_name: user?.full_name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'expert',
    is_active: user?.is_active ?? true,
  })

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? updateUser(user.id, data) : createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(isEdit ? 'کاربر ویرایش شد' : 'کاربر ایجاد شد')
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'خطا'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = { ...form }
    if (isEdit && !data.password) delete data.password
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'ویرایش کاربر' : 'کاربر جدید'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نام کاربری</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required disabled={isEdit} />
            </div>
            <div>
              <label className="label">نام و نام خانوادگی</label>
              <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">ایمیل (اختیاری)</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">{isEdit ? 'رمز عبور جدید (خالی = بدون تغییر)' : 'رمز عبور'}</label>
            <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!isEdit} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نقش</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="label">وضعیت</label>
                <select className="input" value={String(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                  <option value="true">فعال</option>
                  <option value="false">غیرفعال</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const [modal, setModal] = useState<'create' | any>(null)

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('کاربر حذف شد') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'خطا'),
  })

  const confirmDelete = (user: any) => {
    if (window.confirm(`آیا از حذف ${user.full_name} اطمینان دارید؟`)) deleteMutation.mutate(user.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">مدیریت کاربران</h1>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> کاربر جدید
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">در حال بارگذاری...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['نام و نام خانوادگی', 'نام کاربری', 'ایمیل', 'نقش', 'وضعیت', 'عملیات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-medium text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.username}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={u.role === 'admin' ? 'badge-admin' : 'badge-expert'}>
                        {u.role === 'admin' ? 'مدیر' : 'کارشناس'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal(u)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => confirmDelete(u)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <UserModal user={modal === 'create' ? undefined : modal} onClose={() => setModal(null)} />}
    </div>
  )
}
