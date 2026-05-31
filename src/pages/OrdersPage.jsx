import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getBuyerOrders, confirmDelivery } from '../services/orderService'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function OrdersPage() {
  const { user } = useAuth()
  const [allOrders, setAllOrders] = useState([])
  const [activeTab, setActiveTab] = useState('pending_payment')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadOrders()
  }, [user])

  const loadOrders = async () => {
    try {
      const data = await getBuyerOrders(user.id)
      setAllOrders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'pending_payment':
        return allOrders.filter(o => 
          (o.status === 'pending_payment_review' || o.status === 'pending') && 
          o.status !== 'processing'
        )
      case 'completed_paid':
        return allOrders.filter(o => ['payment_approved', 'processing', 'shipped', 'delivered', 'completed'].includes(o.status))
      case 'cancelled':
        return allOrders.filter(o => o.status === 'cancelled')
      default:
        return allOrders
    }
  }

  const filteredOrders = getFilteredOrders()

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6">طلباتي</h1>

      <div className="flex gap-2 border-b border-gold/30 mb-6">
        <button
          onClick={() => setActiveTab('pending_payment')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'pending_payment' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          📌 قيد الدفع
        </button>
        <button
          onClick={() => setActiveTab('completed_paid')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'completed_paid' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          ✅ تم الدفع / جاري التجهيز
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'cancelled' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}
        >
          ❌ ملغية
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد طلبات في هذا القسم.</p>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-bold">{order.product?.title || 'منتج غير متوفر'}</h3>
                  <p className="text-text-secondary">السعر: {order.total_price} ريال</p>
                  <p className="text-text-secondary">الحالة: {order.status}</p>
                  <p className="text-text-secondary">طريقة الدفع: {order.payment_method}</p>
                </div>
                <div className="flex gap-2">
                  {order.status === 'pending_payment_review' && (
                    <Link to={`/payment/${order.id}`}>
                      <Button>رفع إيصال</Button>
                    </Link>
                  )}
                  {order.status === 'delivered' && (
                    <Button 
                      onClick={async () => {
                        try {
                          await confirmDelivery(order.id)
                          toast.success('تم تأكيد الاستلام، شكراً لك')
                          loadOrders()
                        } catch (err) {
                          toast.error(err.message)
                        }
                      }}
                    >
                      ✅ تأكيد الاستلام
                    </Button>
                  )}
                </div>
              </div>
              {order.receipt_image && (
                <div className="mt-3 pt-2 border-t border-gold/20">
                  <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold text-sm underline">
                    عرض الإيصال
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}