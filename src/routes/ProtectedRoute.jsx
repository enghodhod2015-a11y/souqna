import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading } = useAuth()
  const [timeoutReached, setTimeoutReached] = useState(false)

  useEffect(() => {
    if (!loading && user && !profile) {
      // إذا مضت 3 ثوانٍ ولا يزال profile مفقوداً، نعتبر أن هناك خطأ
      const timer = setTimeout(() => setTimeoutReached(true), 3000)
      return () => clearTimeout(timer)
    } else {
      setTimeoutReached(false)
    }
  }, [loading, user, profile])

  if (loading) {
    return <div className="text-center py-20">جاري التحقق...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    // إذا وصلنا إلى هنا وكان timeoutReached = true، نعرض خيارات بدلاً من الانتظار الأبدي
    if (timeoutReached) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 max-w-md text-center">
            <p className="text-red-400 mb-4">⚠️ فشل تحميل بيانات المستخدم</p>
            <p className="text-text-secondary mb-4">
              قد يكون هناك خلل في حسابك. يرجى المحاولة مرة أخرى أو تسجيل الخروج.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="bg-gold text-primary-blue"
              >
                إعادة تحميل الصفحة
              </Button>
              <Button
                onClick={async () => {
                  const { supabase } = await import('../services/supabase')
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                variant="secondary"
              >
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      )
    }
    // في أول 3 ثوانٍ نعرض رسالة انتظار عادية
    return <div className="text-center py-20">جاري تحميل البيانات...</div>
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.account_type)) {
    return <Navigate to="/" replace />
  }

  return children
}

