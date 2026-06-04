import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { getUserNotifications, playNotificationSound } from '../../services/notificationService'

export const NotificationBell = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadCount = async () => {
    if (!user) return
    try {
      const data = await getUserNotifications(user.id)
      const unread = data.filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (err) {
      console.error('خطأ في جلب عدد الإشعارات:', err)
    }
  }

  useEffect(() => {
    if (!user) return
    loadUnreadCount()

    const channel = supabase
      .channel(`notifications-count-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new && !payload.new.is_read) {
          setUnreadCount(prev => prev + 1)
          playNotificationSound()
          if (Notification.permission === 'granted' && !document.hasFocus()) {
            new Notification(payload.new.title, { body: payload.new.message, icon: '/logo192.png' })
          }
        } else {
          loadUnreadCount()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleBellClick = () => {
    navigate('/notifications')
  }

  return (
    <button
      onClick={handleBellClick}
      className="relative p-2 rounded-full hover:bg-primary-card transition"
      aria-label="الإشعارات"
    >
      <Bell size={22} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

