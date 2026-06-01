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

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        playNotificationSound()
        if (Notification.permission === 'granted') {
          new Notification(payload.new.title, { body: payload.new.message, icon: '/logo192.png' })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const loadNotifications = async () => {
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
    } catch (err) {
      console.error('خطأ في جلب الإشعارات:', err)
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('خطأ في تعليم الإشعار كمقروء:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read)
    for (const n of unread) {
      await handleMarkAsRead(n.id)
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-primary-card transition">
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-primary-card rounded-lg shadow-xl z-50 border border-gold/30">
          <div className="p-3 border-b border-gold/30 flex justify-between">
            <h3 className="font-bold">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-gold text-sm hover:underline">
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-text-secondary">لا توجد إشعارات</p>
            ) : (
              notifications.slice(0, 10).map(notif => (
                <div key={notif.id} className={`p-3 border-b border-gold/20 hover:bg-secondary-blue transition ${!notif.is_read ? 'bg-secondary-blue/30' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-sm">{notif.title}</p>
                      <p className="text-sm text-text-secondary">{notif.message}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {new Date(notif.created_at).toLocaleString('ar')}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <button onClick={() => handleMarkAsRead(notif.id)} className="mr-2">
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


