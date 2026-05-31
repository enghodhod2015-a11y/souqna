import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { uploadReceipt } from '../services/orderService'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function PaymentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [productTitle, setProductTitle] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchingOrder, setFetchingOrder] = useState(true)
  
  const [transferNumber, setTransferNumber] = useState('')
  const [transferName, setTransferName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')

  useEffect(() => {
    if (orderId) loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      setFetchingOrder(true)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError
      if (!orderData) throw new Error('الطلب غير موجود')

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_name')
        .eq('order_id', orderId)
        .maybeSingle()

      if (itemsError) throw itemsError

      setOrder(orderData)
      setProductTitle(items?.product_name || 'منتج غير متوفر')
    } catch (error) {
      console.error('Error loading order:', error)
      toast.error(error.message || 'لم يتم العثور على الطلب')
      navigate('/')
    } finally {
      setFetchingOrder(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file) {
      toast.error('يرجى رفع صورة الإيصال أولاً')
      return
    }
    if (!transferNumber.trim()) {
      toast.error('يرجى إدخال رقم الحوالة')
      return
    }
    if (!transferName.trim()) {
      toast.error('يرجى إدخال الاسم الرباعي للمحول')
      return
    }
    if (!buyerPhone.trim()) {
      toast.error('يرجى إدخال رقم هاتف المشتري')
      return
    }
    // ✅ التحقق من صحة الرقم اليمني (يبدأ بـ 7 ويليها 8 أرقام)
    if (!/^7[0-9]{8}$/.test(buyerPhone.trim())) {
      toast.error('رقم الهاتف يجب أن يكون يمنياً (يبدأ بـ 7 ويليها 8 أرقام، مثال: 771234567)')
      return
    }

    setLoading(true)
    try {
      await uploadReceipt(orderId, file, {
        transfer_number: transferNumber.trim(),
        transfer_name: transferName.trim(),
        buyer_phone: buyerPhone.trim()
      })
      toast.success('تم رفع الإيصال بنجاح، سيتم مراجعته قريباً')
      navigate('/orders')
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء رفع الإيصال')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingOrder) return <div className="text-center py-20 text-text-secondary">جاري تحميل بيانات الدفع...</div>
  if (!order) return <div className="text-center py-20 text-text-secondary">الطلب غير موجود.</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gold mb-6">رفع إيصال الدفع</h1>
      
      <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 mb-6 space-y-2">
        <p><strong className="text-gold">المنتج:</strong> {productTitle}</p>
        <p><strong className="text-gold">المبلغ المطلوب:</strong> {order.total_amount} ريال</p>
        <hr className="border-gold/20 my-3" />
        <p className="text-sm bg-gold/5 p-3 rounded-lg border border-gold/10 text-text-secondary leading-relaxed">
          <strong className="text-gold block mb-1">تعليمات التحويل البنكي:</strong>
          قم بتحويل المبلغ إلى الحساب التالي وأرفق صورة واضحة من إيصال التحويل:
          <span className="block font-mono text-white mt-1 select-all bg-primary-card p-2 rounded border border-gold/20 text-center">
            SA12 3456 7890 1234 5678
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-primary-card p-6 rounded-2xl border border-gold/30 space-y-4">
        <div>
          <label className="block mb-2 text-sm text-text-secondary">رقم الحوالة</label>
          <input 
            type="text" 
            value={transferNumber}
            onChange={(e) => setTransferNumber(e.target.value)}
            placeholder="مثال: 1234567890"
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
            required 
          />
        </div>

        <div>
          <label className="block mb-2 text-sm text-text-secondary">الاسم الرباعي للمحول</label>
          <input 
            type="text" 
            value={transferName}
            onChange={(e) => setTransferName(e.target.value)}
            placeholder="مثال: أحمد بن محمد العلي"
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
            required 
          />
        </div>

        <div>
          <label className="block mb-2 text-sm text-text-secondary">رقم هاتف المشتري (يمني - واتساب للتواصل)</label>
          <input 
            type="tel" 
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="771234567"
            className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 border border-gold/30 focus:outline-none focus:border-gold"
            required 
          />
        </div>

        <div>
          <label className="block mb-2 text-sm text-text-secondary">صورة إيصال التحويل</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold file:text-primary-blue hover:file:bg-gold-light cursor-pointer"
            required 
          />
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'جاري رفع الملف...' : 'تأكيد ورفع الإيصال'}
          </Button>
        </div>
      </form>
    </div>
  )
}


