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
    if (user) loadOrders()
  }, [user])

  const loadOrders = async () => {
    try {
      const data = await getSellerOrders(user.id)
      setOrders(data)
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
          {orders.map(order => (
            <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{order.product?.title}</h3>
                  <p className="text-text-secondary">المشتري: {order.buyer?.full_name}</p>
                  <p className="text-text-secondary">العنوان: {order.shipping_address}</p>
                  <p className="text-text-secondary">المبلغ: {order.total_price} ريال</p>
                  <p className="text-text-secondary">الحالة: {order.order_status}</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={order.order_status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="bg-primary-card border border-gold/30 rounded px-3 py-1"
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
                <div className="mt-2">
                  <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline">عرض الإيصال</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}