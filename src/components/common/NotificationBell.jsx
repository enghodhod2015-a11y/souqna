import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { getUserNotifications, markNotificationAsRead, playNotificationSound } from '../../services/notificationService'

export const NotificationBell = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.length

  const loadNotifications = async () => {
    if (!user) return
    try {
      const data = await getUserNotifications(user.id)
      const unread = data.filter(n => !n.is_read)
      setNotifications(unread)
    } catch (err) {
      console.error('خطأ في جلب الإشعارات:', err)
    }
  }

  // CHANGED: دالة تحديد المسار بناءً على نوع الإشعار و related_id
  const getNotificationPath = (notif) => {
    const relatedId = notif.related_id
    const type = notif.type

    // حل مؤقت: إذا كان relatedId موجود نذهب إلى صفحة المنتج (لتجربة التوجيه)
    if (relatedId) {
      return `/product/${relatedId}`
    }
    // إذا لم يكن هناك relatedId نذهب إلى صفحة الإشعارات العامة
    return '/inbox'
  }

  // CHANGED: تعديل دالة markAsRead لتشمل التوجيه
  const markAsReadAndNavigate = async (notif) => {
    try {
      // تعليم الإشعار كمقروء في الخلفية
      markNotificationAsRead(notif.id).catch(err => console.error(err))
      // إزالة الإشعار من القائمة محلياً
      setNotifications(prev => prev.filter(n => n.id !== notif.id))
      // إغلاق القائمة المنسدلة
      setIsOpen(false)
      // التوجيه إلى المسار المناسب
      const path = getNotificationPath(notif)
      navigate(path)
    } catch (err) {
      console.error('خطأ في معالجة الإشعار:', err)
    }
  }

  const markAllAsRead = async () => {
    if (notifications.length === 0) return
    try {
      const ids = notifications.map(n => n.id)
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids)
      setNotifications([])
    } catch (err) {
      console.error('خطأ في تعليم الكل كمقروء:', err)
    }
  }

  useEffect(() => {
    if (!user) return
    loadNotifications()

    const channel = supabase
      .channel(`notifications-bell-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        if (payload.new && !payload.new.is_read) {
          setNotifications(prev => {
            if (prev.some(n => n.id === payload.new.id)) return prev
            return [payload.new, ...prev]
          })
          playNotificationSound()
          if (Notification.permission === 'granted' && !document.hasFocus()) {
            new Notification(payload.new.title, { body: payload.new.message, icon: '/logo192.png' })
          }
        } else {
          await loadNotifications()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dropdown = document.getElementById('notification-dropdown')
      const bellButton = document.getElementById('notification-bell-button')
      if (dropdown && bellButton && !dropdown.contains(e.target) && !bellButton.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <button
        id="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-primary-card transition"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-dropdown"
          className="absolute left-0 mt-2 w-80 bg-primary-card rounded-lg shadow-xl z-50 border border-gold/30"
        >
          <div className="p-3 border-b border-gold/30 flex justify-between items-center">
            <h3 className="font-bold text-gold">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-gold hover:underline"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-text-secondary">لا توجد إشعارات جديدة</p>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className="p-3 border-b border-gold/20 hover:bg-secondary-blue transition cursor-pointer"
                  onClick={() => markAsReadAndNavigate(notif)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gold">{notif.title}</p>
                      <p className="text-sm text-text-secondary">{notif.message}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {new Date(notif.created_at).toLocaleString('ar')}
                      </p>
                    </div>
                    <CheckCircle size={16} className="text-gold shrink-0 mr-2 mt-1" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}


