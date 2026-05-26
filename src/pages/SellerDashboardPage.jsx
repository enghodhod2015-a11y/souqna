import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSellerStats, getMonthlySales } from '../services/orderService'
import { getSellerProducts } from '../services/productService'
import { getUserConversations } from '../services/chatService'
import { Button } from '../components/ui/Button'
import { Package, ShoppingBag, MessageCircle, DollarSign, TrendingUp, Eye, Edit, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

export default function SellerDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [monthlySales, setMonthlySales] = useState([])
  const [recentProducts, setRecentProducts] = useState([])
  const [recentConversations, setRecentConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadDashboard()
  }, [user])

  const loadDashboard = async () => {
    try {
      const [statsData, salesData, productsData, conversationsData] = await Promise.all([
        getSellerStats(user.id),
        getMonthlySales(user.id),
        getSellerProducts(user.id),
        getUserConversations(user.id)
      ])
      setStats(statsData)
      setMonthlySales(salesData)
      setRecentProducts(productsData.slice(0, 5))
      setRecentConversations(conversationsData.slice(0, 5))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم البائع</h1>
        <Link to="/add-product"><Button>+ إضافة منتج</Button></Link>
      </div>

      {/* بطاقات الإحصائيات */}
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

      {/* الرسم البياني للمبيعات */}
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

      {/* آخر المنتجات */}
      <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">آخر المنتجات</h2>
          <Link to="/my-products" className="text-gold text-sm">عرض الكل</Link>
        </div>
        {recentProducts.length === 0 ? (
          <p className="text-center text-text-secondary">لا توجد منتجات بعد</p>
        ) : (
          <div className="space-y-3">
            {recentProducts.map(product => (
              <div key={product.id} className="flex justify-between items-center p-3 bg-secondary-blue/30 rounded-xl">
                <div>
                  <p className="font-bold">{product.title}</p>
                  <p className="text-gold">{product.final_price} ريال</p>
                  <p className="text-text-secondary text-sm">المشاهدات: {product.views_count || 0}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/product/${product.id}`}><Eye size={18} className="text-gold" /></Link>
                  <Link to={`/edit-product/${product.id}`}><Edit size={18} className="text-warning" /></Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* آخر الاستفسارات */}
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
              const otherUser = conv.buyer_id === user.id ? conv.seller : conv.buyer
              const unreadCount = conv.buyer_id === user.id ? conv.buyer_unread_count : conv.seller_unread_count
              return (
                <Link to={`/chat/${conv.product_id}/${otherUser.id}`} key={conv.id}>
                  <div className="flex justify-between items-center p-3 bg-secondary-blue/30 rounded-xl hover:bg-secondary-blue transition">
                    <div>
                      <p className="font-bold">{conv.product?.title}</p>
                      <p className="text-text-secondary text-sm">مع: {otherUser?.full_name}</p>
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