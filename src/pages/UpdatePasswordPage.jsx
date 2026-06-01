import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const navigate = useNavigate()

  // CHANGED: التحقق من صحة الرابط واستعادة الجلسة من hash token
  useEffect(() => {
    const handleResetPassword = async () => {
      // Supabase يضع token في hash URL عند إعادة تعيين كلمة المرور
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        // تعيين الجلسة يدوياً باستخدام التوكنات المستلمة
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (error) {
          console.error('خطأ في تعيين الجلسة:', error)
          toast.error('الرابط غير صالح أو منتهي الصلاحية')
          navigate('/login')
        } else {
          setIsValidToken(true)
        }
      } else {
        // التحقق من وجود جلسة نشطة بالفعل
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsValidToken(true)
        } else {
          toast.error('رابط إعادة التعيين غير صالح')
          navigate('/login')
        }
      }
    }

    handleResetPassword()
  }, [navigate])

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
      // تسجيل الخروج للتأكد من استخدام كلمة المرور الجديدة
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-white">جاري التحقق من الرابط...</p>
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

