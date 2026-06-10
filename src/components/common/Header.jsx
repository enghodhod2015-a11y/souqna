import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  User, 
  LogOut, 
  ChevronDown,
  MessageCircle,
  Search
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { NotificationBell } from './NotificationBell'
import { requestNotificationPermission, enableAudio } from '../../services/notificationService'
import toast from 'react-hot-toast'

export const Header = () => {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const isSeller = profile?.account_type === 'seller' || profile?.account_type === 'admin'
  const isAdmin = profile?.account_type === 'admin'

  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('buyer_unread_count, seller_unread_count, buyer_id, seller_id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      if (error) {
        console.error(error)
        return
      }
      let total = 0
      data?.forEach(conv => {
        if (!conv) return
        if (conv.buyer_id === user.id) total += conv.buyer_unread_count || 0
        if (conv.seller_id === user.id) total += conv.seller_unread_count || 0
      })
      setUnreadCount(total)
    }

    fetchUnreadCount()

    const channel = supabase
      .channel(`conversations-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // دالة تفعيل الإشعارات
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      await enableAudio()
      toast.success('✅ تم تفعيل الإشعارات والصوت')
    } else {
      toast.error('❌ لم يتم التفعيل، يمكنك المحاولة لاحقاً من إعدادات المتصفح')
    }
  }

  return (
    <header className="bg-header-blue border-b-2 border-gold py-4 px-6 md:px-12">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-gold">سوقنا</Link>

        <div className="flex items-center gap-3">
          <Link 
            to="/search" 
            className="flex items-center gap-2 bg-gold/10 border border-gold text-gold px-4 py-2 rounded-lg font-bold hover:bg-gold hover:text-primary-blue transition text-sm"
          >
            <Search size={16} />
            بحث
          </Link>

          {user ? (
            <>
              <Link 
                to="/orders" 
                className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm"
              >
                طلباتي
              </Link>

              {isSeller && (
                <>
                  <Link 
                    to="/my-products" 
                    className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm"
                  >
                    منتجاتي
                  </Link>
                  <Link 
                    to="/seller-orders" 
                    className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm"
                  >
                    طلبات البائع
                  </Link>
                  <Link 
                    to="/seller/dashboard" 
                    className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm"
                  >
                    لوحة التحكم
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link 
                  to="/admin/dashboard" 
                  className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition text-sm"
                >
                  لوحة الأدمن
                </Link>
              )}

              <Link 
                to="/inbox" 
                className="p-2 rounded-full hover:bg-primary-card transition-colors relative"
                title="الرسائل"
              >
                <MessageCircle size={20} className="text-gold" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <NotificationBell />

              {/* زر تفعيل الإشعارات */}
              <button
                onClick={handleEnableNotifications}
                className="p-2 rounded-full bg-gold/20 text-gold hover:bg-gold/40 transition"
                title="تفعيل الإشعارات والصوت"
              >
                🔔
              </button>

              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)} 
                  className="flex items-center gap-2 bg-primary-card rounded-full px-4 py-2 hover:bg-secondary-blue transition-colors"
                >
                  <User size={18} className="text-gold" />
                  <span className="text-sm">{profile?.full_name || user.email?.split('@')[0]}</span>
                  <ChevronDown size={14} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-primary-card rounded-lg shadow-xl z-50 border border-gold/30">
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-2 px-4 py-3 hover:bg-secondary-blue rounded-t-lg"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={16} /> بروفايلي
                    </Link>
                    <button 
                      onClick={() => { logout(); setDropdownOpen(false); }} 
                      className="flex items-center gap-2 w-full text-right px-4 py-3 hover:bg-secondary-blue rounded-b-lg text-red-500"
                    >
                      <LogOut size={16} /> تسجيل خروج
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition">
                تسجيل دخول
              </Link>
              <Link to="/register" className="border border-gold px-4 py-2 rounded-lg text-gold hover:bg-gold/10 transition">
                إنشاء حساب
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}


