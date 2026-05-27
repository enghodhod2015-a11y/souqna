import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { User, LogOut, Settings, Package, ShoppingBag, MessageCircle, LayoutDashboard } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../services/supabase'

export const Header = () => {
  // تم جلب loading هنا لمنع اختفاء العناصر عند تحديث الصفحة
  const { user, profile, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // جلب عدد المحادثات غير المقروءة
  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('buyer_unread_count, seller_unread_count')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      if (error) {
        console.error(error)
        return
      }
      let total = 0
      data.forEach(conv => {
        if (conv.buyer_unread_count && conv.buyer_id === user.id) total += conv.buyer_unread_count
        if (conv.seller_unread_count && conv.seller_id === user.id) total += conv.seller_unread_count
      })
      setUnreadCount(total)
    }

    fetchUnreadCount()

    // الاستماع للتغيرات في الوقت الفعلي (Realtime)
    const channel = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchUnreadCount()
      })
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

  return (
    <header className="bg-header-blue border-b-2 border-gold py-4 px-6 md:px-12">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-gold">سوقنا</Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/inbox" className="relative p-2 rounded-full hover:bg-primary-card transition">
                <MessageCircle size={22} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 bg-primary-card rounded-full px-4 py-2 hover:bg-secondary-blue">
                  <User size={20} />
                  <span>{profile?.full_name || user.email?.split('@')[0]}</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-primary-card rounded-lg shadow-xl z-50 border border-gold/30">
                    {loading ? (
                      <div className="p-4 text-center text-sm text-text-secondary">جاري جلب البيانات...</div>
                    ) : (
                      <>
                        <Link to="/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-secondary-blue rounded-t-lg" onClick={() => setDropdownOpen(false)}>
                          <Settings size={16} /> بروفايلي
                        </Link>
                        {(profile?.account_type === 'seller' || profile?.account_type === 'admin') && (
                          <Link to="/my-products" className="flex items-center gap-2 px-4 py-2 hover:bg-secondary-blue" onClick={() => setDropdownOpen(false)}>
                            <Package size={16} /> منتجاتي
                          </Link>
                        )}
                        <Link to="/orders" className="flex items-center gap-2 px-4 py-2 hover:bg-secondary-blue" onClick={() => setDropdownOpen(false)}>
                          <ShoppingBag size={16} /> طلباتي
                        </Link>
                        {(profile?.account_type === 'seller' || profile?.account_type === 'admin') && (
                          <Link to="/seller-orders" className="flex items-center gap-2 px-4 py-2 hover:bg-secondary-blue" onClick={() => setDropdownOpen(false)}>
                            <Package size={16} /> طلبات البائع
                          </Link>
                        )}
                        {(profile?.account_type === 'seller' || profile?.account_type === 'admin') && (
                          <Link to="/seller/dashboard" className="flex items-center gap-2 px-4 py-2 hover:bg-secondary-blue" onClick={() => setDropdownOpen(false)}>
                            <LayoutDashboard size={16} /> لوحة التحكم
                          </Link>
                        )}
                        {profile?.account_type === 'admin' && (
                          <Link to="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 hover:bg-secondary-blue" onClick={() => setDropdownOpen(false)}>
                            <LayoutDashboard size={16} /> لوحة الأدمن
                          </Link>
                        )}
                        <button onClick={() => { logout(); setDropdownOpen(false); }} className="flex items-center gap-2 w-full text-right px-4 py-2 hover:bg-secondary-blue rounded-b-lg text-red-500">
                          <LogOut size={16} /> تسجيل خروج
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              {/* إغلاق الكود بالشكل البرمجي السليم لإظهار أزرار الزوار المعتادة */}
              <Link to="/login" className="px-4 py-2 rounded-full border border-gold text-gold hover:bg-gold/10 transition">تسجيل دخول</Link>
              <Link to="/register" className="px-4 py-2 rounded-full bg-gold text-black hover:bg-gold-light transition">إنشاء حساب</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
