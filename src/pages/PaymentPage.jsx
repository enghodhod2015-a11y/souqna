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

  useEffect(() => {
    if (orderId) loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      setFetchingOrder(true)
      // 1. جلب بيانات الطلب الأساسية
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      if (orderError) throw orderError
      setOrder(orderData)

      // 2. جلب اسم المنتج من جدول order_items (لتجنب علاقة orders مع products)
      if (orderData.id) {
        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .select('product_name')
          .eq('order_id', orderData.id)
          .maybeSingle()
        if (!itemError && itemData) {
          setProductTitle(itemData.product_name)
        } else {
          // محاولة بديلة: جلب المنتج عبر جدول products إذا فشل order_items
          const { data: prodData, error: prodError } = await supabase
            .from('products')
            .select('title, name')
            .eq('id', orderData.product_id) // تأكد من وجود product_id في orders
            .maybeSingle()
          if (!prodError && prodData) {
            setProductTitle(prodData.title || prodData.name)
          }
        }
      }
    } catch (error) {
      console.error("Error loading order:", error)
      toast.error('لم يتم العثور على الطلب')
      navigate('/')
    } finally {
      setFetchingOrder(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      toast.error('يرجى رفع صورة الإيصال أولاً')
      return
    }
    setLoading(true)
    try {
      await uploadReceipt(orderId, file)
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

  // تحديد المبلغ: إما total_amount أو total_price
  const amount = order.total_amount || order.total_price || 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gold mb-6">رفع إيصال الدفع</h1>
      
      <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 mb-6 space-y-2">
        <p><strong className="text-gold">المنتج:</strong> {productTitle || 'منتج غير متوفر'}</p>
        <p><strong className="text-gold">المبلغ المطلوب:</strong> {amount} ريال</p>
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


