import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      toast.success('تم إرسال رسالتك بنجاح')
      setFormData({ name: '', email: '', message: '' })
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gold mb-8 text-center">اتصل بنا</h1>
      <div className="bg-primary-card p-8 rounded-2xl border border-gold/30">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="الاسم"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <Input
            label="البريد الإلكتروني"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div>
            <label className="block mb-2 text-text-secondary">الرسالة</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="5"
              className="w-full px-4 py-3 rounded-lg bg-primary-card border border-gold/30 text-white focus:border-gold focus:outline-none"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
          </Button>
        </form>
      </div>
    </div>
  )
}


