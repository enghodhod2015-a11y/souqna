import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminStats, getUsers, updateUser, getProductsForAdmin, approveProduct,
  getOrdersForAdmin, reviewReceipt, getAuditLogs, getPendingSellers,
  approveSeller, getSellerWallet, getWithdrawalRequests, processWithdrawal,
  getPlatformCommissions, getDisputes, resolveDispute, getCoupons, createCoupon,
  getBanners, updateBanner, getFeaturedProducts, toggleFeatured,
  getFlashSales, createFlashSale, getSettings, updateSettings,
  getRoles, updateRole, backupDatabase, exportReport
} from '../services/adminService'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../components/ui/Tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import {
  Users, Package, ShoppingBag, DollarSign, Receipt, CheckCircle, XCircle, Eye, Search,
  AlertTriangle, UserCheck, UserX, Clock, TrendingUp, Activity, RefreshCw,
  Wallet, Download, Plus, Ban, FileText, ClipboardList, Settings, Megaphone, MessageSquare,
  Award, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Edit, Loader, Trash2, Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar-EG')
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0)
}

// Mock data for charts
const mockMonthlySales = [
  { name: 'يناير', sales: 12500, commission: 1250 },
  { name: 'فبراير', sales: 15200, commission: 1520 },
  { name: 'مارس', sales: 18700, commission: 1870 },
  { name: 'أبريل', sales: 22300, commission: 2230 },
  { name: 'مايو', sales: 19800, commission: 1980 },
  { name: 'يونيو', sales: 24500, commission: 2450 },
]

const mockTopSellers = [
  { name: 'متجر الالكترونيات', sales: 34500, rating: 4.8 },
  { name: 'موضة الأزياء', sales: 28700, rating: 4.9 },
  { name: 'بيتي الجميل', sales: 19300, rating: 4.7 },
  { name: 'عطور الشرق', sales: 15600, rating: 4.6 },
  { name: 'أجهزة منزلية', sales: 12400, rating: 4.5 },
]

const mockTopCategories = [
  { name: 'الإلكترونيات', sales: 45200 },
  { name: 'الأزياء', sales: 38700 },
  { name: 'المنزل', sales: 29300 },
  { name: 'الجمال', sales: 18700 },
  { name: 'السيارات', sales: 12400 },
]

export default function AdminDashboardPage() {
  const [activeMainTab, setActiveMainTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [showReceiptsModal, setShowReceiptsModal] = useState(false)
  const [sellerReceipts, setSellerReceipts] = useState([])
  const [transferAmount, setTransferAmount] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [buyerActivityFilter, setBuyerActivityFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [productsView, setProductsView] = useState('details')
  const [sellerDetailTab, setSellerDetailTab] = useState('profile')
  const [buyerDetailTab, setBuyerDetailTab] = useState('profile')
  const [sellerStats, setSellerStats] = useState({
    totalProducts: 0,
    soldProducts: 0,
    shippingProducts: 0,
    notShippedWithReceipt: 0,
    noReceiptPurchased: 0,
    notPurchased: 0,
    duplicateProducts: 0,
    inappropriateProducts: 0,
    unansweredInquiries: 0,
    answeredInquiries: 0
  })
  const [sellerFilterId, setSellerFilterId] = useState(null)
  const [sellerFinance, setSellerFinance] = useState({ totalSales: 0, totalReceived: 0, remaining: 0 })
  const queryClient = useQueryClient()

  // جلب إحصائيات البائع المحدد
  useEffect(() => {
    if (!selectedSeller?.id) return
    const fetchSellerStats = async () => {
      try {
        const sellerId = selectedSeller.id
        const { count: totalProducts } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerId)

        const { data: soldData } = await supabase
          .from('order_items')
          .select('product_id')
          .eq('order.status', 'completed')
          .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const soldProducts = soldData?.length || 0

        const { data: shippingData } = await supabase
          .from('order_items')
          .select('product_id')
          .eq('order.status', 'shipped')
          .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const shippingProducts = shippingData?.length || 0

        const { data: notShippedData } = await supabase
          .from('order_items')
          .select('product_id')
          .eq('order.status', 'payment_approved')
          .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const notShippedWithReceipt = notShippedData?.length || 0

        const { data: noReceiptData } = await supabase
          .from('order_items')
          .select('product_id')
          .eq('order.status', 'pending_payment_review')
          .in('product_id', (await supabase.from('products').select('id').eq('seller_id', sellerId)).data?.map(p => p.id) || [])
        const noReceiptPurchased = noReceiptData?.length || 0

        const { data: allProducts } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', sellerId)
        const productIds = allProducts?.map(p => p.id) || []
        const { data: orderedProductIds } = await supabase
          .from('order_items')
          .select('product_id')
          .in('product_id', productIds)
        const orderedSet = new Set(orderedProductIds?.map(o => o.product_id))
        const notPurchased = productIds.filter(id => !orderedSet.has(id)).length

        setSellerStats({
          totalProducts: totalProducts || 0,
          soldProducts: soldProducts,
          shippingProducts: shippingProducts,
          notShippedWithReceipt: notShippedWithReceipt,
          noReceiptPurchased: noReceiptPurchased,
          notPurchased: notPurchased,
          duplicateProducts: 0,
          inappropriateProducts: 0,
          unansweredInquiries: 0,
          answeredInquiries: 0
        })
      } catch (err) {
        console.error('Error fetching seller stats:', err)
        toast.error('فشل تحميل إحصائيات البائع')
      }
    }
    fetchSellerStats()
  }, [selectedSeller])

  // جلب ملخص مالي للبائع المحدد
  useEffect(() => {
    if (!selectedSeller?.id) return
    const fetchFinanceSummary = async () => {
      try {
        // إجمالي المبيعات من الطلبات المكتملة
        const { data: sales } = await supabase
          .from('order_items')
          .select('unit_price, quantity')
          .eq('order.status', 'completed')
          .in('product_id', (await supabase.from('products').select('id').eq('seller_id', selectedSeller.id)).data?.map(p => p.id) || [])
        const totalSales = sales?.reduce((s, i) => s + (i.unit_price * i.quantity), 0) || 0

        // إجمالي المبالغ المحولة للبائع
        const { data: transfers } = await supabase
          .from('seller_transfers')
          .select('amount')
          .eq('seller_id', selectedSeller.id)
        const totalReceived = transfers?.reduce((s, t) => s + t.amount, 0) || 0

        setSellerFinance({ totalSales, totalReceived, remaining: totalSales - totalReceived })
      } catch (err) {
        console.error('خطأ في جلب الملخص المالي:', err)
      }
    }
    fetchFinanceSummary()
  }, [selectedSeller])

  // Queries
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
    queryKey: ['adminProducts', productFilter, sellerFilterId],
    queryFn: () => getProductsForAdmin({
      status: productFilter === 'pending' ? 'pending' : productFilter === 'hidden' ? 'hidden' : undefined,
      seller_id: sellerFilterId
    }),
    enabled: activeMainTab === 'products'
  })

  const { data: orders, refetch: refetchOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['adminOrders', dateRange, orderStatusFilter],
    queryFn: () => getOrdersForAdmin(dateRange, orderStatusFilter),
    enabled: activeMainTab === 'orders'
  })

  // دالة لتحديث جميع البيانات
  const refreshAllData = async () => {
    await Promise.all([
      refetchStats(),
      refetchUsers(),
      refetchPendingSellers(),
      refetchProducts(),
      refetchOrders()
    ])
    toast.success('تم تحديث جميع البيانات')
  }

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }) => updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث المستخدم')
    },
    onError: (err) => toast.error(err.message)
  })

  const approveProductMutation = useMutation({
    mutationFn: ({ productId, approve, is_hidden }) => approveProduct(productId, approve, is_hidden),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts'])
      queryClient.invalidateQueries(['adminStats'])
      toast.success('تم تحديث حالة المنتج')
    },
    onError: (err) => toast.error(err.message)
  })

  const approveSellerMutation = useMutation({
    mutationFn: ({ sellerId, approved, notes }) => approveSeller(sellerId, approved, notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingSellers'])
      queryClient.invalidateQueries(['adminUsers'])
      toast.success('تم تحديث حالة البائع')
    },
    onError: (err) => toast.error(err.message)
  })

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ userId, title, message }) => {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'info',
        title,
        message,
        is_read: false,
        created_at: new Date().toISOString()
      })
      if (error) throw error
    },
    onSuccess: () => toast.success('تم إرسال الإشعار'),
    onError: (err) => toast.error(err.message)
  })

  // ✅ استخدام جدول seller_transfers بدلاً من seller_wallets
  const addTransferMutation = useMutation({
    mutationFn: async ({ sellerId, amount, receiptImage, note }) => {
      const { error } = await supabase.from('seller_transfers').insert({
        seller_id: sellerId,
        amount: parseFloat(amount),
        receipt_image: receiptImage,
        note: note
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('تم تسجيل التحويل')
      setTransferAmount('')
      loadSellerReceipts(selectedSeller?.id)
    },
    onError: (err) => toast.error(err.message)
  })

  const loadSellerReceipts = async (sellerId) => {
    if (!sellerId) return
    const { data, error } = await supabase
      .from('seller_transfers')
      .select('*')
      .eq('seller_id', sellerId)
      .order('id', { ascending: false })
    if (error) console.error(error)
    else setSellerReceipts(data || [])
  }

  // Helper values
  const pendingProducts = products?.filter(p => !p.is_approved).length || 0
  const pendingSellersCount = pendingSellers?.length || 0
  const openDisputes = 0
  const pendingWithdrawals = 0
  const isLoading = (activeMainTab === 'dashboard' && statsLoading) ||
    (activeMainTab === 'users' && usersLoading) ||
    (activeMainTab === 'products' && productsLoading) ||
    (activeMainTab === 'orders' && ordersLoading)

  if (isLoading && activeMainTab === 'dashboard') {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-gold" size={40} /></div>
  }

  const sellerUsers = users?.filter(u => u.account_type === 'seller') || []
  const buyerUsers = users?.filter(u => u.account_type === 'buyer') || []

  const renderProductTable = (filterKey, productsList = products) => {
    if (!productsList || productsList.length === 0) {
      return <div className="text-center p-8 text-text-secondary">لا توجد منتجات</div>
    }

    let filtered = [...productsList]
    if (filterKey === 'sold') {
      filtered = productsList.filter(p => p.order_count > 0)
    } else if (filterKey === 'shipping') {
      filtered = productsList.filter(p => p.shipping_status === 'shipping')
    } else if (filterKey === 'not_shipped') {
      filtered = productsList.filter(p => p.payment_status === 'paid' && p.shipping_status !== 'shipped')
    } else if (filterKey === 'no_receipt') {
      filtered = productsList.filter(p => p.order_count > 0 && !p.receipt_uploaded)
    } else if (filterKey === 'not_purchased') {
      filtered = productsList.filter(p => p.order_count === 0)
    } else if (filterKey === 'duplicate') {
      filtered = []
    } else if (filterKey === 'inappropriate') {
      filtered = []
    }

    if (filtered.length === 0) {
      return <div className="text-center p-8 text-text-secondary">لا توجد منتجات في هذا القسم</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-gold/30 bg-primary-card/50">
              <th>اسم المنتج</th>
              <th>البائع</th>
              <th>السعر</th>
              <th>تاريخ النشر</th>
              <th>تاريخ الطلب</th>
              <th>تاريخ الشحن</th>
              <th>تاريخ الإيصال</th>
              <th>الحالة</th>
            <tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const sellerName = product.seller_name || product.seller?.full_name || 'غير معروف'
              const orderDate = product.last_order_date ? formatDate(product.last_order_date) : '-'
              const shipDate = product.shipped_date ? formatDate(product.shipped_date) : '-'
              const receiptDate = product.receipt_date ? formatDate(product.receipt_date) : '-'
              const status = product.status || (product.order_count > 0 ? 'تم الطلب' : 'متاح')
              return (
                <tr key={product.id} className="border-b border-gold/20 hover:bg-secondary-blue/30">
                  <td className="p-2">{product.name}</td>
                  <td className="p-2">{sellerName}</td>
                  <td className="p-2">{formatCurrency(product.price)}</td>
                  <td className="p-2">{formatDate(product.created_at)}</td>
                  <td className="p-2">{orderDate}</td>
                  <td className="p-2">{shipDate}</td>
                  <td className="p-2">{receiptDate}</td>
                  <td className="p-2">{status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const toggleAccountType = (user) => {
    const newType = user.account_type === 'seller' ? 'buyer' : 'seller'
    updateUserMutation.mutate({
      userId: user.id,
      updates: { account_type: newType }
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">لوحة تحكم الأدمن</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={refreshAllData} className="flex items-center gap-2">
            <RefreshCw size={16} /> تحديث الكل
          </Button>
        </div>
      </div>

      {/* Tabs الرئيسية */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
        <button onClick={() => setActiveMainTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'dashboard' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><BarChart3 size={18} /> لوحة المعلومات</button>
        <button onClick={() => setActiveMainTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'users' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Users size={18} /> المستخدمين</button>
        <button onClick={() => setActiveMainTab('products')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'products' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Package size={18} /> المنتجات</button>
        <button onClick={() => setActiveMainTab('orders')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'orders' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ShoppingBag size={18} /> الطلبات</button>
        <button onClick={() => setActiveMainTab('finance')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'finance' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><DollarSign size={18} /> المالية</button>
        <button onClick={() => setActiveMainTab('marketing')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'marketing' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Megaphone size={18} /> التسويق</button>
        <button onClick={() => setActiveMainTab('support')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'support' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><MessageSquare size={18} /> الدعم</button>
        <button onClick={() => setActiveMainTab('logs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'logs' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><ClipboardList size={18} /> السجلات</button>
        <button onClick={() => setActiveMainTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeMainTab === 'settings' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}><Settings size={18} /> الإعدادات</button>
      </div>

      {/* Dashboard Tab (مختصر) */}
      {activeMainTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><DollarSign className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">مبيعات اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailySales || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><TrendingUp className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">عمولة اليوم</p><p className="text-2xl font-bold">{formatCurrency(stats?.dailyCommission || 0)}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><ShoppingBag className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">طلبات جديدة</p><p className="text-2xl font-bold">{stats?.newOrders || 0}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Package className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">منتظرة موافقة</p><p className="text-2xl font-bold">{pendingProducts}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><AlertTriangle className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">نزاعات مفتوحة</p><p className="text-2xl font-bold">{openDisputes}</p></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><Wallet className="text-gold mb-2" size={32} /><p className="text-text-secondary text-sm">سحوبات معلقة</p><p className="text-2xl font-bold">{pendingWithdrawals}</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LineChartIcon size={20} className="text-gold" /> المبيعات الشهرية</h2><ResponsiveContainer width="100%" height={300}><LineChart data={mockMonthlySales}><CartesianGrid strokeDasharray="3 3" stroke="#333" /><XAxis dataKey="name" stroke="#ddd" /><YAxis stroke="#ddd" tickFormatter={value => `${value / 1000}k`} /><Tooltip contentStyle={{ backgroundColor: '#06264D', borderColor: '#D4AF37' }} formatter={value => formatCurrency(value)} /><Line type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37' }} /><Line type="monotone" dataKey="commission" stroke="#60A5FA" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30"><h2 className="text-xl font-bold mb-4 flex items-center gap-2"><PieChartIcon size={20} className="text-gold" /> أفضل الفئات مبيعاً</h2><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={mockTopCategories} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{mockTopCategories.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 55%)`} />)}</Pie><Tooltip formatter={value => formatCurrency(value)} /></PieChart></ResponsiveContainer></div>
          </div>
        </div>
      )}

      {/* ========== المستخدمين ========== */}
      {activeMainTab === 'users' && (
        <div>
          <div className="flex border-b border-gold/30 mb-4">
            <button onClick={() => setActiveSubTab('sellers')} className={`px-4 py-2 ${activeSubTab === 'sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>البائعين</button>
            <button onClick={() => setActiveSubTab('buyers')} className={`px-4 py-2 ${activeSubTab === 'buyers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>المشترين</button>
            <button onClick={() => setActiveSubTab('pending_sellers')} className={`px-4 py-2 ${activeSubTab === 'pending_sellers' ? 'border-b-2 border-gold text-gold' : 'text-text-secondary'}`}>طلبات الانضمام {pendingSellersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingSellersCount}</span>}</button>
          </div>

          {/* البائعين */}
          {activeSubTab === 'sellers' && (
            <div>
              <div className="mb-4">
                <label className="block text-gold mb-2">اختر البائع:</label>
                <Select value={selectedSeller?.id || ''} onChange={(e) => { const seller = sellerUsers.find(u => u.id === e.target.value); setSelectedSeller(seller); loadSellerReceipts(seller?.id); setSellerDetailTab('profile'); setSellerFilterId(null); }} className="w-full md:w-1/2 bg-white text-gray-900 border border-gold/30 rounded-lg focus:outline-none focus:border-gold">
                  <option value="">-- اختر بائعاً --</option>
                  {sellerUsers.map(seller => <option key={seller.id} value={seller.id}>{seller.store_name || seller.full_name} ({seller.email})</option>)}
                </Select>
              </div>

              {selectedSeller && (
                <div className="bg-primary-card rounded-2xl border border-gold/30 p-4 mt-4">
                  <div className="flex gap-2 mb-4 border-b border-gold/30 pb-2">
                    <button onClick={() => setSellerDetailTab('profile')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'profile' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الملف الشخصي</button>
                    <button onClick={() => setSellerDetailTab('finance')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'finance' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المالية</button>
                    <button onClick={() => setSellerDetailTab('stats')} className={`px-4 py-2 rounded-lg ${sellerDetailTab === 'stats' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المتابعة والتقييم</button>
                  </div>

                  {sellerDetailTab === 'profile' && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right">
                          <tbody>
                            <tr><td className="p-2 font-bold text-gold">الاسم</td><td>{selectedSeller.full_name || '-'}</td><td className="p-2 font-bold text-gold">البريد</td><td>{selectedSeller.email}</td></tr>
                            <tr><td className="p-2 font-bold text-gold">نوع الحساب</td><td>{selectedSeller.account_type === 'seller' ? 'بائع' : (selectedSeller.account_type === 'buyer' ? 'مشتري' : 'أدمن')}</td><td className="p-2 font-bold text-gold">الحالة</td><td>{selectedSeller.is_banned ? 'محظور' : 'نشط'}</td></tr>
                            <tr><td className="p-2 font-bold text-gold">تاريخ التسجيل</td><td>{formatDate(selectedSeller.created_at)}</td><td className="p-2 font-bold text-gold">رقم الحساب البنكي</td><td>{selectedSeller.bank_account || '-'}</td></tr>
                            <tr><td className="p-2 font-bold text-gold">نوع الحساب البنكي</td><td>{selectedSeller.bank_type || '-'}</td><td className="p-2 font-bold text-gold">التواصل (الهاتف)</td><td>{selectedSeller.phone || '-'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button onClick={() => updateUserMutation.mutate({ userId: selectedSeller.id, updates: { is_banned: !selectedSeller.is_banned } })} className={`px-3 py-1 rounded text-white ${selectedSeller.is_banned ? 'bg-green-600' : 'bg-red-600'}`}>{selectedSeller.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                        <button onClick={() => window.open(`/store/${selectedSeller.id}`, '_blank')} className="bg-blue-600 px-3 py-1 rounded text-white">عرض المتجر</button>
                        <button onClick={() => toggleAccountType(selectedSeller)} className="bg-gold text-primary-blue px-3 py-1 rounded">تغيير نوع الحساب</button>
                        <button onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationMutation.mutate({ userId: selectedSeller.id, title: 'إشعار من الإدارة', message: msg }); }} className="bg-purple-600 px-3 py-1 rounded text-white flex items-center gap-1"><Send size={14} /> إرسال إشعار</button>
                      </div>
                    </>
                  )}

                  {sellerDetailTab === 'finance' && (
                    <>
                      <div className="bg-secondary-blue/30 p-4 rounded-xl mb-4">
                        <label className="block text-gold mb-2">إضافة إيصال تحويل (المبلغ المرسل للبائع)</label>
                        <div className="flex flex-wrap gap-2">
                          <input type="number" placeholder="المبلغ" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="bg-white rounded-lg px-3 py-2 text-gray-900 flex-1" />
                          <input type="file" accept="image/*" id="receiptImage" className="hidden" />
                          <Button onClick={() => { const fileInput = document.getElementById('receiptImage'); fileInput?.click(); }}>رفع صورة الإيصال</Button>
                          <Button onClick={() => { if (transferAmount) addTransferMutation.mutate({ sellerId: selectedSeller.id, amount: transferAmount, receiptImage: '', note: '' }); else toast.error('أدخل المبلغ') }}>إدخال</Button>
                          <Button variant="secondary" onClick={() => { loadSellerReceipts(selectedSeller.id); setShowReceiptsModal(true); }}>عرض جميع الإيصالات</Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto mt-4">
                        <table className="w-full text-right border-collapse">
                          <thead><tr className="border-b border-gold/30"><th>القسم</th><th>التفاصيل</th></tr></thead>
                          <tbody>
                            <tr><td className="p-2 font-bold">إجمالي المبيعات</td><td>{formatCurrency(sellerFinance.totalSales)}</td></tr>
                            <tr><td className="p-2 font-bold">إجمالي المرتجعات</td><td>{formatCurrency(0)}</td></tr>
                            <tr><td className="p-2 font-bold">إجمالي الاستلامات (تحويلات للموقع)</td><td>{formatCurrency(sellerFinance.totalReceived)}</td></tr>
                            <tr><td className="p-2 font-bold">المبلغ المتبقي (دائن)</td><td>{formatCurrency(sellerFinance.remaining)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {sellerDetailTab === 'stats' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead><tr className="border-b border-gold/30"><th>القسم</th><th>التفاصيل</th><th>طلب البيانات</th></tr></thead>
                        <tbody>
                          <tr><td className="p-2">جميع المنتجات المنشورة</td><td>{sellerStats.totalProducts}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('all'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات المباعة</td><td>{sellerStats.soldProducts}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('sold'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات قيد الشحن</td><td>{sellerStats.shippingProducts}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('shipping'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات التي لم تشحن (تم رفع الإيصال)</td><td>{sellerStats.notShippedWithReceipt}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('not_shipped'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات المشتراة بدون إيصال</td><td>{sellerStats.noReceiptPurchased}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('no_receipt'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات غير المشتراة</td><td>{sellerStats.notPurchased}</td><td><button className="text-gold underline" onClick={() => { setActiveMainTab('products'); setProductsView('not_purchased'); setSellerFilterId(selectedSeller.id); }}>عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات المكررة</td><td>{sellerStats.duplicateProducts}</td><td><button className="text-gold underline">عرض</button></td></tr>
                          <tr><td className="p-2">المنتجات غير اللائقة</td><td>{sellerStats.inappropriateProducts}</td><td><button className="text-gold underline">عرض</button></td></tr>
                          <tr><td className="p-2">الاستفسارات التي لم يرد عليها</td><td>{sellerStats.unansweredInquiries}</td><td><button className="text-gold underline">عرض</button></td></tr>
                          <tr><td className="p-2">الاستفسارات التي تم الرد عليها</td><td>{sellerStats.answeredInquiries}</td><td><button className="text-gold underline">عرض</button></td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {showReceiptsModal && (
                <Modal onClose={() => setShowReceiptsModal(false)} title="إيصالات التحويل للبائع">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead><tr><th>رقم العملية</th><th>تاريخ الإرسال</th><th>المبلغ</th><th>صورة الإيصال</th><th>ملاحظة</th></tr></thead>
                      <tbody>
                        {sellerReceipts.length === 0 ? <tr><td colSpan="5" className="text-center p-4">لا توجد إيصالات</td></tr> :
                          sellerReceipts.map(rec => (
                            <tr key={rec.id}><td>{rec.id}</td><td>{formatDate(rec.created_at)}</td><td>{formatCurrency(rec.amount)}</td><td>{rec.receipt_image ? <a href={rec.receipt_image} target="_blank" className="text-gold">عرض</a> : '-'}</td><td>{rec.note || '-'}</td></tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* المشترين (مختصر) */}
          {activeSubTab === 'buyers' && (
            <div>
              <div className="flex gap-4 mb-4">
                <Input placeholder="بحث بالبريد أو الاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-white text-gray-900 border border-gold/30 rounded-lg" />
                <Select value={buyerActivityFilter} onChange={e => setBuyerActivityFilter(e.target.value)} className="w-48 bg-white text-gray-900">
                  <option value="all">جميع المشترين</option><option value="active">نشط آخر 30 يوم</option><option value="inactive">غير نشط &gt; 90 يوم</option>
                </Select>
                <Button variant="secondary" onClick={() => refetchUsers()}><Search size={16} /> بحث</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr className="border-b border-gold/30 bg-primary-card/50"><th>الاسم</th><th>البريد</th><th>عدد الطلبات</th><th>إجمالي الإنفاق</th><th>آخر طلب</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
                  <tbody>
                    {buyerUsers.map(user => (
                      <tr key={user.id}>
                        <td className="p-2">{user.full_name}</td>
                        <td className="p-2">{user.email}</td>
                        <td className="p-2">{user.order_count || 0}</td>
                        <td className="p-2">{formatCurrency(user.total_spent || 0)}</td>
                        <td className="p-2">{formatDate(user.last_order_date)}</td>
                        <td className="p-2">{user.is_banned ? 'محظور' : 'نشط'}</td>
                        <td className="flex gap-2">
                          <button onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { is_banned: !user.is_banned } })} className={`px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-green-600' : 'bg-red-600'}`}>{user.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                          <button onClick={() => { setSelectedBuyer(user); setBuyerDetailTab('profile'); }} className="bg-gold text-primary-blue px-2 py-1 rounded text-xs">تفاصيل</button>
                          <button onClick={() => { const msg = prompt('أدخل نص الإشعار:'); if (msg) sendNotificationMutation.mutate({ userId: user.id, title: 'إشعار من الإدارة', message: msg }); }} className="bg-purple-600 px-2 py-1 rounded text-xs"><Send size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedBuyer && (
                <div className="mt-6 bg-primary-card rounded-2xl border border-gold/30 p-4">
                  <div className="flex gap-2 mb-4 border-b border-gold/30 pb-2">
                    <button onClick={() => setBuyerDetailTab('profile')} className={`px-4 py-2 rounded-lg ${buyerDetailTab === 'profile' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الملف الشخصي</button>
                    <button onClick={() => setBuyerDetailTab('orders')} className={`px-4 py-2 rounded-lg ${buyerDetailTab === 'orders' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الطلبات</button>
                    <button onClick={() => setBuyerDetailTab('stats')} className={`px-4 py-2 rounded-lg ${buyerDetailTab === 'stats' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>الإحصائيات</button>
                  </div>

                  {buyerDetailTab === 'profile' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-gold">الاسم:</label><p>{selectedBuyer.full_name}</p></div>
                        <div><label className="text-gold">البريد:</label><p>{selectedBuyer.email}</p></div>
                        <div><label className="text-gold">عدد الطلبات الكلي:</label><p>{selectedBuyer.order_count || 0}</p></div>
                        <div><label className="text-gold">إجمالي الإنفاق:</label><p>{formatCurrency(selectedBuyer.total_spent || 0)}</p></div>
                        <div><label className="text-gold">آخر طلب:</label><p>{formatDate(selectedBuyer.last_order_date)}</p></div>
                        <div><label className="text-gold">العناوين المحفوظة:</label><p>{selectedBuyer.addresses || '-'}</p></div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => updateUserMutation.mutate({ userId: selectedBuyer.id, updates: { is_banned: !selectedBuyer.is_banned } })} className={`px-3 py-1 rounded text-white ${selectedBuyer.is_banned ? 'bg-green-600' : 'bg-red-600'}`}>{selectedBuyer.is_banned ? 'إلغاء الحظر' : 'حظر'}</button>
                        <button onClick={() => toggleAccountType(selectedBuyer)} className="bg-gold text-primary-blue px-3 py-1 rounded">تغيير إلى {selectedBuyer.account_type === 'buyer' ? 'بائع' : 'مشتري'}</button>
                      </div>
                    </>
                  )}

                  {buyerDetailTab === 'orders' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                        <tbody><tr><td colSpan="4" className="text-center p-4">لا توجد طلبات حالياً</td></tr></tbody>
                      </table>
                    </div>
                  )}

                  {buyerDetailTab === 'stats' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-secondary-blue/30 p-3 rounded-lg"><p className="text-text-secondary">إجمالي الطلبات</p><p className="text-2xl font-bold text-gold">{selectedBuyer.order_count || 0}</p></div>
                      <div className="bg-secondary-blue/30 p-3 rounded-lg"><p className="text-text-secondary">إجمالي المشتريات</p><p className="text-2xl font-bold text-gold">{formatCurrency(selectedBuyer.total_spent || 0)}</p></div>
                      <div className="bg-secondary-blue/30 p-3 rounded-lg"><p className="text-text-secondary">متوسط قيمة الطلب</p><p className="text-2xl font-bold text-gold">{formatCurrency((selectedBuyer.total_spent || 0) / (selectedBuyer.order_count || 1))}</p></div>
                      <div className="bg-secondary-blue/30 p-3 rounded-lg"><p className="text-text-secondary">آخر طلب</p><p className="text-2xl font-bold text-gold">{formatDate(selectedBuyer.last_order_date)}</p></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* طلبات الانضمام */}
          {activeSubTab === 'pending_sellers' && (
            <div className="space-y-4">
              {pendingSellers?.map(s => (
                <div key={s.id} className="bg-primary-card p-4 rounded-2xl border border-gold/30">
                  <div><h3 className="font-bold">{s.full_name}</h3><p>{s.email} | {s.phone}</p><p>طلب انضمام: {formatDate(s.created_at)}</p></div>
                  <div className="flex gap-2 mt-2"><button onClick={() => approveSellerMutation.mutate({ sellerId: s.id, approved: true })} className="bg-green-600 px-4 py-2 rounded">قبول</button><button onClick={() => { const notes = prompt('سبب الرفض:'); if (notes) approveSellerMutation.mutate({ sellerId: s.id, approved: false, notes }); }} className="bg-red-600 px-4 py-2 rounded">رفض</button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== المنتجات ========== */}
      {activeMainTab === 'products' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gold/30 pb-2">
            <button onClick={() => setProductsView('details')} className={`px-4 py-2 rounded-lg ${productsView === 'details' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>تفاصيل المنتجات</button>
            <button onClick={() => setProductsView('all')} className={`px-4 py-2 rounded-lg ${productsView === 'all' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>جميع المنتجات</button>
            <button onClick={() => setProductsView('sold')} className={`px-4 py-2 rounded-lg ${productsView === 'sold' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات المباعة</button>
            <button onClick={() => setProductsView('shipping')} className={`px-4 py-2 rounded-lg ${productsView === 'shipping' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات قيد الشحن</button>
            <button onClick={() => setProductsView('not_shipped')} className={`px-4 py-2 rounded-lg ${productsView === 'not_shipped' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات التي لم تشحن (تم رفع الإيصال)</button>
            <button onClick={() => setProductsView('no_receipt')} className={`px-4 py-2 rounded-lg ${productsView === 'no_receipt' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات المشتراة بدون إيصال</button>
            <button onClick={() => setProductsView('not_purchased')} className={`px-4 py-2 rounded-lg ${productsView === 'not_purchased' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات غير المشتراة</button>
            <button onClick={() => setProductsView('duplicate')} className={`px-4 py-2 rounded-lg ${productsView === 'duplicate' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات المكررة</button>
            <button onClick={() => setProductsView('inappropriate')} className={`px-4 py-2 rounded-lg ${productsView === 'inappropriate' ? 'bg-gold text-primary-blue' : 'hover:bg-secondary-blue'}`}>المنتجات غير اللائقة</button>
          </div>

          {productsView === 'details' && (
            <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
              <h3 className="text-xl font-bold mb-4 text-gold">تفاصيل المنتجات</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead><tr><th className="p-3">القسم</th><th className="p-3">التفاصيل</th></tr></thead>
                  <tbody>
                    <tr><td className="p-3 font-bold">جميع المنتجات</td><td className="p-3">{products?.length || 0}</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات المباعة</td><td className="p-3">45</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات قيد الشحن</td><td className="p-3">12</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات التي لم تشحن (تم رفع الإيصال)</td><td className="p-3">8</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات المشتراة بدون إيصال</td><td className="p-3">23</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات غير المشتراة</td><td className="p-3">157</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات المكررة</td><td className="p-3">6</td></tr>
                    <tr><td className="p-3 font-bold">المنتجات غير اللائقة</td><td className="p-3">3</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {productsView !== 'details' && renderProductTable(productsView, products)}
        </div>
      )}

      {/* باقي الأقسام تحت التطوير */}
      {(activeMainTab === 'orders' || activeMainTab === 'finance' || activeMainTab === 'marketing' || activeMainTab === 'support' || activeMainTab === 'logs' || activeMainTab === 'settings') && (
        <div className="text-center py-20 text-text-secondary">يتم تطوير هذا القسم ...</div>
      )}
    </div>
  )
}

