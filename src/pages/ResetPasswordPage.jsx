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
    // CHANGED: طريقة مختلفة تماماً - استخراج access_token من الهاش وتعيين الجلسة يدوياً
    const hash = window.location.hash
    console.log('🔐 ResetPasswordPage - hash:', hash)
    
    if (!hash || !hash.includes('access_token')) {
      // لا يوجد رمز، نعرض رسالة خطأ
      setReady(false)
      return
    }

    // استخراج parameters من الهاش
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const expiresAt = params.get('expires_at')
    const type = params.get('type')
    
    if (accessToken && type === 'recovery') {
      // تعيين الجلسة يدوياً لتجاوز مشكلة clock skew
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
      // تحديث كلمة المرور باستخدام الجلسة الحالية (التي تم تعيينها يدوياً)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('تم تغيير كلمة المرور بنجاح')
      // مسح الهاش من الرابط
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/login')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // إذا لم يكن ready بعد ولم نجد access_token، نعرض رسالة انتظار أو رابط فاشل
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30 text-center">
          <h2 className="text-xl font-bold text-gold mb-4">رابط إعادة التعيين</h2>
          <p className="text-text-secondary mb-6">
            جاري التحقق من الرابط...
          </p>
          <button 
            onClick={() => navigate('/forgot-password')} 
            className="text-gold underline hover:text-gold/80"
          >
            طلب رابط جديد
          </button>
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


