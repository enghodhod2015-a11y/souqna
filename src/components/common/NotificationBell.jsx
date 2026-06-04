import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageCircle, Package, DollarSign, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { getUserNotifications, markNotificationAsRead } from '../../services/notificationService'

export const NotificationBell = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const loadNotifications = async () => {
    if (!user) return
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data.slice(0, 5)) // آخر 5 إشعارات فقط
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch (err) {
      console.error('خطأ في جلب الإشعارات:', err)
    }
  }

  useEffect(() => {
    if (!user) return
    loadNotifications()

    const channel = supabase
      .channel(`notifications-dropdown-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // الانتقال إلى صفحة المحادثة إذا كان للإشعار related_id
    if (notif.related_id) {
      navigate(`/chat/c/${notif.related_id}`)
    } else {
      navigate('/inbox')
    }
    setDropdownOpen(false)
  }

  const getIcon = (type) => {
    switch (type) {
      case 'message': return <MessageCircle size={16} className="text-blue-500" />
      case 'order_status': return <Package size={16} className="text-green-500" />
      case 'payment': return <DollarSign size={16} className="text-yellow-500" />
      default: return <Info size={16} className="text-gold" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative p-2 rounded-full hover:bg-primary-card transition"
        aria-label="الإشعارات"
      >
        <Bell size={22} className="text-gold" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-primary-card rounded-xl shadow-2xl border border-gold/30 z-50 overflow-hidden">
          <div className="p-3 border-b border-gold/30 flex justify-between items-center">
            <h3 className="font-bold text-gold">الإشعارات</h3>
            <button
              onClick={() => { navigate('/notifications'); setDropdownOpen(false); }}
              className="text-xs text-gold underline"
            >
              عرض الكل
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-text-secondary">لا توجد إشعارات</div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNotificationClick(notif)
                  }}
                  className={`p-3 border-b border-gold/20 cursor-pointer hover:bg-secondary-blue/30 transition ${!notif.is_read ? 'bg-secondary-blue/10' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1">{getIcon(notif.type)}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${!notif.is_read ? 'text-gold' : 'text-white'}`}>{notif.title}</p>
                      <p className="text-xs text-text-secondary line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {new Date(notif.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!notif.is_read && <div className="w-2 h-2 bg-gold rounded-full mt-2"></div>}
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

