import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminStats, getUsers, updateUser, getProductsForAdmin, approveProduct,
  getOrdersForAdmin, reviewReceipt, getAuditLogs, getPendingSellers,
  approveSeller, getSellerWallet, getWithdrawalRequests, processWithdrawal,
  getPlatformCommissions, getDisputes, resolveDispute, getCoupons, createCoupon,
  getBanners, updateBanner, getFeaturedProducts, toggleFeatured,
  getFlashSales, createFlashSale, getSettings, updateSettings,
  getRoles, updateRole, backupDatabase, exportReport,
  getSellerReceipts, addSellerReceipt
} from '../services/adminService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import {
  Users, Package, ShoppingBag, DollarSign, Search,
  TrendingUp, Activity, RefreshCw, Wallet, Send, BarChart3, LineChart as LineChartIcon,
  Loader, MessageCircle, Clock, CheckCircle, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar-YE')
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(amount || 0)
}

const mockMonthlySales = [
  { name: 'يناير', sales: 12500 },
  { name: 'فبراير', sales: 15200 },
  { name: 'مارس', sales: 18700 },
  { name: 'أبريل', sales: 22300 },
  { name: 'مايو', sales: 19800 },
  { name: 'يونيو', sales: 24500 },
]

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [activeMainTab, setActiveMainTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sellerDetailTab, setSellerDetailTab] = useState('profile')
  const [buyerDetailTab, setBuyerDetailTab] = useState('profile')
  const [sellerStats, setSellerStats] = useState({
    totalProducts: 0, soldProducts: 0, shippingProducts: 0,
    notShippedWithReceipt: 0, noReceiptPurchased: 0, notPurchased: 0,
    duplicateProducts: 0, inappropriateProducts: 0,
    unansweredInquiries: 0, answeredInquiries: 0
  })
  const [sellerFilterId, setSellerFilterId] = useState(null)
  const [sellerFinance, setSellerFinance] = useState({ totalSales: 0, totalReturns: 0, totalReceived: 0, remaining: 0 })

  const [showReceiptsModal, setShowReceiptsModal] = useState(false)
  const [sellerReceiptsList, setSellerReceiptsList] = useState([])

  const [topProducts, setTopProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [pendingActions, setPendingActions] = useState({ products: 0, receipts: 0, sellers: 0 })

  const queryClient = useQueryClient()

  // جلب البيانات الإضافية للوحة التحكم - تجنب الاستعلامات المعقدة التي تسبب 400
  useEffect(() => {
    if (activeMainTab !== 'dashboard') return
    const fetchDashboardExtras = async () => {
      try {
        // 1. أفضل المنتجات مبيعاً: جلب order_items مع product_id و quantity فقط ثم جلب المنتجات
        const { data: orderItems, error: oiErr } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order.status', 'completed')
          .limit(100)
        if (oiErr) throw oiErr
        if (orderItems && orderItems.length) {
          const productIds = [...new Set(orderItems.map(item => item.product_id))]
          const { data: productsData, error: pErr } = await supabase
            .from('products')
            .select('id, name, price')
            .in('id', productIds)
          if (pErr) throw pErr
          const productMap = Object.fromEntries(productsData?.map(p => [p.id, p]) || [])
          const grouped = orderItems.reduce((acc, item) => {
            const product = productMap[item.product_id]
            if (!product) return acc
            const id = item.product_id
            if (!acc[id]) acc[id] = { name: product.name, total_quantity: 0, revenue: 0 }
            acc[id].total_quantity += item.quantity
            acc[id].revenue += (product.price || 0) * item.quantity
            return acc
          }, {})
          setTopProducts(Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 5))
        }

        // 2. أحدث الطلبات
        const { data: orders, error: ordersErr } = await supabase
          .from('orders')
          .select('id, total_amount, status, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(10)
        if (ordersErr) throw ordersErr
        if (orders && orders.length) {
          const userIds = orders.map(o => o.user_id).filter(Boolean)
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds)
          if (profErr) throw profErr
          const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p.full_name]) || [])
          setRecentOrders(orders.map(o => ({ ...o, buyer_name: profileMap[o.user_id] || 'مستخدم' })))
        }

        // 3. الإجراءات المعلقة
        const { count: pendingProducts } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false)
        const { count: pendingReceipts } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('payment_status', 'pending')
          .not('receipt_image', 'is', null)
        const { count: pendingSellers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'seller')
          .eq('is_verified', false)
        setPendingActions({ products: pendingProducts || 0, receipts: pendingReceipts || 0, sellers: pendingSellers || 0 })
      } catch (err) { console.error('خطأ في جلب بيانات إضافية:', err) }
    }
    fetchDashboardExtras()
  }, [activeMainTab])

  // جلب ملخص مالي للبائع
  useEffect(() => {
    if (!selectedSeller?.id) return
    const fetchFinanceSummary = async () => {
      try {
        const sellerId = selectedSeller.id
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', sellerId)
        const productIds = products?.map(p => p.id) || []
        let totalSales = 0
        let totalReturns = 0
        if (productIds.length) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('order_id, product_price, quantity')
            .in('product_id', productIds)
          if (orderItems?.length) {
            const orderIds = [...new Set(orderItems.map(oi => oi.order_id))]
            const { data: orders } = await supabase
              .from('orders')
              .select('id, status, return_status')
              .in('id', orderIds)
            const ordersMap = new Map(orders?.map(o => [o.id, o]) || [])
            for (const item of orderItems) {
              const order = ordersMap.get(item.order_id)
              if (order) {
                if (order.status === 'completed' || order.status === 'delivered') totalSales += item.product_price * item.quantity
                if (order.return_status === 'approved') totalReturns += item.product_price * item.quantity
              }
            }
          }
        }
        const { data: transfers } = await supabase
          .from('seller_transfers')
          .select('amount')
          .eq('seller_id', sellerId)
        const totalReceived = transfers?.reduce((s, t) => s + (t.amount || 0), 0) || 0
        setSellerFinance({ totalSales, totalReturns, totalReceived, remaining: totalSales - totalReturns - totalReceived })
      } catch (err) { console.error(err) }
    }
    fetchFinanceSummary()
  }, [selectedSeller])

  // باقي الـ Queries و Mutations
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminStats
  })
  const { data: users, refetch: refetchUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: () => getUsers({ search: searchTerm }),
    enabled: activeMainTab === 'users'
  })
  const { data: pendingSellers, refetch: refetchPendingSellers } = useQuery({
    queryKey: ['pendingSellers'],
    queryFn: getPendingSellers,
    enabled: activeMainTab === 'users' && activeSubTab === 'pending_sellers'
  })
  const { data: products, refetch: refetchProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['adminProducts', sellerFilterId],
    queryFn: () => getProductsForAdmin({ seller_id: sellerFilterId }),
    enabled: activeMainTab === 'products'
  })

  const refreshAllData = async () => {
    await Promise.all([refetchStats(), refetchUsers(), refetchPendingSellers(), refetchProducts()])
    toast.success('تم تحديث جميع البيانات')
  }

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      toast.success('تم تحديث المستخدم')
      if (selectedSeller && selectedSeller.id === userId) setSelectedSeller(prev => ({ ...prev, ...updates }))
      if (selectedBuyer && selectedBuyer.id === userId) setSelectedBuyer(prev => ({ ...prev, ...updates }))
    },
    onError: (err) => toast.error(err.message)
  })

  const approveSellerMutation = useMutation({
    mutationFn: ({ sellerId, approved, notes }) => approveSeller(sellerId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingSellers'])
      toast.success('تم تحديث حالة البائع')
    }
  })

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ userId, title, message }) => {
      const { data: { user: adminUser } } = await supabase.auth.getUser()
      const adminId = adminUser.id
      let conversationId = null
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(buyer_id.eq.${adminId},seller_id.eq.${userId}),and(buyer_id.eq.${userId},seller_id.eq.${adminId})`)
        .maybeSingle()
      if (existingConv) conversationId = existingConv.id
      else {
        const { data: newConv, error } = await supabase.from('conversations').insert({
          buyer_id: adminId, seller_id: userId, product_id: null,
          created_at: new Date().toISOString(), last_message: message, last_message_at: new Date().toISOString()
        }).select().single()
        if (error) throw error
        conversationId = newConv.id
      }
      await supabase.from('notifications').insert({
        user_id: userId, type: 'info', title, message,
        related_id: conversationId.toString(), is_read: false, created_at: new Date().toISOString()
      })
      await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: adminId, receiver_id: userId,
        message, created_at: new Date().toISOString(), is_read: false
      })
    },
    onSuccess: () => toast.success('تم إرسال الإشعار وفتح محادثة مع الإدارة')
  })

  const loadSellerReceipts = async () => {
    if (!selectedSeller) return
    try {
      const data = await getSellerReceipts(selectedSeller.id)
      setSellerReceiptsList(data)
      setShowReceiptsModal(true)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleAddTransfer = async () => {
    if (!selectedSeller) {
      toast.error('اختر بائعاً أولاً')
      return
    }
    const amountNum = parseFloat(transferAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('أدخل مبلغاً صحيحاً')
      return
    }
    if (!receiptFile) {
      toast.error('يرجى اختيار صورة الإيصال')
      return
    }
    setUploading(true)
    try {
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `seller_transfers/${selectedSeller.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
      await addSellerReceipt(selectedSeller.id, amountNum, publicUrl, transferNote || '')
      toast.success('تم تسجيل التحويل بنجاح')
      setTransferAmount('')
      setTransferNote('')
      setReceiptFile(null)
      const fileInput = document.getElementById('receiptFileInput')
      if (fileInput) fileInput.value = ''
      const { data: transfers } = await supabase
        .from('seller_transfers')
        .select('amount')
        .eq('seller_id', selectedSeller.id)
      const totalReceived = transfers?.reduce((s, t) => s + (t.amount || 0), 0) || 0
      setSellerFinance(prev => ({
        ...prev,
        totalReceived,
        remaining: prev.totalSales - prev.totalReturns - totalReceived
      }))
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'فشل إضافة التحويل')
    } finally {
      setUploading(false)
    }
  }

  const pendingProducts = products?.filter(p => !p.is_approved).length || 0
  const pendingSellersCount = pendingSellers?.length || 0
  const isLoading = (activeMainTab === 'dashboard' && statsLoading) ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && productsLoading)

  if (isLoading && activeMainTab === 'dashboard') {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>
  }

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || []
  const buyerUsers = users?.filter(u => u.account_type === 'buyer') || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <Button variant="secondary" onClick={refreshAllData} className="flex items-center gap-2">
          <RefreshCw size={16} /> تحديث الكل
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        <button onClick={() => setActiveMainTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeMainTab === 'dashboard' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><BarChart3 size={18} /> لوحة المعلومات</button>
        <button onClick={() => setActiveMainTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeMainTab === 'users' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Users size={18} /> المستخدمين</button>
        <button onClick={() => setActiveMainTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeMainTab === 'products' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Package size={18} /> المنتجات</button>
      </div>

      {activeMainTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailySales || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><TrendingUp className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">عمولة اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailyCommission || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><Package className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">منتظرة موافقة</p><p className="text-2xl font-bold">{pendingActions.products}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30"><Wallet className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">إيصالات معلقة</p><p className="text-2xl font-bold">{pendingActions.receipts}</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30 text-center">
              <Clock className="mx-auto text-gold mb-2" size={28} />
              <p className="text-text-secondary text-sm">طلبات بائعين معلقة</p>
              <p className="text-2xl font-bold">{pendingActions.sellers}</p>
              <button onClick={() => { setActiveMainTab('users'); setActiveSubTab('pending_sellers'); }} className="mt-2 text-gold text-sm underline">مراجعة</button>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30 text-center">
              <MessageCircle className="mx-auto text-gold mb-2" size={28} />
              <p className="text-text-secondary text-sm">المحادثات النشطة</p>
              <p className="text-2xl font-bold">{stats?.conversationsCount || 0}</p>
            </div>
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30 text-center">
              <CheckCircle className="mx-auto text-gold mb-2" size={28} />
              <p className="text-text-secondary text-sm">نسبة الإنجاز</p>
              <p className="text-2xl font-bold">{stats?.completionRate || 0}%</p>
            </div>
          </div>

          {topProducts.length > 0 && (
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30 mb-8">
              <h2 className="text-xl font-bold mb-4">⭐ أفضل المنتجات مبيعاً</h2>
              <div className="space-y-3">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-secondary-blue/30 rounded-xl">
                    <div><p className="font-bold">{p.name}</p><p className="text-xs text-text-secondary">الكمية المباعة: {p.total_quantity}</p></div>
                    <div className="text-gold">{formatCurrency(p.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentOrders.length > 0 && (
            <div className="bg-primary-card p-4 rounded-2xl border-gold/30 mb-8">
              <h2 className="text-xl font-bold mb-4">📋 أحدث الطلبات</h2>
              <div className="space-y-3">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-secondary-blue/30 rounded-xl">
                    <div><p className="font-bold">طلب #{order.id}</p><p className="text-xs">{order.buyer_name}</p></div>
                    <div className="text-right"><p className="text-gold">{formatCurrency(order.total_amount)}</p><p className="text-xs text-text-secondary">{order.status}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-primary-card p-4 rounded-2xl border-gold/30">
            <h2 className="text-xl font-bold mb-4"><LineChartIcon className="inline ml-2 text-gold" /> المبيعات الشهرية</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockMonthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#ddd" />
                <YAxis stroke="#ddd" />
                <Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} />
                <Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* قسم المستخدمين - نسخة مختصرة لكنها كاملة لمنع الأخطاء */}
      {activeMainTab === 'users' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab === 'sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>البائعين</button>
            <button onClick={() => setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab === 'buyers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>المشترين</button>
            <button onClick={() => setActiveSubTab('pending_sellers')} className={`px-4 py-2 ${activeSubTab === 'pending_sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>طلبات الانضمام {pendingSellersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellersCount}</span>}</button>
          </div>

          {activeSubTab === 'sellers' && (
            <div>
              <div className="mb-4">
                <label className="block text-gold mb-2">اختر البائع:</label>
                <Select value={selectedSeller?.id || ''} onChange={(e) => {
                  const seller = sellerUsers.find(u => u.id === e.target.value)
                  setSelectedSeller(seller)
                  setSellerDetailTab('profile')
                  setSellerFilterId(null)
                }} className="w-full md:w-1/2 bg-white text-gray-900 border-gold/30">
                  <option value="">-- اختر بائعاً --</option>
                  {sellerUsers.map(seller => <option key={seller.id} value={seller.id}>{seller.store_name || seller.full_name} ({seller.email})</option>)}
                </Select>
              </div>
              {selectedSeller && (
                <div className="bg-primary-card rounded-2xl border-gold/30 p-4">
                  <div className="flex gap-2 mb-4 border-b border-gold/30 pb-2">
                    <button onClick={() => setSellerDetailTab('profile')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'profile' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الملف الشخصي</button>
                    <button onClick={() => setSellerDetailTab('finance')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'finance' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المالية</button>
                    <button onClick={() => setSellerDetailTab('stats')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'stats' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المتابعة والتقييم</button>
                  </div>
                  {sellerDetailTab === 'profile' && (
                    <div>
                      <p><strong>الاسم:</strong> {selectedSeller.full_name}</p>
                      <p><strong>البريد:</strong> {selectedSeller.email}</p>
                      <p><strong>الهاتف:</strong> {selectedSeller.phone}</p>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => updateUserMutation.mutate({ userId: selectedSeller.id, updates: { is_banned: !selectedSeller.is_banned } })} className="bg-red-600 px-3 py-1 rounded text-white">حظر/إلغاء</button>
                        <button onClick={() => sendNotificationMutation.mutate({ userId: selectedSeller.id, title: 'إشعار', message: prompt('أدخل نص الإشعار:') || '' })} className="bg-purple-600 px-3 py-1 rounded text-white">إرسال إشعار</button>
                      </div>
                    </div>
                  )}
                  {sellerDetailTab === 'finance' && (
                    <div>
                      <p><strong>إجمالي المبيعات:</strong> {formatCurrency(sellerFinance.totalSales)}</p>
                      <p><strong>إجمالي المرتجعات:</strong> {formatCurrency(sellerFinance.totalReturns)}</p>
                      <p><strong>إجمالي الاستلامات:</strong> {formatCurrency(sellerFinance.totalReceived)}</p>
                      <p><strong>المبلغ المتبقي:</strong> {formatCurrency(sellerFinance.remaining)}</p>
                      <Button variant="secondary" onClick={loadSellerReceipts} className="mt-4">عرض الإيصالات</Button>
                    </div>
                  )}
                  {sellerDetailTab === 'stats' && (
                    <div>
                      <p><strong>إجمالي المنتجات:</strong> {sellerStats.totalProducts}</p>
                      <p><strong>المنتجات المباعة:</strong> {sellerStats.soldProducts}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeSubTab === 'buyers' && (
            <div>
              <Input placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-4" />
              <table className="w-full text-right border-collapse">
                <thead><tr><th>الاسم</th><th>البريد</th><th>الإنفاق</th><th>الإجراءات</th></tr></thead>
                <tbody>
                  {buyerUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td><td>{user.email}</td><td>{formatCurrency(user.total_spent)}</td>
                      <td><button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className="bg-red-600 text-white px-2 py-1 rounded text-xs">حظر</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeSubTab === 'pending_sellers' && (
            <div className="space-y-4">
              {pendingSellers?.map(s => (
                <div key={s.id} className="bg-primary-card p-4 rounded-2xl">
                  <p>{s.full_name} - {s.email}</p>
                  <button onClick={() => approveSellerMutation.mutate({ sellerId: s.id, approved: true })} className="bg-green-600 px-3 py-1 rounded text-white">قبول</button>
                  <button onClick={() => approveSellerMutation.mutate({ sellerId: s.id, approved: false })} className="bg-red-600 px-3 py-1 rounded text-white">رفض</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeMainTab === 'products' && (
        <div className="bg-primary-card p-4 rounded-2xl">
          <h3 className="text-xl font-bold mb-4">المنتجات</h3>
          <table className="w-full text-right">
            <thead><tr><th>الاسم</th><th>البائع</th><th>السعر</th><th>الحالة</th></tr></thead>
            <tbody>
              {products?.map(p => (
                <tr key={p.id}><td>{p.name}</td><td>{p.seller_name}</td><td>{formatCurrency(p.price)}</td><td>{p.is_approved ? 'موافق' : 'قيد المراجعة'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showReceiptsModal && (
        <Modal onClose={() => setShowReceiptsModal(false)} title="الإيصالات">
          <table className="w-full text-right">
            <thead><tr><th>المبلغ</th><th>التاريخ</th><th>الصورة</th></tr></thead>
            <tbody>
              {sellerReceiptsList.map(rec => (
                <tr key={rec.id}>
                  <td>{formatCurrency(rec.amount)}</td>
                  <td>{formatDate(rec.created_at)}</td>
                  <td><a href={rec.receipt_image} target="_blank" rel="noreferrer">عرض</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-left"><Button variant="secondary" onClick={() => setShowReceiptsModal(false)}>إغلاق</Button></div>
        </Modal>
      )}
    </div>
  )
}

