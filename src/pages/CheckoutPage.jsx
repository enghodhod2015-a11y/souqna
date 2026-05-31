import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createOrder } from '../services/orderService'
import { supabase } from '../services/supabase'  // ✅ المسار الصحيح
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { product, quantity: initialQuantity = 1 } = location.state || {}
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [stock, setStock] = useState(null)
  const [actualPrice, setActualPrice] = useState(null)
  const [formData, setFormData] = useState({
    shipping_address: '',
    shipping_city: '',
    payment_method: 'كريم',
    color: 'أحمر',
    size: 'M'
  })

  useEffect(() => {
    const fetchProductData = async () => {
      if (!product?.id) return
      const { data, error } = await supabase
        .from('products')
        .select('price, stock_quantity, name')
        .eq('id', product.id)
        .single()
      if (error) {
        console.error('Error fetching product data:', error)
        toast.error('تعذر التحقق من بيانات المنتج')
      } else {
        setActualPrice(data.price)
        setStock(data.stock_quantity)
        if (initialQuantity > data.stock_quantity) {
          setQuantity(data.stock_quantity)
          toast.warning(`تم تعديل الكمية إلى الحد الأقصى المتاح (${data.stock_quantity})`)
        }
      }
    }
    fetchProductData()
  }, [product?.id, initialQuantity])

  if (!product) {
    return <div className="text-center py-20 text-text-secondary">لا توجد بيانات منتج. يرجى المحاولة مرة أخرى.</div>
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleQuantityChange = (e) => {
    let newQuantity = parseInt(e.target.value, 10)
    if (isNaN(newQuantity)) newQuantity = 1
    if (stock !== null && newQuantity > stock) {
      toast.error(`الكمية المطلوبة (${newQuantity}) تتجاوز المتوفر في المخزون (${stock})`)
      setQuantity(stock)
    } else if (newQuantity < 1) {
      setQuantity(1)
    } else {
      setQuantity(newQuantity)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.shipping_address.trim() || !formData.shipping_city.trim()) {
      toast.error('يرجى ملء جميع حقول الشحن لتجهيز طلبك')
      return
    }

    if (stock === null || actualPrice === null) {
      toast.error('جاري تحميل بيانات المنتج، يرجى المحاولة مرة أخرى')
      return
    }

    if (quantity > stock) {
      toast.error(`الكمية المطلوبة (${quantity}) تتجاوز المتوفر في المخزون (${stock})`)
      return
    }

    setLoading(true)
    try {
      const totalPrice = actualPrice * quantity
      const items = [{
        product_id: product.id,
        quantity: quantity,
        unit_price: actualPrice
      }]
      const additionalDetails = `اللون: ${formData.color}, المقاس: ${formData.size}`

      const orderData = {
        buyer_id: user?.id,
        total_amount: totalPrice,
        shipping_address: formData.shipping_address,
        shipping_city: formData.shipping_city,
        payment_method: formData.payment_method,
        notes: additionalDetails,
        items: items
      }

      const order = await createOrder(orderData)
      toast.success('تم إنشاء الطلب بنجاح')
      navigate(`/payment/${order.id}`)
    } catch (err) {
      console.error('Order creation error:', err)
      toast.error(err.message || 'حدث خطأ أثناء إنشاء الطلب')
    } finally {
      setLoading(false)
    }
  }

  const displayPrice = product.final_price || product.price
  const totalPriceDisplay = (actualPrice !== null ? actualPrice : displayPrice) * quantity

  const colorOptions = ['أحمر', 'أزرق', 'أخضر', 'أسود', 'أبيض']
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gold mb-6">إنهاء الطلب</h1>
      
      <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 mb-6">
        <h2 className="text-xl font-bold mb-2">{product.title}</h2>
        <div className="flex justify-between text-text-secondary text-sm mb-2">
          <span>سعر الوحدة:</span>
          <span>{displayPrice} ريال</span>
        </div>
        <div className="flex flex-col gap-3 mt-3">
          <label className="block text-sm text-text-secondary">الكمية المطلوبة</label>
          <input
            type="number"
            min="1"
            max={stock !== null ? stock : undefined}
            value={quantity}
            onChange={handleQuantityChange}
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
          />
          {stock !== null && (
            <p className="text-xs text-text-secondary">المتاح في المخزون: {stock} قطعة</p>
          )}
        </div>
        <hr className="border-gold/20 my-4" />
        <div className="flex justify-between font-bold text-lg text-gold">
          <span>إجمالي المبلغ:</span>
          <span>{totalPriceDisplay} ريال</span>
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
          <Button type="submit" className="w-full" disabled={loading || stock === null || actualPrice === null}>
            {loading ? 'جاري معالجة الطلب...' : 'تأكيد وإنشاء الطلب'}
          </Button>
        </div>
      </form>
    </div>
  )
}



