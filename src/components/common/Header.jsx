import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  User, 
  LogOut, 
  ChevronDown,
  MessageCircle,
  Search,
  Menu,
  X,
  Heart,
  ShoppingBag
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const isSeller = profile?.account_type === 'seller' || profile?.account_type === 'admin'
  const isAdmin = profile?.account_type === 'admin'

  // جلب عدد الرسائل غير المقروءة
  useEffect(() => {
    if (!user) return
    const fetchUnreadCount = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('buyer_unread_count, seller_unread_count, buyer_id, seller_id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      if (error) return
      let total = 0
      data?.forEach(conv => {
        if (conv.buyer_id === user.id) total += conv.buyer_unread_count || 0
        if (conv.seller_id === user.id) total += conv.seller_unread_count || 0
      })
      setUnreadCount(total)
    }
    fetchUnreadCount()
    const channel = supabase
      .channel(`conversations-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchUnreadCount())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) setIsMobileMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobileMenuOpen])

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      await enableAudio()
      toast.success('✅ تم تفعيل الإشعارات والصوت')
    } else {
      toast.error('❌ لم يتم التفعيل')
    }
  }

  // روابط سطح المكتب (بدون NotificationBell - يظهر مرة واحدة فقط في شريط الجوال)
  const desktopLinks = (
    <>
      <Link to="/search" className="flex items-center gap-2 bg-gold/10 border border-gold text-gold px-4 py-2 rounded-lg font-bold hover:bg-gold hover:text-primary-blue transition text-sm">
        <Search size={16} /> بحث
      </Link>
      {user ? (
        <>
          <Link to="/orders" className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm">طلباتي</Link>
          {isSeller && (
            <>
              <Link to="/my-products" className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm">منتجاتي</Link>
              <Link to="/seller-orders" className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm">طلبات البائع</Link>
              <Link to="/seller/dashboard" className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition text-sm">لوحة التحكم</Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to="/admin/dashboard" className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition text-sm">لوحة الأدمن</Link>
              <Link to="/admin/coupons" className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition text-sm">🎟️ القسائم</Link>
            </>
          )}
          <Link to="/inbox" className="p-2 rounded-full hover:bg-primary-card transition-colors relative" title="الرسائل">
            <MessageCircle size={20} className="text-gold" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/wishlist" className="p-2 rounded-full hover:bg-primary-card transition-colors" title="المفضلة">
            <Heart size={20} className="text-gold" />
          </Link>
          {/* سطح المكتب لا يحتاج NotificationBell لأنه سيظهر في شريط الجوال العام */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 bg-primary-card rounded-full px-4 py-2 hover:bg-secondary-blue transition-colors">
              <User size={18} className="text-gold" />
              <span className="text-sm hidden md:inline">{profile?.full_name || user.email?.split('@')[0]}</span>
              <ChevronDown size={14} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-primary-card rounded-lg shadow-xl z-50 border border-gold/30">
                <Link to="/profile" className="flex items-center gap-2 px-4 py-3 hover:bg-secondary-blue rounded-t-lg" onClick={() => setDropdownOpen(false)}><User size={16} /> بروفايلي</Link>
                <button onClick={() => { logout(); setDropdownOpen(false); }} className="flex items-center gap-2 w-full text-right px-4 py-3 hover:bg-secondary-blue rounded-b-lg text-red-500"><LogOut size={16} /> تسجيل خروج</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex gap-3">
          <Link to="/login" className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold hover:bg-gold/90 transition">تسجيل دخول</Link>
          <Link to="/register" className="border border-gold px-4 py-2 rounded-lg text-gold hover:bg-gold/10 transition">إنشاء حساب</Link>
        </div>
      )}
    </>
  )

  // روابط الجوال (القائمة المنبثقة – بدون أيقونات مكررة)
  const mobileLinks = (
    <div className="flex flex-col gap-3 w-full">
      <Link to="/search" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-end gap-2 bg-gold/10 border border-gold text-gold px-4 py-2 rounded-lg font-bold">
        <Search size={18} /> بحث
      </Link>
      {user ? (
        <>
          <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold text-right">طلباتي</Link>
          {isSeller && (
            <>
              <Link to="/my-products" onClick={() => setIsMobileMenuOpen(false)} className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold text-right">منتجاتي</Link>
              <Link to="/seller-orders" onClick={() => setIsMobileMenuOpen(false)} className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold text-right">طلبات البائع</Link>
              <Link to="/seller/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold text-right">لوحة التحكم</Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-right">لوحة الأدمن</Link>
              <Link to="/admin/coupons" onClick={() => setIsMobileMenuOpen(false)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-right">🎟️ القسائم</Link>
            </>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-gold/30 pt-3 mt-1">
            <Link to="/inbox" onClick={() => setIsMobileMenuOpen(false)} className="relative p-2 rounded-full hover:bg-primary-card">
              <MessageCircle size={22} className="text-gold" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link to="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-primary-card">
              <Heart size={22} className="text-gold" />
            </Link>
            <div className="flex items-center gap-2 bg-primary-card rounded-full px-3 py-1">
              <User size={18} className="text-gold" />
              <span className="text-sm">{profile?.full_name || user.email?.split('@')[0]}</span>
            </div>
          </div>
          <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="flex items-center justify-end gap-2 text-red-500 px-4 py-2 rounded-lg border border-red-500/30 w-full">
            <LogOut size={18} /> تسجيل خروج
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="bg-gold text-primary-blue px-4 py-2 rounded-lg font-bold text-center">تسجيل دخول</Link>
          <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="border border-gold px-4 py-2 rounded-lg text-gold text-center">إنشاء حساب</Link>
        </div>
      )}
      {user && (
        <button onClick={handleEnableNotifications} className="flex items-center justify-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-lg font-bold text-sm">
          🔔 تفعيل الإشعارات
        </button>
      )}
    </div>
  )

  return (
    <header className="bg-header-blue border-b-2 border-gold py-4 px-6 md:px-12 relative z-40">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-gold">سوقنا</Link>

        {/* سطح المكتب: جميع الأزرار النصية */}
        <div className="hidden lg:flex items-center gap-3">{desktopLinks}</div>

        {/* الجوال: أيقونات مختصرة + جرس الإشعارات + زر القائمة */}
        <div className="flex lg:hidden items-center gap-2">
          {user && (
            <>
              <Link to="/orders" className="p-2 rounded-full hover:bg-primary-card transition-colors">
                <ShoppingBag size={20} className="text-gold" />
              </Link>
              <Link to="/wishlist" className="p-2 rounded-full hover:bg-primary-card transition-colors">
                <Heart size={20} className="text-gold" />
              </Link>
              {/* ✅ أيقونة الجرس - تظهر هنا على الجوال */}
              <NotificationBell />
              <Link to="/profile" className="p-2 rounded-full hover:bg-primary-card transition-colors">
                <User size={20} className="text-gold" />
              </Link>
            </>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gold p-2 rounded-lg hover:bg-primary-card transition-colors z-50"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-16 left-0 right-0 bg-primary-card border-b border-gold/30 shadow-2xl z-50 p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end">
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gold p-1 rounded-full hover:bg-gold/20"><X size={20} /></button>
            </div>
            {mobileLinks}
          </div>
        </>
      )}
    </header>
  )
}

