import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { uploadReceipt } from '../services/orderService'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function PaymentPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, product:products(title)')
      .eq('id', orderId)
      .single()
    if (error) {
      toast.error(error.message)
      window.location.href = '/'
    } else {
      setOrder(data)
    }
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      toast.error('يرجى رفع صورة الإيصال')
      return
    }
    setLoading(true)
    try {
      await uploadReceipt(orderId, file)
      toast.success('تم رفع الإيصال بنجاح، سيتم مراجعته قريباً')
      window.location.href = '/orders'
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!order) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gold mb-6">رفع إيصال الدفع</h1>
      <div className="bg-primary-card p-6 rounded-2xl border border-gold/30 mb-6">
        <p><strong>المنتج:</strong> {order.product?.title}</p>
        <p><strong>المبلغ:</strong> {order.total_price} ريال</p>
        <p><strong>رقم الحساب البنكي:</strong> SA12 3456 7890 1234 5678 (للتحويل البنكي)</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-primary-card p-6 rounded-2xl border border-gold/30">
        <div className="mb-4">
          <label className="block mb-1 text-text-secondary">صورة الإيصال</label>
          <input type="file" accept="image/*" onChange={handleFileChange} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'جاري الرفع...' : 'رفع الإيصال'}</Button>
      </form>
    </div>
  )
}