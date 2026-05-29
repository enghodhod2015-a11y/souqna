import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '../services/authService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState('buyer')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const hasSubmitted = useRef(false) // منع الضغط المتكرر

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // منع الضغط المتكرر
    if (hasSubmitted.current) {
      toast.error('يرجى الانتظار...')
      return
    }
    
    // التحقق من الحقول
    if (!fullName.trim()) {
      toast.error('الاسم الكامل مطلوب')
      return
    }
    if (!email.trim()) {
      toast.error('البريد الإلكتروني مطلوب')
      return
    }
    if (!password.trim()) {
      toast.error('كلمة المرور مطلوبة')
      return
    }
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    
    hasSubmitted.current = true
    setLoading(true)
    
    try {
      await signUp(email, password, fullName, accountType)
      toast.success('تم إنشاء الحساب بنجاح')
      navigate('/')
    } catch (err) { 
      toast.error(err.message || 'حدث خطأ أثناء التسجيل')
      hasSubmitted.current = false // السماح بالمحاولة مرة أخرى
    } finally { 
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-primary-card p-8 rounded-2xl w-full max-w-md border border-gold/30">
        <h2 className="text-2xl font-bold text-gold mb-6 text-center">إنشاء حساب جديد</h2>
        <form onSubmit={handleSubmit}>
          <Input 
            label="الاسم الكامل" 
            value={fullName} 
            onChange={e => setFullName(e.target.value)} 
            required 
          />
          <Input 
            label="البريد الإلكتروني" 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <Input 
            label="كلمة المرور" 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          <div className="mb-4">
            <label className="block mb-1 text-text-secondary">نوع الحساب</label>
            <select 
              value={accountType} 
              onChange={e => setAccountType(e.target.value)} 
              className="w-full px-4 py-2 rounded-lg bg-white border border-gold/30 text-gray-900 focus:outline-none focus:border-gold"
            >
              <option value="buyer">مشتري</option>
              <option value="seller">بائع</option>
            </select>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'جاري التسجيل...' : 'تسجيل'}
          </Button>
        </form>
        <p className="mt-4 text-center">
          لديك حساب؟ <Link to="/login" className="text-gold">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  )
}