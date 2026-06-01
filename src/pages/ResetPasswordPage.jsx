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
  const [validToken, setValidToken] = useState(false)
  const navigate = useNavigate()

  // CHANGED: التحقق من وجود token في URL hash
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      setValidToken(true)
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setValidToken(true)
        else {
          toast.error('رابط إعادة التعيين غير صالح')
          navigate('/login')
        }
      })
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
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!validToken) {
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

