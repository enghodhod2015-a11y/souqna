import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../services/authService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('تم تسجيل الدخول')
      navigate('/')
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30">
        <h2 className="text-2xl font-bold text-gold mb-6 text-center">تسجيل الدخول</h2>
        <form onSubmit={handleSubmit}>
          <Input label="البريد الإلكتروني" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="كلمة المرور" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'جاري...' : 'دخول'}</Button>
        </form>
        <p className="mt-4 text-center">ليس لديك حساب؟ <Link to="/register" className="text-gold">إنشاء حساب جديد</Link></p>
      </div>
    </div>
  )
}