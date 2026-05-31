import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSellerOrders, updateOrderStatus, approveReturn } from '../services/orderService'
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
      case 'returns':
        return allOrders.filter(o => o.return_status && o.return_status !== 'none')
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
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'returns' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          ↩️ الاسترجاعات
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد طلبات في هذا القسم.</p>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            if (!order?.id) return null
            const isCompleted = order.status === 'completed'

            return (
              <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gold">{order.product?.name || order.product?.title || 'منتج غير متوفر'}</h3>
                    <p className="text-text-secondary mt-1"><strong>المشتري:</strong> {order.buyer?.full_name || 'حساب غير متوفر'}</p>
                    <p className="text-text-secondary"><strong>رقم الهاتف:</strong> {order.buyer?.phone || 'غير متوفر'}</p>
                    <p className="text-text-secondary"><strong>العنوان:</strong> {order.shipping_address || 'لم يحدد'}</p>
                    <p className="text-text-secondary"><strong>المبلغ:</strong> {order.total_amount || order.total_price} ريال</p>
                    <p className="text-text-secondary"><strong>الحالة الحالية:</strong> {order.status}</p>
                    {order.return_status && order.return_status !== 'none' && (
                      <p className="text-text-secondary mt-2"><strong>حالة الاسترجاع:</strong> {
                        order.return_status === 'requested' ? 'طلب استرجاع قيد المراجعة' :
                        order.return_status === 'approved' ? 'تم قبول الاسترجاع' :
                        order.return_status === 'rejected' ? 'تم رفض الاسترجاع' : order.return_status
                      }</p>
                    )}
                    {order.return_reason && (
                      <p className="text-text-secondary text-sm"><strong>سبب الاسترجاع:</strong> {order.return_reason}</p>
                    )}
                  </div>
                  <div className="flex gap-2 items-start flex-col">
                    {!isCompleted ? (
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white text-gray-800 border border-gold/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-all duration-200 cursor-pointer hover:bg-gray-100"
                      >
                        <option value="pending_payment_review">⏳ انتظار الدفع</option>
                        <option value="payment_approved">💰 تم تأكيد الدفع</option>
                        <option value="processing">⚙️ قيد التجهيز</option>
                        <option value="shipped">🚚 تم الشحن</option>
                        <option value="delivered">📦 تم التسليم</option>
                        <option value="completed">✅ مكتمل</option>
                        <option value="cancelled">❌ ملغي</option>
                      </select>
                    ) : (
                      <span className="px-4 py-2 rounded-lg bg-green-800 text-white font-bold">
                        ✅ مكتمل (غير قابل للتعديل)
                      </span>
                    )}
                    {order.return_status === 'requested' && (
                      <div className="flex gap-2 mt-2">
                        <Button 
                          onClick={async () => {
                            await approveReturn(order.id, true)
                            toast.success('تم قبول الاسترجاع')
                            loadOrders()
                          }}
                        >
                          ✅ قبول الاسترجاع
                        </Button>
                        <Button 
                          variant="danger"
                          onClick={async () => {
                            const notes = prompt('سبب الرفض (اختياري):')
                            await approveReturn(order.id, false, notes)
                            toast.success('تم رفض الاسترجاع')
                            loadOrders()
                          }}
                        >
                          ❌ رفض الاسترجاع
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {order.receipt_image && (
                  <div className="mt-4 pt-2 border-t border-gold/10">
                    <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline text-sm hover:text-gold/80 transition">
                      🧾 عرض إيصال تحويل الدفع
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


