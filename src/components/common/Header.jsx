import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  User, 
  LogOut, 
  Package, 
  ShoppingBag, 
  MessageCircle, 
  LayoutDashboard,
  Store,
  ChevronDown
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../services/supabase'

export const Header = () => {
  const { user, profile, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const isSeller = profile?.account_type === 'seller' || profile?.account_type === 'admin'
  const isAdmin = profile?.account_type === 'admin'

  // جلب عدد المحادثات غير المقروءة
  useEffect(() => {
    if (!user?.id) return

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('buyer_unread_count, seller_unread_count, buyer_id, seller_id')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

        if (error) {
          console.error("❌ Error fetching unread conversations:", error)
          return
        }

        let total = 0
        data?.forEach(conv => {
          if (!conv) return
          if (conv.buyer_id === user.id) total += conv.buyer_unread_count || 0
          if (conv.seller_id === user.id) total += conv.seller_unread_count || 0
        })
        setUnreadCount(total)
      } catch (err) {
        console.error("🚨 Error in Header:", err)
      }
    }

    fetchUnreadCount()

    const channel = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [user?.id])

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
        {/* الشعار */}
        <Link to="/" className="text-2xl font-bold text-gold">سوقنا</Link>

        {/* الأيقونات والمستخدم */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* أيقونة المتجر - للبائع فقط */}
              {isSeller && (
                <Link 
                  to="/my-products" 
                  className="p-2 rounded-full hover:bg-primary-card transition-colors relative"
                  title="منتجاتي"
                >
                  <Store size={20} className="text-gold" />
                </Link>
              )}

              {/* أيقونة طلباتي */}
              <Link 
                to="/orders" 
                className="p-2 rounded-full hover:bg-primary-card transition-colors relative"
                title="طلباتي"
              >
                <ShoppingBag size={20} className="text-gold" />
              </Link>

              {/* أيقونة الرسائل */}
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

              {/* أيقونة لوحة التحكم - للبائع */}
              {isSeller && (
                <Link 
                  to="/seller/dashboard" 
                  className="p-2 rounded-full hover:bg-primary-card transition-colors relative"
                  title="لوحة التحكم"
                >
                  <LayoutDashboard size={20} className="text-gold" />
                </Link>
              )}

              {/* أيقونة لوحة الأدمن - للأدمن فقط */}
              {isAdmin && (
                <Link 
                  to="/admin/dashboard" 
                  className="p-2 rounded-full hover:bg-primary-card transition-colors relative"
                  title="لوحة الأدمن"
                >
                  <LayoutDashboard size={20} className="text-red-400" />
                </Link>
              )}

              {/* اسم المستخدم + منسدلة صغيرة (تسجيل خروج فقط) */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)} 
                  className="flex items-center gap-2 bg-primary-card rounded-full px-3 py-2 hover:bg-secondary-blue transition-colors"
                >
                  <User size={18} className="text-gold" />
                  <span className="text-sm hidden md:inline">{profile?.full_name || user.email?.split('@')[0]}</span>
                  <ChevronDown size={14} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-primary-card rounded-lg shadow-xl z-50 border border-gold/30">
                    {/* البروفايل */}
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-2 px-4 py-3 hover:bg-secondary-blue rounded-t-lg"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={16} /> بروفايلي
                    </Link>

                    {/* تسجيل خروج */}
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
              <Link to="/login" className="px-4 py-2 rounded-full border border-gold text-gold hover:bg-gold/10 transition">
                تسجيل دخول
              </Link>
              <Link to="/register" className="px-4 py-2 rounded-full bg-gold text-black hover:bg-gold-light transition">
                إنشاء حساب
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

