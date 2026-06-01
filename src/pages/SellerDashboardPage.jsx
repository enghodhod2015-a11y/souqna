import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSellerStats, getMonthlySales } from '../services/orderService'
import { getSellerProducts } from '../services/productService'
import { getUserConversations } from '../services/chatService'
import { Button } from '../components/ui/Button'
import { Package, ShoppingBag, MessageCircle, DollarSign, TrendingUp, Eye, Edit } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { useAbortController } from '../hooks/useAbortController'

export default function SellerDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [monthlySales, setMonthlySales] = useState([])
  const [recentProducts, setRecentProducts] = useState([])
  const [recentConversations, setRecentConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const abortController = useAbortController()

  useEffect(() => {
    let isMounted = true
    const loadDashboard = async () => {
      try {
        const signal = abortController?.signal
        const [statsData, salesData, productsData, conversationsData] = await Promise.all([
          getSellerStats(user.id).catch(err => { if (err.name !== 'AbortError') console.error('Stats error:', err); return null }),
          getMonthlySales(user.id).catch(err => { if (err.name !== 'AbortError') console.error('MonthlySales error:', err); return null }),
          getSellerProducts(user.id),
          getUserConversations(user.id)
        ])
        if (signal?.aborted || !isMounted) return
        setStats(statsData)
        setMonthlySales(salesData || [])
        setRecentProducts(productsData ? productsData.slice(0, 5) : [])
        setRecentConversations(conversationsData ? conversationsData.slice(0, 5) : [])
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') toast.error(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    if (user) loadDashboard()
    return () => {
      isMounted = false
      abortController?.abort()
    }
  }, [user, abortController])

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم البائع</h1>
        <Link to="/add-product"><Button>+ إضافة منتج</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 text-center">
          <Package className="text-gold mx-auto mb-2" size={28} />
          <p className="text-text-secondary text-sm">المنتجات</p>
          <p className="text-2xl font-bold">{stats?.productsCount || 0}</p>
        </div>
        <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 text-center">
          <ShoppingBag className="text-gold mx-auto mb-2" size={28} />
          <p className="text-text-secondary text-sm">المبيعات</p>
          <p className="text-2xl font-bold">{stats?.totalSales || 0} ريال</p>
        </div>
        <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 text-center">
          <MessageCircle className="text-gold mx-auto mb-2" size={28} />
          <p className="text-text-secondary text-sm">الاستفسارات</p>
          <p className="text-2xl font-bold">{stats?.conversationsCount || 0}</p>
        </div>
        <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 text-center">
          <TrendingUp className="text-warning mx-auto mb-2" size={28} />
          <p className="text-text-secondary text-sm">طلبات معلقة</p>
          <p className="text-2xl font-bold">{stats?.pendingOrders || 0}</p>
        </div>
        <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 text-center">
          <DollarSign className="text-success mx-auto mb-2" size={28} />
          <p className="text-text-secondary text-sm">مكتملة</p>
          <p className="text-2xl font-bold">{stats?.completedOrders || 0}</p>
        </div>
      </div>

      {monthlySales.length > 0 && (
        <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 mb-8">
          <h2 className="text-xl font-bold mb-4">المبيعات الشهرية</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              <Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} />
              <Bar dataKey="sales" fill="#D4AF37" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">آخر المنتجات</h2>
          <Link to="/my-products" className="text-gold text-sm">عرض الكل</Link>
        </div>
        {recentProducts.length === 0 ? (
          <p className="text-center text-text-secondary">لا توجد منتجات بعد</p>
        ) : (
          <div className="space-y-3">
            {recentProducts.map(product => {
              if (!product?.id) return null;
              const imgSrc = product.cover_image || 'https://placehold.co/60x60/06264D/D4AF37?text=صورة';
              return (
                <div key={product.id} className="flex justify-between items-center p-3 bg-secondary-blue/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img 
                      src={imgSrc}
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded-lg border border-gold/30"
                      onError={(e) => { e.target.src = 'https://placehold.co/60x60/06264D/D4AF37?text=صورة' }}
                    />
                    <div>
                      <p className="font-bold">{product.title}</p>
                      <p className="text-gold">{product.final_price} ريال</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/product/${product.id}`}><Eye size={18} className="text-gold" /></Link>
                    <Link to={`/edit-product/${product.id}`}><Edit size={18} className="text-warning" /></Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">آخر الاستفسارات</h2>
          <Link to="/inbox" className="text-gold text-sm">عرض الكل</Link>
        </div>
        {recentConversations.length === 0 ? (
          <p className="text-center text-text-secondary">لا توجد استفسارات بعد</p>
        ) : (
          <div className="space-y-3">
            {recentConversations.map(conv => {
              if (!conv?.id) return null;
              const isBuyer = conv.buyer_id === user?.id
              const unreadCount = isBuyer ? conv.buyer_unread_count : conv.seller_unread_count
              const anonymousLabel = isBuyer ? "البائع" : "مشتري محتمل";
              return (
                <Link to={`/chat/c/${conv.id}`} key={conv.id}>
                  <div className="flex justify-between items-center p-3 bg-secondary-blue/30 rounded-xl hover:bg-secondary-blue transition">
                    <div>
                      <p className="font-bold">{conv.product?.title || 'منتج غير متوفر'}</p>
                      <p className="text-text-secondary text-sm">الطرف الآخر: {anonymousLabel}</p>
                      <p className="text-text-secondary text-sm truncate">{conv.last_message || 'بدء المحادثة'}</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


