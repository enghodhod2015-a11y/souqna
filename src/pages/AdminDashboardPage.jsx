import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminStats, getUsers, updateUser, getProductsForAdmin, approveProduct, getOrdersForAdmin, reviewReceipt, getAuditLogs, addAuditLog } from '../services/adminService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Package, ShoppingBag, DollarSign, Receipt, CheckCircle, XCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('stats')
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  // إحصائيات
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminStats
  })

  // المستخدمين
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: () => getUsers({ search: searchTerm }),
    enabled: activeTab === 'users'
  })

  // المنتجات
  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: getProductsForAdmin,
    enabled: activeTab === 'products'
  })

  // الطلبات
  const { data: orders, refetch: refetchOrders } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: getOrdersForAdmin,
    enabled: activeTab === 'orders'
  })

  // سجل العمليات
  const { data: auditLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
    enabled: activeTab === 'logs'
  })

  // تحديث المستخدم (حظر، صلاحية)
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      toast.success('تم تحديث المستخدم')
    },
    onError: (err) => toast.error(err.message)
  })

  // الموافقة على منتج
  const approveProductMutation = useMutation({
    mutationFn: ({ productId, approve }) => approveProduct(productId, approve),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts'])
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

  if (statsLoading && activeTab === 'stats') return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gold mb-6">لوحة تحكم الأدمن</h1>

      {/* تبويبات */}
      <div className="flex gap-2 mb-6 border-b border-gold/30 pb-2">
        <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg ${activeTab === 'stats' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الإحصائيات</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg ${activeTab === 'users' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المستخدمين</button>
        <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg ${activeTab === 'products' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات</button>
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-lg ${activeTab === 'orders' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الطلبات والإيصالات</button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-lg ${activeTab === 'logs' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>سجل العمليات</button>
      </div>

      {/* محتوى التبويبات */}
      {activeTab === 'stats' && stats && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Users className="text-gold mb-2" /><p className="text-text-secondary">المستخدمين</p><p className="text-2xl font-bold">{stats.usersCount}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Package className="text-gold mb-2" /><p className="text-text-secondary">المنتجات</p><p className="text-2xl font-bold">{stats.productsCount}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><ShoppingBag className="text-gold mb-2" /><p className="text-text-secondary">الطلبات</p><p className="text-2xl font-bold">{stats.ordersCount}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><DollarSign className="text-gold mb-2" /><p className="text-text-secondary">إجمالي المبيعات</p><p className="text-2xl font-bold">{stats.totalSales} ريال</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Receipt className="text-gold mb-2" /><p className="text-text-secondary">إيصالات معلقة</p><p className="text-2xl font-bold">{stats.pendingReceipts}</p></div>
          </div>
          <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
            <h2 className="text-xl font-bold mb-4">المبيعات الشهرية (آخر 6 أشهر)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[]}> {/* هنا يمكن جلب بيانات حقيقية من adminService.getMonthlySalesAll() */} <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" /> <YAxis /> <Tooltip /> <Bar dataKey="sales" fill="#D4AF37" /> </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'users' && users && (
        <div>
          <Input placeholder="بحث بالبريد الإلكتروني..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-4" />
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead><tr className="border-b border-gold/30"><th className="p-2">الاسم</th><th>البريد</th><th>نوع الحساب</th><th>الدور</th><th>محظور</th><th>إجراءات</th></tr></thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gold/20">
                    <td className="p-2">{user.full_name}</td><td>{user.email}</td><td>{user.account_type}</td><td>{user.admin_role || '-'}</td><td>{user.is_banned ? 'نعم' : 'لا'}</td>
                    <td className="flex gap-2">
                      <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className="text-warning">حظر</button>
                      <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { account_type: user.account_type === 'admin' ? 'buyer' : 'admin' } })} className="text-gold">تبديل الأدمن</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && products && (
        <div className="space-y-4">
          {products.map(product => (
            <div key={product.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30 flex justify-between items-center">
              <div><h3 className="font-bold">{product.title}</h3><p className="text-text-secondary">البائع: {product.seller?.full_name}</p><p>الحالة: {product.is_approved ? 'موافق' : 'قيد المراجعة'} {product.is_hidden && '(مخفي)'}</p></div>
              <div className="flex gap-2">
                {!product.is_approved && <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: true })} className="bg-success text-white px-3 py-1 rounded">موافقة</button>}
                <button onClick={() => approveProductMutation.mutate({ productId: product.id, approve: false, is_hidden: true })} className="bg-danger text-white px-3 py-1 rounded">إخفاء</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'orders' && orders && (
        <div className="space-y-4">
          {orders.filter(o => o.payment_status === 'pending' && o.receipt_image).map(order => (
            <div key={order.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <p><strong>الطلب #:</strong> {order.id}</p><p><strong>المنتج:</strong> {order.product?.title}</p><p><strong>المشتري:</strong> {order.buyer?.full_name}</p><p><strong>المبلغ:</strong> {order.total_price} ريال</p>
              <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="text-gold underline flex items-center gap-1"><Eye size={16} /> عرض الإيصال</a>
              <div className="flex gap-2 mt-2">
                <button onClick={() => reviewReceiptMutation.mutate({ orderId: order.id, approved: true })} className="bg-success text-white px-3 py-1 rounded">قبول</button>
                <button onClick={() => reviewReceiptMutation.mutate({ orderId: order.id, approved: false, notes: 'إيصال غير واضح' })} className="bg-danger text-white px-3 py-1 rounded">رفض</button>
              </div>
            </div>
          ))}
          {orders.filter(o => o.payment_status !== 'pending').length === 0 && <p className="text-center">لا توجد إيصالات معلقة</p>}
        </div>
      )}

      {activeTab === 'logs' && auditLogs && (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead><tr className="border-b border-gold/30"><th>التاريخ</th><th>الأدمن</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} className="border-b border-gold/20">
                  <td className="p-2">{new Date(log.created_at).toLocaleString()}</td><td>{log.admin?.full_name || log.admin?.email}</td><td>{log.action}</td><td>{JSON.stringify(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}