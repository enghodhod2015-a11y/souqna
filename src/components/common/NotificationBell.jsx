import { useEffect, useState } from 'react'
import { Bell, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { playNotificationSound } from '../../services/notificationService'

export const NotificationBell = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.length

  // CHANGED: جلب الإشعارات غير المقروءة فقط
  const loadNotifications = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('خطأ في جلب الإشعارات:', err)
    }
  }

  // CHANGED: تعليم الإشعار كمقروء وإعادة جلب القائمة
  const markAsRead = async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
      // إعادة الجلب بعد التحديث لضمان تحديث العدد
      await loadNotifications()
    } catch (err) {
      console.error('خطأ في تحديث الإشعار:', err)
    }
  }

  // CHANGED: الاشتراك في Realtime وإعادة جلب الإشعارات عند أي إضافة جديدة
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
        // CHANGED: إعادة جلب الإشعارات من قاعدة البيانات بدلاً من إضافتها يدوياً
        // هذا يضمن أن العدد والقائمة متطابقان مع ما هو موجود في الجدول
        await loadNotifications()
        // تشغيل الصوت وإشعار المتصفح فقط (إذا كان المستخدم خارج التطبيق أو مسموح)
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

  // CHANGED: إغلاق القائمة عند النقر خارجها
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
          <div className="p-3 border-b border-gold/30">
            <h3 className="font-bold text-gold">الإشعارات</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-text-secondary">لا توجد إشعارات جديدة</p>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className="p-3 border-b border-gold/20 hover:bg-secondary-blue transition cursor-pointer"
                  onClick={() => markAsRead(notif.id)}
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

