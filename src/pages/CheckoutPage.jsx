import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createOrder } from '../services/orderService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { user } = useAuth()
  const location = useLocation()
  const { product, quantity = 1 } = location.state || {}
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    shipping_address: '',
    shipping_city: '',
    payment_method: 'bank_transfer'
  })

  if (!product) {
    return <div className="text-center py-20">لا توجد بيانات منتج. يرجى المحاولة مرة أخرى.</div>
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const orderData = {
        buyer_id: user.id,
        seller_id: product.seller_id,
        product_id: product.id,
        quantity: quantity,
        unit_price: product.final_price,
        shipping_address: formData.shipping_address,
        shipping_city: formData.shipping_city,
        payment_method: formData.payment_method,
        order_status: 'pending_payment_review',
        payment_status: 'pending'
      }
      const order = await createOrder(orderData)
      toast.success('تم إنشاء الطلب بنجاح')
      window.location.href = `/payment/${order.id}`
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gold mb-6">إنهاء الطلب</h1>
      <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 mb-6">
        <h2 className="text-xl font-bold">{product.title}</h2>
        <p className="text-gold">السعر: {product.final_price} ريال × {quantity}</p>
        <p className="text-gold font-bold">الإجمالي: {product.final_price * quantity} ريال</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-primary-card p-6 rounded-2xl border border-gold/30">
        <Input label="عنوان الشحن" name="shipping_address" value={formData.shipping_address} onChange={handleChange} required />
        <Input label="المدينة" name="shipping_city" value={formData.shipping_city} onChange={handleChange} required />
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">طريقة الدفع</label>
          <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-primary-card border border-gold/30 text-white">
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="cash_on_delivery">الدفع عند الاستلام</option>
          </select>
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'جاري...' : 'تأكيد الطلب'}</Button>
      </form>
    </div>
  )
}