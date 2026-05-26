import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getBuyerOrders } from '../services/orderService'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadOrders()
  }, [user])

  const loadOrders = async () => {
    try {
      const data = await getBuyerOrders(user.id)
      setOrders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6">طلباتي</h1>
      {orders.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد طلبات بعد.</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{order.product?.title}</h3>
                  <p className="text-text-secondary">السعر: {order.total_price} ريال</p>
                  <p className="text-text-secondary">الحالة: {order.order_status}</p>
                  <p className="text-text-secondary">طريقة الدفع: {order.payment_method}</p>
                </div>
                {order.order_status === 'pending_payment_review' && (
                  <Link to={`/payment/${order.id}`}>
                    <Button>رفع إيصال</Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}