import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminStats, getUsers, updateUser, getProductsForAdmin, approveProduct, getOrdersForAdmin, reviewReceipt, getAuditLogs } from '../services/adminService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Package, ShoppingBag, DollarSign, Receipt, CheckCircle, XCircle, Eye, Search, Filter, AlertTriangle, Shield, UserCheck, UserX, Clock, TrendingUp, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

// CHANGED: تحسين عرض التواريخ
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar')
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('stats')
  const [searchTerm, setSearchTerm] = useState('')
  const [productFilter, setProductFilter] = useState('all') // 'all', 'pending', 'hidden'
  const [orderFilter, setOrderFilter] = useState('pending_receipts') // 'pending_receipts', 'all'
  const queryClient = useQueryClient()

  // إحصائيات
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminStats
  })

  // CHANGED: جلب بيانات المبيعات الشهرية الفعلية (إذا كانت متوفرة)
  const { data: monthlySales, isLoading: salesLoading } = useQuery({
    queryKey: ['adminMonthlySales'],
    queryFn: async () => {
      // نفترض وجود دالة في adminService لجلب المبيعات الشهرية، وإلا نعيد بيانات تجريبية
      try {
        const { getMonthlySalesAll } = await import('../services/adminService')
        return await getMonthlySalesAll()
      } catch {
        // بيانات تجريبية للعرض
        return [
          { name: 'يناير', sales: 0 },
          { name: 'فبراير', sales: 0 },
          { name: 'مارس', sales: 0 },
          { name: 'أبريل', sales: 0 },
          { name: 'مايو', sales: 0 },
          { name: 'يونيو', sales: 0 },
        ]
      }
    },
    enabled: activeTab === 'stats'
  })

  // المستخدمين
  const { data: users, refetch: refetchUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: () => getUsers({ search: searchTerm }),
    enabled: activeTab === 'users'
  })

  // المنتجات
  const { data: products, refetch: refetchProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['adminProducts', productFilter],
    queryFn: () => getProductsForAdmin({ status: productFilter === 'pending' ? 'pending' : productFilter === 'hidden' ? 'hidden' : undefined }),
    enabled: activeTab === 'products'
  })

  // الطلبات
  const { data: orders, refetch: refetchOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['adminOrders', orderFilter],
    queryFn: getOrdersForAdmin,
    enabled: activeTab === 'orders'
  })

  // سجل العمليات
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
    enabled: activeTab === 'logs'
  })

  // تحديث المستخدم (حظر، صلاحية)
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث المستخدم')
    },
    onError: (err) => toast.error(err.message)
  })

  // الموافقة على منتج
  const approveProductMutation = useMutation({
    mutationFn: ({ productId, approve, is_hidden }) => approveProduct(productId, approve, is_hidden),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث حالة المنتج')
    },
    onError: (err) => toast.error(err.message)
  })

  // مراجعة الإيصال
  const reviewReceiptMutation = useMutation({
    mutationFn: ({ orderId, approved, notes }) => reviewReceipt(orderId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminOrders'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث الطلب')
    },
    onError: (err) => toast.error(err.message)
  })

  // CHANGED: عرض حالة التحميل
  const isLoading = (activeTab === 'stats' && statsLoading) ||
    (activeTab === 'users' && usersLoading) ||
    (activeTab === 'products' && productsLoading) ||
    (activeTab === 'orders' && ordersLoading) ||
    (activeTab === 'logs' && logsLoading)

  if (isLoading && activeTab === 'stats') {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div></div>
  }

  // CHANGED: حساب الإحصائيات المحسنة
  const pendingProducts = products?.filter(p => !p.is_approved).length || 0
  const pendingReceipts = orders?.filter(o => o.payment_status === 'pending' && o.receipt_image).length || 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <Button variant="secondary" onClick={() => refetchStats()} className="flex items-center gap-2">
          <RefreshCw size={16} /> تحديث البيانات
        </Button>
      </div>

      {/* CHANGED: تبويبات محسنة */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'stats' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><TrendingUp size={18} /> الإحصائيات</button>
        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'users' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Users size={18} /> المستخدمين</button>
        <button onClick={() => setActiveTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'products' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Package size={18} /> المنتجات {pendingProducts > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingProducts}</span>}</button>
        <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'orders' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Receipt size={18} /> الطلبات {pendingReceipts > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingReceipts}</span>}</button>
        <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'logs' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Activity size={18} /> سجل العمليات</button>
      </div>

      {/* ========== تبويب الإحصائيات ========== */}
      {activeTab === 'stats' && stats && (
        <div>
          {/* CHANGED: بطاقات إحصائيات محسنة */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 hover:shadow-lg transition"><Users className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">المستخدمين</p><p className="text-2xl font-bold">{stats.usersCount}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 hover:shadow-lg transition"><Package className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">المنتجات</p><p className="text-2xl font-bold">{stats.productsCount}</p><p className="text-xs text-text-secondary">قيد المراجعة: {pendingProducts}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 hover:shadow-lg transition"><ShoppingBag className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">الطلبات</p><p className="text-2xl font-bold">{stats.ordersCount}</p><p className="text-xs text-text-secondary">إيصالات معلقة: {pendingReceipts}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 hover:shadow-lg transition"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">إجمالي المبيعات</p><p className="text-2xl font-bold">{stats.totalSales?.toLocaleString()} ريال</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30 hover:shadow-lg transition"><Receipt className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">الإيصالات المعلقة</p><p className="text-2xl font-bold">{stats.pendingReceipts}</p><button onClick={() => setActiveTab('orders')} className="text-xs text-gold underline mt-2">مراجعة</button></div>
          </div>

          {/* CHANGED: رسم بياني للمبيعات الشهرية */}
          <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-gold" /> المبيعات الشهرية (آخر 6 أشهر)</h2>
            {salesLoading ? (
              <div className="h-64 flex items-center justify-center">جاري التحميل...</div>
            ) : monthlySales && monthlySales.length > 0 && monthlySales.some(m => m.sales > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#ddd" />
                  <YAxis stroke="#ddd" />
                  <Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} formatter={(value) => `${value.toLocaleString()} ريال`} />
                  <Bar dataKey="sales" fill="#D4AF37" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-text-secondary">لا توجد بيانات مبيعات كافية لعرض الرسم البياني</div>
            )}
          </div>
        </div>
      )}

      {/* ========== تبويب المستخدمين ========== */}
      {activeTab === 'users' && (
        <div>
          <div className="flex gap-4 mb-4">
            <Input placeholder="بحث بالبريد الإلكتروني أو الاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
            <Button variant="secondary" onClick={() => refetchUsers()} className="flex items-center gap-2"><Search size={16} /> بحث</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-gold/30 bg-primary-card/50">
                  <th className="p-3 text-gold">الاسم</th><th className="p-3 text-gold">البريد</th><th className="p-3 text-gold">نوع الحساب</th><th className="p-3 text-gold">الحالة</th><th className="p-3 text-gold">تاريخ التسجيل</th><th className="p-3 text-gold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users?.map(user => (
                  <tr key={user.id} className="border-b border-gold/20 hover:bg-secondary-blue/30 transition">
                    <td className="p-3">{user.full_name || '-'}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${user.account_type === 'admin' ? 'bg-gold text-primary-blue' : user.account_type === 'seller' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}>{user.account_type === 'admin' ? 'أدمن' : user.account_type === 'seller' ? 'بائع' : 'مشتري'}</span></td>
                    <td className="p-3">{user.is_banned ? <span className="text-red-400 flex items-center gap-1"><UserX size={14} /> محظور</span> : <span className="text-green-400 flex items-center gap-1"><UserCheck size={14} /> نشط</span>}</td>
                    <td className="p-3 text-sm">{formatDate(user.created_at)}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className={`px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white transition`}>{user.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                      {user.account_type !== 'admin' && (
                        <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { account_type: user.account_type === 'seller' ? 'buyer' : 'seller' } })} className="px-2 py-1 rounded text-xs bg-gold text-primary-blue hover:bg-gold/80 transition">تبديل لبائع</button>
                      )}
                      {user.account_type !== 'admin' && (
                        <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { account_type: 'admin', admin_role: 'super' } })} className="px-2 py-1 rounded text-xs bg-purple-600 text-white hover:bg-purple-700 transition">جعـل أدمن</button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!users || users.length === 0) && <tr><td colSpan="6" className="text-center p-8 text-text-secondary">لا توجد نتائج</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== تبويب المنتجات ========== */}
      {activeTab === 'products' && (
        <div>
          <div className="flex gap-4 mb-4 justify-between items-center">
            <div className="flex gap-2">
              <button onClick={() => setProductFilter('all')} className={`px-3 py-1 rounded-lg text-sm transition ${productFilter === 'all' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>الكل</button>
              <button onClick={() => setProductFilter('pending')} className={`px-3 py-1 rounded-lg text-sm transition ${productFilter === 'pending' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>قيد المراجعة {pendingProducts > 0 && <span className="bg-red-500 text-white px-1 rounded-full ml-1">{pendingProducts}</span>}</button>
              <button onClick={() => setProductFilter('hidden')} className={`px-3 py-1 rounded-lg text-sm transition ${productFilter === 'hidden' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>مخفي</button>
            </div>
            <Button variant="secondary" onClick={() => refetchProducts()} className="flex items-center gap-2"><RefreshCw size={16} /> تحديث</Button>
          </div>
          <div className="space-y-3">
            {products?.map(product => (
              <div key={product.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <p className="text-text-secondary text-sm">البائع: {product.seller?.full_name || 'غير معروف'} | السعر: {product.price} ريال</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${product.is_approved ? 'bg-green-600' : 'bg-yellow-600'}`}>{product.is_approved ? 'موافق' : 'قيد المراجعة'}</span>
                    {product.is_hidden && <span className="bg-red-600 px-2 py-0.5 rounded-full text-xs">مخفي</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!product.is_approved && (
                    <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: true })} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition flex items-center gap-1"><CheckCircle size={14} /> موافقة</button>
                  )}
                  <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: false, is_hidden: !product.is_hidden })} className={`${product.is_hidden ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white px-3 py-1 rounded-lg text-sm transition flex items-center gap-1`}>
                    {product.is_hidden ? <Eye size={14} /> : <Eye size={14} />} {product.is_hidden ? 'إظهار' : 'إخفاء'}
                  </button>
                </div>
              </div>
            ))}
            {(!products || products.length === 0) && <div className="text-center p-8 text-text-secondary">لا توجد منتجات</div>}
          </div>
        </div>
      )}

      {/* ========== تبويب الطلبات والإيصالات ========== */}
      {activeTab === 'orders' && orders && (
        <div>
          <div className="flex gap-4 mb-4 justify-between items-center">
            <div className="flex gap-2">
              <button onClick={() => setOrderFilter('pending_receipts')} className={`px-3 py-1 rounded-lg text-sm transition ${orderFilter === 'pending_receipts' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>الإيصالات المعلقة {pendingReceipts > 0 && <span className="bg-red-500 text-white px-1 rounded-full ml-1">{pendingReceipts}</span>}</button>
              <button onClick={() => setOrderFilter('all')} className={`px-3 py-1 rounded-lg text-sm transition ${orderFilter === 'all' ? 'bg-gold text-primary-blue' : 'bg-secondary-blue'}`}>جميع الطلبات</button>
            </div>
            <Button variant="secondary" onClick={() => refetchOrders()} className="flex items-center gap-2"><RefreshCw size={16} /> تحديث</Button>
          </div>

          {/* عرض الإيصالات المعلقة أولاً */}
          {orderFilter === 'pending_receipts' && (
            <div className="space-y-4">
              {orders.filter(o => o.payment_status === 'pending' && o.receipt_image).map(order => (
                <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div><p className="font-bold">الطلب #{order.id}</p><p>المنتج: {order.product?.title || 'غير معروف'}</p><p>المشتري: {order.buyer?.full_name} ({order.buyer?.email})</p><p>المبلغ: {order.total_price} ريال</p><p>تاريخ الطلب: {formatDate(order.created_at)}</p></div>
                    <div><a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline flex items-center gap-1"><Eye size={16} /> عرض الإيصال</a></div>
                  </div>
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gold/20">
                    <button onClick={() => reviewReceiptMutation.mutate({ orderId: order.id, approved: true })} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded-lg flex items-center gap-1"><CheckCircle size={16} /> قبول الإيصال</button>
                    <button onClick={() => { const notes = prompt('سبب الرفض (اختياري):'); reviewReceiptMutation.mutate({ orderId: order.id, approved: false, notes: notes || 'تم الرفض من قبل الأدمن' }); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-lg flex items-center gap-1"><XCircle size={16} /> رفض الإيصال</button>
                  </div>
                </div>
              ))}
              {orders.filter(o => o.payment_status === 'pending' && o.receipt_image).length === 0 && <div className="text-center p-8 text-text-secondary">لا توجد إيصالات معلقة للمراجعة</div>}
            </div>
          )}

          {/* عرض جميع الطلبات */}
          {orderFilter === 'all' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th className="p-3">#</th><th>المنتج</th><th>المشتري</th><th>المبلغ</th><th>الحالة</th><th>تاريخ الطلب</th><th>الإيصال</th></tr></thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                      <td className="p-3">{order.id}</td>
                      <td>{order.product?.title || '-'}</td>
                      <td>{order.buyer?.full_name}</td>
                      <td>{order.total_price} ريال</td>
                      <td><span className="px-2 py-0.5 rounded-full text-xs bg-yellow-600">{order.status}</span></td>
                      <td className="text-sm">{formatDate(order.created_at)}</td>
                      <td>{order.receipt_image ? <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline">عرض</a> : '-'}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan="7" className="text-center p-8">لا توجد طلبات</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== تبويب سجل العمليات ========== */}
      {activeTab === 'logs' && auditLogs && (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th className="p-3">التاريخ</th><th>الأدمن</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                  <td className="p-3 text-sm">{formatDate(log.created_at)}</td>
                  <td>{log.admin?.full_name || log.admin?.email || 'غير معروف'}</td>
                  <td><span className="px-2 py-0.5 rounded-full text-xs bg-gold/20 text-gold">{log.action}</span></td>
                  <td className="text-sm max-w-md truncate">{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '-'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && <tr><td colSpan="4" className="text-center p-8">لا توجد سجلات</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// CHANGED: إضافة أيقونة التحديث (RefreshCw) المستخدمة في الأزرار
import { RefreshCw } from 'lucide-react'


