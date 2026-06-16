import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getBuyerOrders, confirmDelivery, requestReturn, updateOrderStatus } from '../services/orderService'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'
import { useAbortController } from '../hooks/useAbortController'
import { SkeletonOrderItem, SkeletonText, Skeleton } from '../components/ui/Skeleton'

export default function OrdersPage() {
  const { user } = useAuth()
  const [allOrders, setAllOrders] = useState([])
  const [activeTab, setActiveTab] = useState('pending_payment')
  const [loading, setLoading] = useState(true)
  const abortController = useAbortController()

  useEffect(() => {
    let isMounted = true
    const loadOrders = async () => {
      try {
        const data = await getBuyerOrders(user.id)
        if (isMounted) setAllOrders(data)
      } catch (err) {
        if (isMounted) console.error(err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    if (user) loadOrders()
    return () => { isMounted = false; abortController?.abort() }
  }, [user, abortController])

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'pending_payment':
        return allOrders.filter(o => (o.status === 'pending_payment_review' || o.status === 'pending') && o.status !== 'processing')
      case 'completed_paid':
        return allOrders.filter(o => ['payment_approved', 'processing', 'shipped', 'delivered', 'completed'].includes(o.status))
      case 'cancelled':
        return allOrders.filter(o => o.status === 'cancelled')
      case 'returned':
        return allOrders.filter(o => o.status === 'return_requested' || o.status === 'return_approved' || o.status === 'return_rejected')
      default:
        return allOrders
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return
    try {
      await updateOrderStatus(orderId, 'cancelled')
      toast.success('تم إلغاء الطلب بنجاح')
      const data = await getBuyerOrders(user.id)
      setAllOrders(data)
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء إلغاء الطلب')
    }
  }

  const filteredOrders = getFilteredOrders()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SkeletonText width="w-48" height="h-8" className="mb-6" />
        <div className="flex gap-2 border-b border-gold/30 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-24 h-10 rounded-t-lg" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <SkeletonOrderItem key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6">طلباتي</h1>
      <div className="flex gap-2 border-b border-gold/30 mb-6 flex-wrap">
        <button onClick={() => setActiveTab('pending_payment')} className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'pending_payment' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}>📌 قيد الدفع</button>
        <button onClick={() => setActiveTab('completed_paid')} className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'completed_paid' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}>✅ تم الدفع / جاري التجهيز</button>
        <button onClick={() => setActiveTab('cancelled')} className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'cancelled' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}>❌ ملغية</button>
        <button onClick={() => setActiveTab('returned')} className={`px-4 py-2 rounded-t-lg transition ${activeTab === 'returned' ? 'bg-gold text-primary-blue font-bold' : 'hover:bg-secondary-blue'}`}>↩️ مسترجعة</button>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-center text-text-secondary">لا توجد طلبات في هذا القسم.</p>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isReturnRequested = order.status === 'return_requested'
            const isReturnApproved = order.status === 'return_approved'
            const isReturnRejected = order.status === 'return_rejected'

            return (
              <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold">{order.product?.title || 'منتج غير متوفر'}</h3>
                    <p className="text-text-secondary">السعر: {order.total_price} ريال</p>
                    <p className="text-text-secondary">الحالة: {order.status}</p>
                    <p className="text-text-secondary">طريقة الدفع: {order.payment_method}</p>
                    {order.return_reason && (
                      <p className="text-text-secondary text-sm mt-1">سبب الاسترجاع: {order.return_reason}</p>
                    )}
                    {isReturnRejected && order.return_admin_notes && (
                      <p className="text-red-500 text-sm mt-1">ملاحظة الرفض: {order.return_admin_notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {/* ✅ تعديل: إخفاء زر "رفع إيصال" إذا كان الإيصال مرفوع بالفعل */}
                    {(order.status === 'pending_payment_review' || order.status === 'pending') && !order.receipt_image && (
                      <Link to={`/payment/${order.id}`}>
                        <Button>رفع إيصال</Button>
                      </Link>
                    )}
                    {/* ✅ تعديل: إظهار حالة "في انتظار المراجعة" إذا كان الإيصال مرفوع */}
                    {order.receipt_image && (order.status === 'pending_payment_review' || order.status === 'pending') && (
                      <span className="text-yellow-500 text-sm font-medium">⏳ الإيصال في انتظار مراجعة الأدمن</span>
                    )}
                    {!['completed', 'cancelled', 'delivered', 'return_requested', 'return_approved', 'return_rejected'].includes(order.status) && (
                      <Button variant="danger" onClick={() => handleCancelOrder(order.id)}>إلغاء الطلب</Button>
                    )}
                    {order.status === 'delivered' && (
                      <Button onClick={async () => { 
                        await confirmDelivery(order.id); 
                        toast.success('تم تأكيد الاستلام'); 
                        const data = await getBuyerOrders(user.id); 
                        setAllOrders(data); 
                      }}>✅ تأكيد الاستلام</Button>
                    )}
                    {order.status === 'completed' && (() => {
                      const completedDate = new Date(order.completed_at)
                      const daysDiff = (new Date() - completedDate) / (1000 * 60 * 60 * 24)
                      if (daysDiff <= 3 && (!order.return_status || order.return_status === 'none')) {
                        return (
                          <Button 
                            variant="secondary"
                            onClick={async () => {
                              const reason = prompt('الرجاء كتابة سبب الاسترجاع:')
                              if (reason) {
                                try {
                                  await requestReturn(order.id, reason)
                                  toast.success('تم إرسال طلب الاسترجاع، سيتم مراجعته قريباً')
                                  const data = await getBuyerOrders(user.id)
                                  setAllOrders(data)
                                } catch (err) {
                                  toast.error(err.message)
                                }
                              }
                            }}
                          >↩️ استرجاع (خلال 3 أيام)</Button>
                        )
                      }
                      return null
                    })()}
                    {isReturnRequested && <span className="text-yellow-500 text-sm">⏳ قيد المراجعة</span>}
                    {isReturnApproved && <span className="text-green-500 text-sm">✅ تم قبول الاسترجاع</span>}
                    {isReturnRejected && <span className="text-red-500 text-sm">❌ تم رفض الاسترجاع</span>}
                  </div>
                </div>
                {order.receipt_image && (
                  <div className="mt-3 pt-2 border-t border-gold/20">
                    <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold text-sm underline">عرض الإيصال</a>
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


