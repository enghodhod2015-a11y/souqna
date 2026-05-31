import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createOrder } from '../services/orderService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { product, quantity = 1 } = location.state || {}
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    shipping_address: '',
    shipping_city: '',
    payment_method: 'كريم',
    color: 'أحمر',
    size: 'M'
  })

  if (!product) {
    return <div className="text-center py-20 text-text-secondary">لا توجد بيانات منتج. يرجى المحاولة مرة أخرى.</div>
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.shipping_address.trim() || !formData.shipping_city.trim()) {
      toast.error('يرجى ملء جميع حقول الشحن لتجهيز طلبك')
      return
    }

    setLoading(true)
    try {
      const additionalDetails = `اللون: ${formData.color}, المقاس: ${formData.size}`
      const combinedNotes = additionalDetails

      const totalPrice = product.final_price * quantity

      const orderData = {
        buyer_id: user?.id,
        seller_id: product.seller_id,
        product_id: product.id,
        quantity: quantity,
        unit_price: product.final_price,
        total_amount: totalPrice,
        shipping_address: formData.shipping_address,
        shipping_city: formData.shipping_city,
        payment_method: formData.payment_method,
        order_status: 'pending_payment_review',
        payment_status: 'unpaid',          // ✅ تغيير القيمة لتتفق مع check constraint
        notes: combinedNotes
      }
      
      const order = await createOrder(orderData)
      toast.success('تم إنشاء الطلب بنجاح')
      navigate(`/payment/${order.id}`)
    } catch (err) {
      console.error('Order creation error:', err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalPrice = product.final_price * quantity

  const colorOptions = ['أحمر', 'أزرق', 'أخضر', 'أسود', 'أبيض']
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gold mb-6">إنهاء الطلب</h1>
      
      <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 mb-6">
        <h2 className="text-xl font-bold mb-2">{product.title}</h2>
        <div className="flex justify-between text-text-secondary text-sm mb-2">
          <span>سعر الوحدة:</span>
          <span>{product.final_price} ريال</span>
        </div>
        <div className="flex justify-between text-text-secondary text-sm mb-4">
          <span>الكمية:</span>
          <span>{quantity}</span>
        </div>
        <hr className="border-gold/20 mb-4" />
        <div className="flex justify-between font-bold text-lg text-gold">
          <span>إجمالي المبلغ:</span>
          <span>{totalPrice} ريال</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-primary-card p-6 rounded-2xl border border-gold/30 space-y-4">
        <h3 className="text-lg font-bold text-gold mb-2">معلومات الشحن والدفع</h3>
        
        <div>
          <label className="block text-sm mb-1 text-text-secondary">المدينة</label>
          <Input type="text" name="shipping_city" value={formData.shipping_city} onChange={handleChange} placeholder="مثال: الرياض، جدة..." required />
        </div>

        <div>
          <label className="block text-sm mb-1 text-text-secondary">العنوان بالتفصيل</label>
          <Input type="text" name="shipping_address" value={formData.shipping_address} onChange={handleChange} placeholder="اسم الحي، الشارع، رقم المنزل..." required />
        </div>

        <div>
          <label className="block text-sm mb-1 text-text-secondary">اللون</label>
          <select
            name="color"
            value={formData.color}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
          >
            {colorOptions.map(color => <option key={color} value={color}>{color}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-text-secondary">المقاس</label>
          <select
            name="size"
            value={formData.size}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
          >
            {sizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-text-secondary">طريقة الدفع</label>
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
          >
            <option value="كريم">حساب كريمي</option>
            <option value="حوالة موحدة">حوالة موحدة</option>
          </select>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري معالجة الطلب...' : 'تأكيد وإنشاء الطلب'}
          </Button>
        </div>
      </form>
    </div>
  )
}

