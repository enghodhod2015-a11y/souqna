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
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // CHANGED: إزالة الهاش من الرابط فوراً قبل أي تفاعل مع Supabase
    const hash = window.location.hash
    console.log('🔐 ResetPasswordPage - hash:', hash)
    
    if (!hash || !hash.includes('access_token')) {
      setReady(false)
      return
    }

    // استخراج parameters من الهاش
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    
    // إزالة الهاش من الرابط بشكل دائم قبل أي استدعاء لـ Supabase
    window.history.replaceState(null, '', window.location.pathname)
    console.log('🔐 تم إزالة الهاش من الرابط')

    if (accessToken && type === 'recovery') {
      // تعيين الجلسة يدوياً بعد تنظيف الرابط
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      }).then(({ data, error }) => {
        if (error) {
          console.error('خطأ في تعيين الجلسة:', error)
          toast.error('الرابط غير صالح أو منتهي الصلاحية')
          setReady(false)
        } else {
          console.log('تم تعيين الجلسة بنجاح')
          setReady(true)
          toast.success('الرابط صالح، يرجى إدخال كلمة المرور الجديدة')
        }
      }).catch(err => {
        console.error(err)
        toast.error('حدث خطأ في التحقق من الرابط')
        setReady(false)
      })
    } else {
      setReady(false)
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

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30 text-center">
          <h2 className="text-xl font-bold text-gold mb-4">رابط غير صالح أو منتهي الصلاحية</h2>
          <p className="text-text-secondary mb-6">
            الرابط الذي استخدمته غير صالح. يرجى طلب رابط جديد.
          </p>
          <button 
            onClick={() => navigate('/forgot-password')} 
            className="text-gold underline hover:text-gold/80"
          >
            طلب رابط جديد
          </button>
          <div className="mt-4">
            <button 
              onClick={() => navigate('/login')} 
              className="px-4 py-2 bg-gold text-primary-blue rounded-lg font-bold hover:bg-gold/90"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30">
        <h2 className="text-2xl font-bold text-gold mb-6 text-center">إعادة تعيين كلمة المرور</h2>
        <form onSubmit={handleSubmit}>
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Input
            label="تأكيد كلمة المرور"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </Button>
        </form>
      </div>
    </div>
  )
}

