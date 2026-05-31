import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSellerOrders, updateOrderStatus } from '../services/orderService'
import toast from 'react-hot-toast'

export default function SellerOrdersPage() {
  const { user } = useAuth()
  const [allOrders, setAllOrders] = useState([])
  const [activeTab, setActiveTab] = useState('pending_payment')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) loadOrders()
  }, [user?.id])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await getSellerOrders(user.id)
      setAllOrders(data || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'pending_payment':
        return allOrders.filter(o => o.status === 'pending_payment_review' || o.status === 'pending')
      case 'payment_approved':
        return allOrders.filter(o => ['payment_approved', 'processing', 'shipped', 'delivered'].includes(o.status))
      case 'completed':
        return allOrders.filter(o => o.status === 'completed')
      case 'cancelled':
        return allOrders.filter(o => o.status === 'cancelled')
      default:
        return allOrders
    }
  }

  const filteredOrders = getFilteredOrders()

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
      <h1 className="text-2xl font-bold text-gold mb-6">طلبات البائع (الواردة)</h1>

      <div className="flex flex-wrap gap-2 border-b border-gold/30 mb-6">
        <button
          onClick={() => setActiveTab('pending_payment')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'pending_payment' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          ⏳ انتظار الدفع
        </button>
        <button
          onClick={() => setActiveTab('payment_approved')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'payment_approved' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          💳 تم الدفع / قيد التجهيز
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'completed' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          ✔️ مكتملة
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'cancelled' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          🚫 ملغية
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد طلبات في هذا القسم.</p>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            if (!order?.id) return null
            return (
              <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gold">{order.product?.name || order.product?.title || 'منتج غير متوفر'}</h3>
                    <p className="text-text-secondary mt-1"><strong>المشتري:</strong> {order.buyer?.full_name || 'حساب غير متوفر'}</p>
                    <p className="text-text-secondary"><strong>رقم الهاتف:</strong> {order.buyer?.phone || 'غير متوفر'}</p>
                    <p className="text-text-secondary"><strong>العنوان:</strong> {order.shipping_address || 'لم يحدد'}</p>
                    <p className="text-text-secondary"><strong>المبلغ:</strong> {order.total_price} ريال</p>
                    <p className="text-text-secondary"><strong>الحالة الحالية:</strong> {order.status}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <select
                      value={order.status}
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
                    <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline text-sm">
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


