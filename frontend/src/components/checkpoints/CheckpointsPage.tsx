import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCheckpoints, createCheckpoint, updateCheckpoint, deleteCheckpoint, getNfcTags, createNfcTag } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Tag, MapPin } from 'lucide-react'

function CheckpointModal({ cp, nfcTags, onClose }: { cp?: any; nfcTags: any[]; onClose: () => void }) {
  const qc = useQueryClient()
  const isEdit = !!cp
  const [form, setForm] = useState({
    name: cp?.name || '',
    code: cp?.code || '',
    location: cp?.location || '',
    description: cp?.description || '',
    nfc_tag_id: cp?.nfc_tag_id || '',
    is_active: cp?.is_active ?? true,
  })

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? updateCheckpoint(cp.id, data) : createCheckpoint(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkpoints'] })
      toast.success(isEdit ? 'نقطه ویرایش شد' : 'نقطه ایجاد شد')
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'خطا'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ ...form, nfc_tag_id: form.nfc_tag_id ? Number(form.nfc_tag_id) : null })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'ویرایش نقطه' : 'نقطه جدید'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نام نقطه</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">کد</label>
              <input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required disabled={isEdit} />
            </div>
          </div>
          <div>
            <label className="label">محل</label>
            <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className="label">توضیحات</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">تگ NFC</label>
            <select className="input" value={form.nfc_tag_id} onChange={e => setForm(f => ({ ...f, nfc_tag_id: e.target.value }))}>
              <option value="">— بدون تگ —</option>
              {nfcTags.filter(t => t.is_active).map((t: any) => (
                <option key={t.id} value={t.id}>{t.tag_uid} {t.description ? `(${t.description})` : ''}</option>
              ))}
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

function NfcTagModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ tag_uid: '', description: '' })
  const mutation = useMutation({
    mutationFn: createNfcTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nfc-tags'] }); toast.success('تگ NFC ثبت شد'); onClose() },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'خطا'),
  })
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">تگ NFC جدید</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-4">
          <div>
            <label className="label">شناسه NFC (UID)</label>
            <input className="input font-mono" placeholder="04:A3:B2:..." value={form.tag_uid} onChange={e => setForm(f => ({ ...f, tag_uid: e.target.value }))} required />
          </div>
          <div>
            <label className="label">توضیحات</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">ثبت</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CheckpointsPage() {
  const qc = useQueryClient()
  const { data: checkpoints = [], isLoading } = useQuery({ queryKey: ['checkpoints'], queryFn: getCheckpoints })
  const { data: nfcTags = [] } = useQuery({ queryKey: ['nfc-tags'], queryFn: getNfcTags })
  const [modal, setModal] = useState<any>(null)
  const [showNfc, setShowNfc] = useState(false)

  const delMutation = useMutation({
    mutationFn: deleteCheckpoint,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['checkpoints'] }); toast.success('نقطه حذف شد') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'خطا'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">نقاط بازرسی</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowNfc(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Tag size={15} /> تگ NFC جدید
          </button>
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> نقطه جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-slate-400 col-span-3 text-center py-8">در حال بارگذاری...</p>
        ) : checkpoints.map((cp: any) => (
          <div key={cp.id} className={`card relative ${!cp.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MapPin size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{cp.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{cp.code}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cp.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {cp.is_active ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            {cp.location && <p className="text-xs text-slate-500 mb-1">📍 {cp.location}</p>}
            {cp.nfc_tag ? (
              <p className="text-xs text-blue-600 mb-3 font-mono flex items-center gap-1"><Tag size={11} />{cp.nfc_tag.tag_uid}</p>
            ) : (
              <p className="text-xs text-orange-500 mb-3">⚠️ تگ NFC متصل نشده</p>
            )}
            <div className="flex gap-2 pt-2 border-t border-slate-50">
              <button onClick={() => setModal(cp)} className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1">
                <Pencil size={13} /> ویرایش
              </button>
              <button onClick={() => window.confirm('حذف شود?') && delMutation.mutate(cp.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && <CheckpointModal cp={modal === 'create' ? undefined : modal} nfcTags={nfcTags} onClose={() => setModal(null)} />}
      {showNfc && <NfcTagModal onClose={() => setShowNfc(false)} />}
    </div>
  )
}
