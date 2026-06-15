import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { uploadReceipt } from '../services/orderService'
import { addNotification } from '../services/notificationService'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const PaymentInstructionsBlock = () => (
  <div className="mt-2 bg-primary-card/50 p-3 rounded-lg border border-gold/20 space-y-2">
    <div>
      <p className="text-gold text-sm font-semibold mb-1">🏦 عبر بنك الكريمي</p>
      <p className="text-white text-sm font-mono select-all">رقم الحساب: 3005499158</p>
      <p className="text-white text-sm font-mono select-all">أو الرقم المميز: 1802716</p>
    </div>
    <hr className="border-gold/20" />
    <div>
      <p className="text-gold text-sm font-semibold mb-1">📱 عبر شبكة الموحدة</p>
      <p className="text-white text-sm font-mono select-all">حساب الفنيع: 231011</p>
    </div>
  </div>
)

export default function PaymentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [order, setOrder] = useState(null)
  const [productTitle, setProductTitle] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchingOrder, setFetchingOrder] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(0)
  
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

      if (orderData.user_id !== user?.id) {
        toast.error('هذا الطلب لا يخصك، لا يمكنك الدفع له')
        navigate('/')
        return
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_name')
        .eq('order_id', orderId)
      
      if (itemsError) throw itemsError
      
      if (items && items.length > 0) {
        const names = items.map(item => item.product_name).join(', ')
        setProductTitle(names)
      } else {
        setProductTitle('منتج غير متوفر')
      }

      setOrder(orderData)
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
    if (!/^7[0-9]{8}$/.test(buyerPhone.trim())) {
      toast.error('رقم الهاتف يجب أن يكون يمنياً (يبدأ بـ 7 ويليها 8 أرقام، مثال: 771234567)')
      return
    }

    setLoading(true)
    setUploadProgress(0)
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10))
      }, 200)
      
      await uploadReceipt(orderId, file, {
        transfer_number: transferNumber.trim(),
        transfer_name: transferName.trim(),
        buyer_phone: buyerPhone.trim()
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // استعلام لجلب seller_id لإشعار البائع (اختياري)
      const { data: orderItems, error: itemsFetchError } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', orderId)
        .limit(1)
      
      if (!itemsFetchError && orderItems && orderItems.length > 0) {
        const { data: product } = await supabase
          .from('products')
          .select('seller_id')
          .eq('id', orderItems[0].product_id)
          .single()
        
        if (product?.seller_id) {
          await addNotification(
            product.seller_id,
            'payment',
            'إيصال دفع جديد',
            `تم رفع إيصال دفع للطلب #${orderId}، يرجى مراجعته`,
            orderId
          )
        }
      }
      
      // ✅ تغيير رسالة النجاح
      toast.success('تم رفع الإيصال بنجاح، سيتم مراجعته من قبل الإدارة قريباً')
      navigate('/orders')
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء رفع الإيصال')
    } finally {
      setLoading(false)
      setUploadProgress(0)
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
          قم بتحويل المبلغ إلى أحد الحسابات التالية وأرفق صورة واضحة من إيصال التحويل:
          <PaymentInstructionsBlock />
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
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2.5">
                <div className="bg-gold h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-xs text-text-secondary mt-1 text-center">جاري رفع الإيصال: {uploadProgress}%</p>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (uploadProgress > 0 && uploadProgress < 100 ? `رفع الإيصال ${uploadProgress}%...` : 'جاري رفع الملف...') : 'تأكيد ورفع الإيصال'}
          </Button>
        </div>
      </form>
    </div>
  )
}

