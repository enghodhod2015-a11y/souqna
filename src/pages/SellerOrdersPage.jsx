import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSellerOrders, updateOrderStatus } from '../services/orderService'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function SellerOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) loadOrders()
  }, [user?.id])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await getSellerOrders(user.id)
      setOrders(data || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      toast.success('تم تحديث حالة الطلب')
      loadOrders()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6">طلبات المستلمين</h1>
      {orders.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد طلبات بعد.</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            // فحص أمني لمنع الانهيار تماماً في حال وجود طلب تالف
            if (!order?.id) return null

            return (
              <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gold">{order.product?.title || 'منتج غير متوفر'}</h3>
                    {/* ✅ إظهار بيانات المشتري الحقيقية للبائع بأمان كامل */}
                    <p className="text-text-secondary mt-1"><strong>المشتري:</strong> {order.buyer?.full_name || 'حساب غير متوفر'}</p>
                    <p className="text-text-secondary"><strong>العنوان:</strong> {order.shipping_address || 'لم يتم تحديد عنوان الشحن'}</p>
                    <p className="text-text-secondary"><strong>المبلغ:</strong> {order.total_price} ريال</p>
                    <p className="text-text-secondary"><strong>الحالة:</strong> {order.order_status}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <select
                      value={order.order_status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="bg-primary-card border border-gold/30 rounded px-3 py-1 text-white focus:outline-none focus:border-gold"
                    >
                      <option value="pending_payment_review">انتظار الدفع</option>
                      <option value="payment_approved">تم تأكيد الدفع</option>
                      <option value="processing">قيد التجهيز</option>
                      <option value="shipped">تم الشحن</option>
                      <option value="delivered">تم التسليم</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>
                </div>
                {order.receipt_image && (
                  <div className="mt-4 pt-2 border-t border-gold/10">
                    <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline text-sm hover:text-gold-light">
                      عرض إيصال تحويل الدفع
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
