import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'
import { getUserNotifications, markNotificationAsRead } from '../services/notificationService'
import { Button } from '../components/ui/Button'
import { CheckCircle, MessageCircle, Package, DollarSign, Info } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    if (!user) return
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
    } catch (err) {
      console.error('خطأ في جلب الإشعارات:', err)
      toast.error('فشل تحميل الإشعارات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    // الاستماع للإشعارات الجديدة عبر Realtime
    const channel = supabase
      .channel(`notifications-page-${user?.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        if (payload.new) {
          setNotifications(prev => [payload.new, ...prev])
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleNotificationClick = async (notif) => {
    // تعليم كمقروء
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }

    // التوجيه بناءً على النوع و related_id
    if (notif.type === 'message' || notif.type === 'info' && notif.related_id) {
      // رسالة – ننتقل إلى صفحة المحادثة إذا كان related_id هو معرف المحادثة
      navigate(`/chat/c/${notif.related_id}`)
    } else if (notif.related_id) {
      // طلب أو منتج – ننتقل إلى صفحة الطلب أو المنتج
      if (notif.type === 'order_status' || notif.type === 'payment' || notif.type === 'return') {
        navigate(`/orders`)  // أو `/order/${notif.related_id}`
      } else {
        navigate(`/product/${notif.related_id}`)
      }
    } else {
      // إشعار إداري بدون related_id – نعرضه في نافذة منبثقة أو نبقى في الصفحة
      toast.custom((t) => (
        <div className="bg-primary-card rounded-2xl border border-gold/30 p-4 shadow-xl max-w-sm mx-4">
          <h3 className="font-bold text-gold text-lg mb-2">{notif.title}</h3>
          <p className="text-text-secondary text-sm">{notif.message}</p>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="mt-3 text-xs text-gold underline"
          >
            إغلاق
          </button>
        </div>
      ), { duration: 5000 })
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('تم تعليم جميع الإشعارات كمقروءة')
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'message': return <MessageCircle size={18} className="text-blue-500" />
      case 'order_status': return <Package size={18} className="text-green-500" />
      case 'payment': return <DollarSign size={18} className="text-yellow-500" />
      default: return <Info size={18} className="text-gold" />
    }
  }

  if (loading) return <div className="text-center py-20">جاري تحميل الإشعارات...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">الإشعارات</h1>
        <Button variant="secondary" onClick={markAllAsRead} size="sm">
          تعليم الكل كمقروء
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-primary-card rounded-2xl p-8 text-center border border-gold/30">
          <p className="text-text-secondary">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`bg-primary-card rounded-2xl border p-4 transition-all cursor-pointer hover:border-gold/60
                ${!notif.is_read ? 'border-gold bg-secondary-blue/20' : 'border-gold/30 opacity-80'}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getIcon(notif.type)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-bold ${!notif.is_read ? 'text-gold' : 'text-white'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-xs text-text-secondary">
                      {new Date(notif.created_at).toLocaleString('ar')}
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm mt-1">{notif.message}</p>
                  {!notif.is_read && (
                    <div className="mt-2 flex justify-end">
                      <span className="text-xs text-gold">جديد</span>
                    </div>
                  )}
                </div>
                {!notif.is_read && <CheckCircle size={16} className="text-gold shrink-0 mt-1" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

