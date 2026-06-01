import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { resetPassword } from '../services/authService'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('البريد الإلكتروني مطلوب')
      return
    }
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني')
    } catch (err) {
      toast.error(err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30 text-center">
          <h2 className="text-2xl font-bold text-gold mb-4">تم الإرسال</h2>
          <p className="text-text-secondary mb-6">
            تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني <strong>{email}</strong>.
            يرجى التحقق من صندوق الوارد (أو البريد غير المرغوب فيه).
          </p>
          <Link to="/login" className="text-gold underline">العودة إلى تسجيل الدخول</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30">
        <h2 className="text-2xl font-bold text-gold mb-2 text-center">نسيت كلمة المرور</h2>
        <p className="text-text-secondary text-center mb-6">
          أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </Button>
        </form>
        <p className="mt-4 text-center">
          <Link to="/login" className="text-gold">تذكرت كلمة المرور؟ تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  )
}

