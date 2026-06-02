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
    // CHANGED: التحقق المباشر من وجود access_token في الهاش حتى لو لم يصدر حدث PASSWORD_RECOVERY
    const checkHash = () => {
      const hash = window.location.hash
      console.log('🔐 ResetPasswordPage: hash =', hash)
      if (hash && hash.includes('access_token')) {
        setIsRecovery(true)
        return true
      }
      return false
    }

    // 1. التحقق فوراً من الهاش
    let recoveryFound = checkHash()

    // 2. الاستماع لحدث استرداد كلمة المرور من Supabase (قد لا يحدث في بعض البيئات)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 onAuthStateChange event:', event)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
        recoveryFound = true
        toast.success('يرجى إدخال كلمة المرور الجديدة')
      } else if (event === 'USER_UPDATED') {
        toast.success('تم تغيير كلمة المرور بنجاح')
        navigate('/login')
      }
    })

    // 3. إذا لم يتم العثور على هاش، نحاول الحصول على الجلسة من URL (طريقة بديلة)
    if (!recoveryFound) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.aud === 'authenticated') {
          setIsRecovery(true)
        }
      })
    }

    return () => {
      listener?.subscription.unsubscribe()
    }
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
      // إزالة الهاش من URL لتجنب إعادة استخدامه
      window.history.replaceState(null, '', window.location.pathname)
      navigate('/login')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // CHANGED: إذا لم يكن isRecovery، نعرض رسالة خطأ مع زر لمحاولة إرسال رابط جديد بدلاً من توجيه المستخدم تلقائياً للصفحة الرئيسية
  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30 text-center">
          <h2 className="text-xl font-bold text-gold mb-4">رابط غير صالح أو منتهي الصلاحية</h2>
          <p className="text-text-secondary mb-6">
            يرجى طلب رابط جديد لإعادة تعيين كلمة المرور من خلال صفحة "نسيت كلمة المرور".
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

