import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // CHANGED: حفظ الهاش ثم إزالته من الرابط قبل أي تفاعل مع Supabase
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) {
      setIsRecovery(false)
      return
    }

    // إزالة الهاش من الرابط نهائياً قبل محاولة تعيين الجلسة
    window.history.replaceState(null, '', window.location.pathname)

    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (accessToken && type === 'recovery') {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      }).then(({ error }) => {
        if (error) {
          console.error(error)
          toast.error('رابط غير صالح أو منتهي الصلاحية')
          setIsRecovery(false)
        } else {
          setIsRecovery(true)
          toast.success('الرابط صالح، يرجى إدخال كلمة المرور الجديدة')
        }
      }).catch(() => {
        toast.error('حدث خطأ في التحقق من الرابط')
        setIsRecovery(false)
      })
    } else {
      setIsRecovery(false)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('كلمة المرور غير متطابقة')
      return
    }
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('تم تغيير كلمة المرور بنجاح')
      navigate('/login')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30 text-center">
          <h2 className="text-xl font-bold text-gold mb-4">رابط غير صالح أو منتهي الصلاحية</h2>
          <p className="text-text-secondary mb-6">الرابط الذي استخدمته غير صالح. يرجى طلب رابط جديد.</p>
          <button onClick={() => navigate('/forgot-password')} className="text-gold underline">طلب رابط جديد</button>
          <div className="mt-4"><button onClick={() => navigate('/login')} className="px-4 py-2 bg-gold text-primary-blue rounded-lg font-bold">العودة لتسجيل الدخول</button></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30">
        <h2 className="text-2xl font-bold text-gold mb-6 text-center">إعادة تعيين كلمة المرور</h2>
        <form onSubmit={handleSubmit}>
          <Input label="كلمة المرور الجديدة" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Input label="تأكيد كلمة المرور" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</Button>
        </form>
      </div>
    </div>
  )
}

