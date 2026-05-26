import { useEffect, useState } from 'react'
import { Bell, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getUserNotifications, markNotificationAsRead, playNotificationSound } from '../../services/notificationService'
import { supabase } from '../../services/supabase'

export const NotificationBell = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    if (!user) return
    loadNotifications()

    // الاستماع للإشعارات الجديدة عبر Realtime
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        playNotificationSound() // تشغيل الصوت
        // عرض إشعار المتصفح
        if (Notification.permission === 'granted') {
          new Notification(payload.new.title, { body: payload.new.message, icon: '/logo192.png' })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const loadNotifications = async () => {
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAsRead = async (id) => {
    await markNotificationAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleMarkAllAsRead = async () => {
    for (const n of notifications.filter(n => !n.is_read)) {
      await markNotificationAsRead(n.id)
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-primary-card transition">
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-primary-card rounded-lg shadow-xl z-50 border border-gold/30">
          <div className="p-3 border-b border-gold/30 flex justify-between">
            <h3 className="font-bold">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-gold text-sm">تعليم الكل كمقروء</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-text-secondary">لا توجد إشعارات</p>
            ) : (
              notifications.slice(0, 10).map(notif => (
                <div key={notif.id} className={`p-3 border-b border-gold/20 hover:bg-secondary-blue transition ${!notif.is_read ? 'bg-secondary-blue/30' : ''}`}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">{notif.title}</p>
                      <p className="text-sm text-text-secondary">{notif.message}</p>
                      <p className="text-xs text-text-secondary">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                    {!notif.is_read && (
                      <button onClick={() => handleMarkAsRead(notif.id)}>
                        <CheckCircle size={16} className="text-gold" />
                      </button>
                    )}
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